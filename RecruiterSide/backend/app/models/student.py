"""Student data models — represents data fetched from the Student Module API."""
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


class StudentProfile(BaseModel):
    """Student profile as received from the student module."""
    student_id: str
    name: str
    email: EmailStr
    cgpa: float = Field(0.0, ge=0.0, le=10.0)
    branch: str = ""
    skills: List[str] = []
    experience: List[str] = []
    education: str = ""
    resume_url: Optional[str] = None
    resume_text: Optional[str] = None
    profile_summary: Optional[str] = None
    graduation_year: Optional[int] = None


class StudentListResponse(BaseModel):
    students: List[StudentProfile]
    total: int
    page: int
    page_size: int
