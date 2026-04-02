"""Shortlist API routes — AI ranking trigger + greedy/ILP optimization."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from datetime import datetime, timezone
from app.models.application import ShortlistRequest, ApplicationResponse, ApplicationStatus
from app.middleware.auth_middleware import get_current_user
from app.database import applications_collection, jobs_collection, students_collection
from app.services.ranking_service import run_ranking_pipeline
from app.ml.optimizer import greedy_shortlist, ilp_shortlist

router = APIRouter(prefix="/jobs/{job_id}", tags=["Shortlisting"])


@router.post("/rank")
async def trigger_ranking(job_id: str, current_user: dict = Depends(get_current_user)):
    """Trigger the full AI ranking pipeline for all applicants of a job."""
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Job not found")

    result = await run_ranking_pipeline(job_id, job)
    return {
        "message": "Ranking completed",
        "candidates_ranked": result["ranked_count"],
        "top_score": result.get("top_score", 0),
    }


@router.post("/shortlist")
async def run_shortlist(
    job_id: str,
    req: ShortlistRequest,
    current_user: dict = Depends(get_current_user),
):
    """Run shortlisting optimization — greedy or ILP."""
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Job not found")

    max_candidates = req.max_candidates or job.get("positions", 5)

    # Fetch all ranked applications
    cursor = applications_collection.find({
        "job_id": job_id,
        "rank_score": {"$gt": req.min_score},
    }).sort("rank_score", -1)

    candidates = []
    async for doc in cursor:
        student = await students_collection.find_one({"student_id": doc["student_id"]})
        candidates.append({
            "app_id": str(doc["_id"]),
            "student_id": doc["student_id"],
            "rank_score": doc.get("rank_score", 0),
            "branch": student.get("branch", "") if student else "",
            "skills": doc.get("parsed_skills", []),
        })

    if not candidates:
        return {"message": "No candidates above minimum score", "shortlisted": []}

    # Run optimization
    if req.method == "ilp":
        selected = ilp_shortlist(candidates, max_candidates, req.branch_diversity)
    else:
        selected = greedy_shortlist(candidates, max_candidates)

    # Update statuses
    selected_ids = [c["app_id"] for c in selected]
    now = datetime.now(timezone.utc)
    for app_id in selected_ids:
        await applications_collection.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": {"status": ApplicationStatus.SHORTLISTED.value, "updated_at": now}},
        )

    return {
        "message": f"Shortlisted {len(selected)} candidates via {req.method}",
        "shortlisted": selected,
    }


@router.get("/shortlist")
async def get_shortlisted(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get all shortlisted candidates for a job."""
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Job not found")

    cursor = applications_collection.find({
        "job_id": job_id,
        "status": {"$in": [
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.INTERVIEWED.value,
            ApplicationStatus.SELECTED.value,
        ]},
    }).sort("rank_score", -1)

    results = []
    async for doc in cursor:
        student = await students_collection.find_one({"student_id": doc["student_id"]})
        results.append({
            "application_id": str(doc["_id"]),
            "student_id": doc["student_id"],
            "student_name": student.get("name") if student else "Unknown",
            "rank_score": doc.get("rank_score", 0),
            "status": doc["status"],
            "rank_explanation": doc.get("rank_explanation"),
        })
    return {"shortlisted": results, "count": len(results)}
