"""Ranking Service — orchestrates the full ML ranking pipeline."""
from typing import Dict
from bson import ObjectId
from app.database import applications_collection, students_collection
from app.ml.resume_parser import parse_resume
from app.ml.bm25_scorer import bm25_scorer
from app.ml.ann_search import ann_search
from app.ml.lambdamart import lambdamart_ranker


async def run_ranking_pipeline(job_id: str, job: dict) -> Dict:
    """
    Full ranking pipeline for a job:
    1. Parse resumes → extract skills
    2. BM25 keyword scoring
    3. ANN semantic similarity
    4. LambdaMART final ranking
    5. Store scores back to applications
    """
    # Fetch all applications for this job
    cursor = applications_collection.find({"job_id": job_id})
    applications = []
    async for doc in cursor:
        applications.append(doc)

    if not applications:
        return {"ranked_count": 0}

    # Build job description query
    job_query = f"{job.get('title', '')} {job.get('description', '')} {' '.join(job.get('required_skills', []))}"

    # ── Step 1: Parse resumes ────────────────────────────────────────────
    for app in applications:
        resume_text = app.get("resume_text", "")
        if not resume_text:
            # Try to get from student profile
            student = await students_collection.find_one({"student_id": app["student_id"]})
            if student and student.get("resume_text"):
                resume_text = student["resume_text"]
                await applications_collection.update_one(
                    {"_id": app["_id"]}, {"$set": {"resume_text": resume_text}}
                )

        parsed = parse_resume(resume_text)
        app["parsed_skills"] = parsed["skills"]
        app["parsed_experience"] = parsed["experience"]
        app["parsed_education"] = parsed["education"]

        await applications_collection.update_one(
            {"_id": app["_id"]},
            {"$set": {
                "parsed_skills": parsed["skills"],
                "parsed_experience": parsed["experience"],
                "parsed_education": parsed["education"],
            }},
        )

    # ── Step 2: BM25 scoring ─────────────────────────────────────────────
    bm25_docs = [
        {"id": str(app["_id"]), "text": app.get("resume_text", "")}
        for app in applications
    ]
    bm25_results = bm25_scorer.score_batch(job_query, bm25_docs)
    bm25_map = {r["id"]: r["score"] for r in bm25_results}

    # Normalize BM25 scores to [0, 1]
    max_bm25 = max((r["score"] for r in bm25_results), default=1) or 1
    for app in applications:
        raw = bm25_map.get(str(app["_id"]), 0)
        app["bm25_score"] = round(raw / max_bm25, 4)

    # ── Step 3: ANN semantic scoring ─────────────────────────────────────
    ann_docs = [
        {"id": str(app["_id"]), "text": app.get("resume_text", "")}
        for app in applications
    ]
    ann_results = ann_search.batch_score(job_query, ann_docs)
    ann_map = {r["id"]: r["score"] for r in ann_results}

    for app in applications:
        app["semantic_score"] = ann_map.get(str(app["_id"]), 0)

    # ── Step 4: LambdaMART ranking ───────────────────────────────────────
    # Enrich candidates with student data
    for app in applications:
        student = await students_collection.find_one({"student_id": app["student_id"]})
        if student:
            app["cgpa"] = student.get("cgpa", 0)

    ranked = lambdamart_ranker.rank_candidates(applications, job)

    # ── Step 5: Save scores ──────────────────────────────────────────────
    for candidate in ranked:
        await applications_collection.update_one(
            {"_id": candidate["_id"]},
            {"$set": {
                "bm25_score": candidate.get("bm25_score", 0),
                "semantic_score": candidate.get("semantic_score", 0),
                "rank_score": candidate.get("rank_score", 0),
                "rank_explanation": candidate.get("rank_explanation"),
                "parsed_skills": candidate.get("parsed_skills", []),
            }},
        )

    top_score = ranked[0]["rank_score"] if ranked else 0
    return {"ranked_count": len(ranked), "top_score": top_score}
