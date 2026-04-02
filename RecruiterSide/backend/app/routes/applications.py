"""Application & Ranking API routes."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from app.models.application import (
    ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate,
    RankingFeedback, ApplicationStatus,
)
from app.middleware.auth_middleware import get_current_user
from app.database import (
    applications_collection, jobs_collection, students_collection,
    feedback_collection,
)

router = APIRouter(prefix="/jobs/{job_id}/applications", tags=["Applications"])


async def _enrich_application(doc: dict) -> ApplicationResponse:
    """Attach student info to application response."""
    student = await students_collection.find_one({"student_id": doc["student_id"]})
    return ApplicationResponse(
        id=str(doc["_id"]),
        job_id=doc["job_id"],
        student_id=doc["student_id"],
        student_name=student.get("name") if student else None,
        student_email=student.get("email") if student else None,
        student_cgpa=student.get("cgpa") if student else None,
        student_branch=student.get("branch") if student else None,
        parsed_skills=doc.get("parsed_skills", []),
        bm25_score=doc.get("bm25_score", 0),
        semantic_score=doc.get("semantic_score", 0),
        rank_score=doc.get("rank_score", 0),
        rank_explanation=doc.get("rank_explanation"),
        status=doc.get("status", "applied"),
        applied_at=doc.get("applied_at", doc.get("created_at", datetime.now(timezone.utc))),
    )


@router.get("", response_model=List[ApplicationResponse])
async def list_applications(
    job_id: str,
    status: Optional[str] = None,
    min_cgpa: Optional[float] = None,
    skills: Optional[str] = None,
    sort_by: str = Query("rank_score", pattern="^(rank_score|bm25_score|semantic_score|applied_at)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """List applications for a job with filtering & sorting."""
    # verify job belongs to recruiter
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Job not found")

    query = {"job_id": job_id}
    if status:
        query["status"] = status

    cursor = applications_collection.find(query).sort(sort_by, -1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        app_resp = await _enrich_application(doc)
        # client-side filters (CGPA, skills) for small result sets
        if min_cgpa and app_resp.student_cgpa and app_resp.student_cgpa < min_cgpa:
            continue
        if skills:
            required = {s.strip().lower() for s in skills.split(",")}
            candidate_skills = {s.lower() for s in app_resp.parsed_skills}
            if not required.intersection(candidate_skills):
                continue
        results.append(app_resp)
    return results


@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_application(
    job_id: str,
    data: ApplicationCreate,
    current_user: dict = Depends(get_current_user),
):
    """Submit a new application (used by student module integration / testing)."""
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await applications_collection.find_one({
        "job_id": job_id, "student_id": data.student_id
    })
    if existing:
        raise HTTPException(status_code=409, detail="Already applied")

    now = datetime.now(timezone.utc)
    doc = {
        "job_id": job_id,
        "student_id": data.student_id,
        "resume_text": data.resume_text,
        "parsed_skills": [],
        "parsed_experience": [],
        "parsed_education": [],
        "bm25_score": 0.0,
        "semantic_score": 0.0,
        "rank_score": 0.0,
        "rank_explanation": None,
        "status": ApplicationStatus.APPLIED.value,
        "applied_at": now,
        "updated_at": now,
    }
    result = await applications_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # increment application count on job
    await jobs_collection.update_one(
        {"_id": ObjectId(job_id)}, {"$inc": {"application_count": 1}}
    )
    return await _enrich_application(doc)


@router.put("/{app_id}/status", response_model=ApplicationResponse)
async def update_status(
    job_id: str,
    app_id: str,
    data: ApplicationStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update application status (shortlisted, rejected, etc.)."""
    doc = await applications_collection.find_one({"_id": ObjectId(app_id), "job_id": job_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    await applications_collection.update_one(
        {"_id": ObjectId(app_id)},
        {"$set": {"status": data.status.value, "updated_at": datetime.now(timezone.utc)}},
    )
    updated = await applications_collection.find_one({"_id": ObjectId(app_id)})
    return await _enrich_application(updated)


# ── Ranking feedback (ML feedback loop) ──────────────────────────────────────
feedback_router = APIRouter(prefix="/feedback", tags=["ML Feedback"])


@feedback_router.post("", status_code=201)
async def submit_feedback(
    data: RankingFeedback,
    current_user: dict = Depends(get_current_user),
):
    """Store recruiter feedback on ranking for model retraining."""
    doc = {
        "application_id": data.application_id,
        "job_id": data.job_id,
        "recruiter_id": current_user["_id"],
        "recruiter_action": data.recruiter_action,
        "recruiter_score": data.recruiter_score,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc),
    }
    await feedback_collection.insert_one(doc)
    return {"message": "Feedback recorded"}
