"""Job Management API routes — CRUD for job postings."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from app.models.job import JobCreate, JobUpdate, JobResponse, JobStatus
from app.middleware.auth_middleware import get_current_user, require_role
from app.database import jobs_collection, applications_collection

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def job_doc_to_response(doc: dict) -> JobResponse:
    return JobResponse(
        id=str(doc["_id"]),
        recruiter_id=doc["recruiter_id"],
        title=doc["title"],
        description=doc["description"],
        required_skills=doc.get("required_skills", []),
        preferred_skills=doc.get("preferred_skills", []),
        min_cgpa=doc.get("min_cgpa", 0),
        eligible_branches=doc.get("eligible_branches", []),
        positions=doc.get("positions", 1),
        location=doc.get("location", ""),
        stipend=doc.get("stipend"),
        duration=doc.get("duration"),
        deadline=doc.get("deadline"),
        status=doc.get("status", "active"),
        application_count=doc.get("application_count", 0),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(data: JobCreate, current_user: dict = Depends(get_current_user)):
    """Create a new job posting."""
    now = datetime.now(timezone.utc)
    doc = {
        "recruiter_id": current_user["_id"],
        "title": data.title,
        "description": data.description,
        "required_skills": [s.lower().strip() for s in data.required_skills],
        "preferred_skills": [s.lower().strip() for s in data.preferred_skills],
        "min_cgpa": data.min_cgpa,
        "eligible_branches": data.eligible_branches,
        "positions": data.positions,
        "location": data.location,
        "stipend": data.stipend,
        "duration": data.duration,
        "deadline": data.deadline,
        "status": JobStatus.ACTIVE.value,
        "application_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await jobs_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return job_doc_to_response(doc)


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all jobs for the current recruiter."""
    query = {"recruiter_id": current_user["_id"]}
    if status:
        query["status"] = status

    cursor = jobs_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    jobs = []
    async for doc in cursor:
        # Count applications
        count = await applications_collection.count_documents({"job_id": str(doc["_id"])})
        doc["application_count"] = count
        jobs.append(job_doc_to_response(doc))
    return jobs


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get details of a specific job."""
    doc = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")
    count = await applications_collection.count_documents({"job_id": job_id})
    doc["application_count"] = count
    return job_doc_to_response(doc)


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, data: JobUpdate, current_user: dict = Depends(get_current_user)):
    """Update a job posting."""
    doc = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "required_skills" in updates:
        updates["required_skills"] = [s.lower().strip() for s in updates["required_skills"]]
    if "status" in updates:
        updates["status"] = updates["status"].value if hasattr(updates["status"], "value") else updates["status"]
    updates["updated_at"] = datetime.now(timezone.utc)

    await jobs_collection.update_one({"_id": ObjectId(job_id)}, {"$set": updates})
    updated = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    return job_doc_to_response(updated)


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a job posting."""
    doc = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    if doc["recruiter_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not your job posting")
    await jobs_collection.delete_one({"_id": ObjectId(job_id)})
    await applications_collection.delete_many({"job_id": job_id})
