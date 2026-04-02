"""Application configuration loaded from environment variables."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "Recruiter Module - Internship Recommendation System"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # ── MongoDB ──
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "recruiter_module"

    # ── ChromaDB ──
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION: str = "resume_embeddings"

    # ── JWT Auth ──
    JWT_SECRET_KEY: str = "super-secret-change-in-production-9f8a7b6c5d4e3f2a"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Student Module Integration ──
    STUDENT_API_BASE_URL: str = "http://localhost:8001/api"

    # ── Email (SMTP) ──
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@recruiter.local"

    # ── ML ──
    SPACY_MODEL: str = "en_core_web_sm"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
