"""Job posting data models."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class JobCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=20)
    required_skills: List[str] = Field(..., min_length=1)
    preferred_skills: List[str] = []
    min_cgpa: float = Field(0.0, ge=0.0, le=10.0)
    eligible_branches: List[str] = []
    positions: int = Field(1, ge=1, le=100)
    location: str = ""
    stipend: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[datetime] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    min_cgpa: Optional[float] = None
    eligible_branches: Optional[List[str]] = None
    positions: Optional[int] = None
    location: Optional[str] = None
    stipend: Optional[str] = None
    duration: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[JobStatus] = None


class JobInDB(BaseModel):
    id: str = Field(alias="_id")
    recruiter_id: str
    title: str
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    min_cgpa: float
    eligible_branches: List[str]
    positions: int
    location: str
    stipend: Optional[str]
    duration: Optional[str]
    deadline: Optional[datetime]
    status: JobStatus
    application_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class JobResponse(BaseModel):
    id: str
    recruiter_id: str
    title: str
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    min_cgpa: float
    eligible_branches: List[str]
    positions: int
    location: str
    stipend: Optional[str]
    duration: Optional[str]
    deadline: Optional[datetime]
    status: JobStatus
    application_count: int
    created_at: datetime
    updated_at: datetime
