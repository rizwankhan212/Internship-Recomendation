"""Analytics & Insights API routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from bson import ObjectId
from app.middleware.auth_middleware import get_current_user
from app.database import jobs_collection, applications_collection, interviews_collection
from app.models.application import ApplicationStatus

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def dashboard_metrics(current_user: dict = Depends(get_current_user)):
    """Get recruiter dashboard metrics."""
    recruiter_id = current_user["_id"]

    total_jobs = await jobs_collection.count_documents({"recruiter_id": recruiter_id})
    active_jobs = await jobs_collection.count_documents({
        "recruiter_id": recruiter_id, "status": "active"
    })

    # Get all job IDs for the recruiter
    job_ids = []
    async for job in jobs_collection.find({"recruiter_id": recruiter_id}, {"_id": 1}):
        job_ids.append(str(job["_id"]))

    total_applicants = await applications_collection.count_documents({"job_id": {"$in": job_ids}})
    shortlisted = await applications_collection.count_documents({
        "job_id": {"$in": job_ids},
        "status": {"$in": [
            ApplicationStatus.SHORTLISTED.value,
            ApplicationStatus.INTERVIEWED.value,
            ApplicationStatus.SELECTED.value,
        ]},
    })
    selected = await applications_collection.count_documents({
        "job_id": {"$in": job_ids},
        "status": ApplicationStatus.SELECTED.value,
    })
    interviews_count = await interviews_collection.count_documents({
        "recruiter_id": recruiter_id,
    })

    selection_rate = round((selected / total_applicants * 100), 1) if total_applicants > 0 else 0
    shortlist_rate = round((shortlisted / total_applicants * 100), 1) if total_applicants > 0 else 0

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applicants": total_applicants,
        "shortlisted": shortlisted,
        "selected": selected,
        "interviews_scheduled": interviews_count,
        "selection_rate": selection_rate,
        "shortlist_rate": shortlist_rate,
    }


@router.get("/funnel/{job_id}")
async def hiring_funnel(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get hiring funnel data for a specific job."""
    job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
    if not job or job["recruiter_id"] != current_user["_id"]:
        return {"error": "Job not found"}

    stages = {}
    for status in ApplicationStatus:
        count = await applications_collection.count_documents({
            "job_id": job_id, "status": status.value
        })
        stages[status.value] = count

    return {
        "job_id": job_id,
        "job_title": job["title"],
        "funnel": stages,
        "total": sum(stages.values()),
    }


@router.get("/skills")
async def skill_demand_analysis(current_user: dict = Depends(get_current_user)):
    """Analyze most in-demand skills across all jobs."""
    recruiter_id = current_user["_id"]
    skill_counts = {}

    async for job in jobs_collection.find({"recruiter_id": recruiter_id}):
        for skill in job.get("required_skills", []):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1
        for skill in job.get("preferred_skills", []):
            skill_counts[skill] = skill_counts.get(skill, 0) + 0.5

    # Sort by frequency
    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    return {
        "skills": [{"skill": s, "demand_score": round(c, 1)} for s, c in sorted_skills],
    }
