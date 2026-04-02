"""Application data models — tracks a student's application to a job."""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    UNDER_REVIEW = "under_review"
    SHORTLISTED = "shortlisted"
    INTERVIEWED = "interviewed"
    SELECTED = "selected"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class RankExplanation(BaseModel):
    """AI-generated explanation of why a candidate was ranked."""
    bm25_score: float = 0.0
    semantic_score: float = 0.0
    cgpa_score: float = 0.0
    skill_match_score: float = 0.0
    experience_score: float = 0.0
    final_rank_score: float = 0.0
    explanation: str = ""
    matched_skills: List[str] = []
    missing_skills: List[str] = []


class ApplicationCreate(BaseModel):
    job_id: str
    student_id: str
    resume_text: str = ""


class ApplicationInDB(BaseModel):
    id: str = Field(alias="_id")
    job_id: str
    student_id: str
    resume_text: str
    parsed_skills: List[str] = []
    parsed_experience: List[str] = []
    parsed_education: List[str] = []
    bm25_score: float = 0.0
    semantic_score: float = 0.0
    rank_score: float = 0.0
    rank_explanation: Optional[RankExplanation] = None
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    student_id: str
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_cgpa: Optional[float] = None
    student_branch: Optional[str] = None
    parsed_skills: List[str]
    bm25_score: float
    semantic_score: float
    rank_score: float
    rank_explanation: Optional[RankExplanation] = None
    status: ApplicationStatus
    applied_at: datetime


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ShortlistRequest(BaseModel):
    method: str = Field("greedy", pattern="^(greedy|ilp)$")
    max_candidates: Optional[int] = None
    min_score: float = 0.0
    branch_diversity: bool = False


class RankingFeedback(BaseModel):
    application_id: str
    job_id: str
    recruiter_action: str  # "shortlisted", "rejected", "selected"
    recruiter_score: Optional[float] = None  # 1-5 manual rating
    notes: Optional[str] = None
