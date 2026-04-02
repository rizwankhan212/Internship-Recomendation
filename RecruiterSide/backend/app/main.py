"""FastAPI Application Entry Point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import create_indexes
from app.routes import auth, jobs, applications, shortlist, interviews, analytics, students


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME}")

    # Check MongoDB connectivity
    try:
        from app.database import mongo_client
        await mongo_client.admin.command("ping")
        print("✅ MongoDB connected successfully")
    except Exception as e:
        print(f"⚠️  WARNING: MongoDB is NOT reachable at {settings.MONGODB_URL}")
        print(f"   Error: {e}")
        print(f"   The app will start but auth/data operations will fail!")
        print(f"   → Start MongoDB: docker run -d -p 27017:27017 --name mongo mongo:7")

    try:
        await create_indexes()
        print("✅ MongoDB indexes created")
    except Exception as e:
        print(f"⚠️  Could not create indexes: {e}")

    yield
    # Shutdown
    print("👋 Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered recruiter platform for intelligent candidate shortlisting",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routes ──────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(applications.feedback_router, prefix="/api")
app.include_router(shortlist.router, prefix="/api")
app.include_router(interviews.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(students.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
