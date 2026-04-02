"""Database connections — MongoDB (Motor async) + ChromaDB."""
import motor.motor_asyncio
import chromadb
from app.config import settings

# ── MongoDB ──────────────────────────────────────────────────────────────────
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(
    settings.MONGODB_URL,
    serverSelectionTimeoutMS=5000,  # 5s timeout — fail fast if MongoDB is down
)
db = mongo_client[settings.MONGODB_DB_NAME]

# Collections
recruiters_collection = db["recruiters"]
jobs_collection = db["jobs"]
applications_collection = db["applications"]
interviews_collection = db["interviews"]
students_collection = db["students"]  # cached from student module
feedback_collection = db["ranking_feedback"]  # for ML feedback loop


async def create_indexes():
    """Create MongoDB indexes for performance."""
    await recruiters_collection.create_index("email", unique=True)
    await jobs_collection.create_index("recruiter_id")
    await jobs_collection.create_index("status")
    await jobs_collection.create_index([("title", "text"), ("description", "text")])
    await applications_collection.create_index("job_id")
    await applications_collection.create_index("student_id")
    await applications_collection.create_index([("job_id", 1), ("student_id", 1)], unique=True)
    await interviews_collection.create_index("application_id")
    await interviews_collection.create_index("scheduled_at")
    await students_collection.create_index("student_id", unique=True)


# ── ChromaDB ─────────────────────────────────────────────────────────────────
def get_chroma_client():
    """Get ChromaDB client — uses persistent local storage for dev."""
    try:
        client = chromadb.HttpClient(
            host=settings.CHROMA_HOST, port=settings.CHROMA_PORT
        )
        client.heartbeat()
        return client
    except Exception:
        # Fallback to in-process persistent client for development
        client = chromadb.PersistentClient(path="./chroma_data")
        return client


def get_chroma_collection():
    """Get or create the resume embeddings collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )
