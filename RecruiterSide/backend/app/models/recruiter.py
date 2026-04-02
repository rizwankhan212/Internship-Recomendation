"""Recruiter data models."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class RecruiterRole(str, Enum):
    ADMIN = "admin"
    HIRING_MANAGER = "hiring_manager"


class RecruiterCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    company: str
    role: RecruiterRole = RecruiterRole.HIRING_MANAGER


class RecruiterLogin(BaseModel):
    email: EmailStr
    password: str


class RecruiterInDB(BaseModel):
    id: str = Field(alias="_id")
    email: str
    full_name: str
    company: str
    role: RecruiterRole
    hashed_password: str
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True}


class RecruiterResponse(BaseModel):
    id: str
    email: str
    full_name: str
    company: str
    role: RecruiterRole
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
