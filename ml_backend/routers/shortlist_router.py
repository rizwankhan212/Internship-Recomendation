"""
Shortlist router — Greedy Allocator and Batch ILP Solver.
Called by Express recruiter controller to shortlist candidates.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

from services.allocator_service import greedy_shortlist, ilp_allocate

router = APIRouter()


class ApplicationItem(BaseModel):
    _id:        str
    candidate:  str
    internship: str
    rankScore:  float = 0.0


class GreedyRequest(BaseModel):
    applications: List[ApplicationItem]
    quota:        int = 20


class ILPRequest(BaseModel):
    applications: List[ApplicationItem]
    quota_map:    Dict[str, int]   # {internship_id: openings}


@router.post("/shortlist/greedy")
def greedy_endpoint(req: GreedyRequest):
    """
    Greedy Real-time Allocator:
    Sort by rankScore, take top quota.
    Returns the shortlisted application IDs in ranked order.
    """
    apps = [a.model_dump() for a in req.applications]
    result = greedy_shortlist(apps, quota=req.quota)
    return {
        "shortlisted":     [a["_id"] for a in result],
        "count":           len(result),
        "algorithm":       "greedy",
        "quota":           req.quota,
    }


@router.post("/shortlist/ilp")
def ilp_endpoint(req: ILPRequest):
    """
    Batch ILP Solver (scipy MILP):
    Maximise total rank score subject to per-internship quotas
    and each candidate appearing at most once.
    Falls back to greedy if scipy MILP unavailable.
    """
    apps = [a.model_dump() for a in req.applications]
    result = ilp_allocate(apps, quota_map=req.quota_map)
    return {
        "selected":    result["selected"],
        "allocations": result["allocations"],
        "total":       len(result["selected"]),
        "algorithm":   "ilp",
    }
