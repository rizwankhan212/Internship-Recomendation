"""Interview scheduling API routes."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from app.models.interview import (
    InterviewCreate, InterviewUpdate, InterviewResponse,
    InterviewStatus, InterviewMode,
)
from app.models.application import ApplicationStatus
from app.middleware.auth_middleware import get_current_user
from app.database import (
    interviews_collection, applications_collection,
    jobs_collection, students_collection,
)

router = APIRouter(prefix="/interviews", tags=["Interviews"])


async def _enrich_interview(doc: dict) -> InterviewResponse:
    app_doc = await applications_collection.find_one({"_id": ObjectId(doc["application_id"])})
    student = None
    job_title = None
    if app_doc:
        student = await students_collection.find_one({"student_id": app_doc["student_id"]})
        job = await jobs_collection.find_one({"_id": ObjectId(app_doc["job_id"])})
        job_title = job.get("title") if job else None

    return InterviewResponse(
        id=str(doc["_id"]),
        application_id=doc["application_id"],
        job_id=doc["job_id"],
        student_id=app_doc["student_id"] if app_doc else None,
        student_name=student.get("name") if student else None,
        job_title=job_title,
        scheduled_at=doc["scheduled_at"],
        duration_minutes=doc.get("duration_minutes", 30),
        mode=doc.get("mode", "online"),
        meeting_link=doc.get("meeting_link"),
        location=doc.get("location"),
        status=doc.get("status", "scheduled"),
        feedback=doc.get("feedback"),
        rating=doc.get("rating"),
        notes=doc.get("notes"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
    )


@router.post("", response_model=InterviewResponse, status_code=201)
async def schedule_interview(
    data: InterviewCreate,
    current_user: dict = Depends(get_current_user),
):
    """Schedule an interview for a shortlisted candidate."""
    app_doc = await applications_collection.find_one({"_id": ObjectId(data.application_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.now(timezone.utc)
    doc = {
        "application_id": data.application_id,
        "job_id": data.job_id,
        "recruiter_id": current_user["_id"],
        "scheduled_at": data.scheduled_at,
        "duration_minutes": data.duration_minutes,
        "mode": data.mode.value,
        "meeting_link": data.meeting_link,
        "location": data.location,
        "notes": data.notes,
        "status": InterviewStatus.SCHEDULED.value,
        "feedback": None,
        "rating": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await interviews_collection.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update application status
    await applications_collection.update_one(
        {"_id": ObjectId(data.application_id)},
        {"$set": {"status": ApplicationStatus.INTERVIEWED.value, "updated_at": now}},
    )
    return await _enrich_interview(doc)


@router.get("", response_model=List[InterviewResponse])
async def list_interviews(
    job_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """List interviews for the recruiter."""
    query = {"recruiter_id": current_user["_id"]}
    if job_id:
        query["job_id"] = job_id
    if status:
        query["status"] = status

    cursor = interviews_collection.find(query).sort("scheduled_at", 1).skip(skip).limit(limit)
    results = []
    async for doc in cursor:
        results.append(await _enrich_interview(doc))
    return results


@router.put("/{interview_id}", response_model=InterviewResponse)
async def update_interview(
    interview_id: str,
    data: InterviewUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update interview details, status, or add feedback."""
    doc = await interviews_collection.find_one({"_id": ObjectId(interview_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    if doc["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your interview")

    updates = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            updates[field] = value.value if hasattr(value, "value") else value
    updates["updated_at"] = datetime.now(timezone.utc)

    await interviews_collection.update_one({"_id": ObjectId(interview_id)}, {"$set": updates})
    updated = await interviews_collection.find_one({"_id": ObjectId(interview_id)})
    return await _enrich_interview(updated)
