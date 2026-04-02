"""Auth API routes — register, login, profile."""
import traceback
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.models.recruiter import (
    RecruiterCreate, RecruiterLogin, RecruiterResponse, TokenResponse,
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token, create_refresh_token,
)
from app.middleware.auth_middleware import get_current_user
from app.database import recruiters_collection
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RecruiterResponse, status_code=201)
async def register(data: RecruiterCreate):
    """Register a new recruiter account."""
    try:
        existing = await recruiters_collection.find_one({"email": data.email})
    except Exception as e:
        print(f"❌ MongoDB connection error during register: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed. Is MongoDB running? Error: {str(e)}"
        )

    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.now(timezone.utc)
    doc = {
        "email": data.email,
        "full_name": data.full_name,
        "company": data.company,
        "role": data.role.value,
        "hashed_password": hash_password(data.password),
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await recruiters_collection.insert_one(doc)
    except Exception as e:
        print(f"❌ MongoDB insert error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")

    print(f"✅ Registered: {data.email}")
    return RecruiterResponse(
        id=str(result.inserted_id),
        email=doc["email"],
        full_name=doc["full_name"],
        company=doc["company"],
        role=doc["role"],
        created_at=now,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: RecruiterLogin):
    """Authenticate and return JWT tokens."""
    try:
        user = await recruiters_collection.find_one({"email": data.email})
    except Exception as e:
        print(f"❌ MongoDB connection error during login: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed. Is MongoDB running? Error: {str(e)}"
        )

    if not user:
        print(f"⚠️ Login failed: No user found with email {data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password. Have you registered first?")
    if not verify_password(data.password, user["hashed_password"]):
        print(f"⚠️ Login failed: Wrong password for {data.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token_data = {"sub": user["email"], "role": user["role"]}
    access = create_access_token(token_data)
    refresh = create_refresh_token(token_data)
    print(f"✅ Login successful: {data.email}")
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=RecruiterResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current recruiter profile."""
    return RecruiterResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        company=current_user["company"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )
