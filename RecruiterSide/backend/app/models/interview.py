"""Interview scheduling data models."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class InterviewMode(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    PHONE = "phone"


class InterviewStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class InterviewCreate(BaseModel):
    application_id: str
    job_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(30, ge=15, le=180)
    mode: InterviewMode = InterviewMode.ONLINE
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    mode: Optional[InterviewMode] = None
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    status: Optional[InterviewStatus] = None
    feedback: Optional[str] = None
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    notes: Optional[str] = None


class InterviewResponse(BaseModel):
    id: str
    application_id: str
    job_id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    job_title: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    mode: InterviewMode
    meeting_link: Optional[str]
    location: Optional[str]
    status: InterviewStatus
    feedback: Optional[str]
    rating: Optional[float]
    notes: Optional[str]
    created_at: datetime
