"""
RecoMinds — Python FastAPI ML Backend
Handles: Embeddings · ChromaDB ANN · BM25 · LightGBM Ranking · Greedy/ILP Allocation
Called internally by the Express backend via HTTP.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.embedder import EmbedderService
from services.chroma_service import ChromaService
from routers import embed_router, rank_router, shortlist_router, chroma_router

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# ── Shared service singletons ──────────────────────────────────────────────────
embedder = EmbedderService()
chroma   = ChromaService(embedder=embedder)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model + init ChromaDB. Shutdown: cleanup."""
    logger.info("🚀 Starting RecoMinds ML Backend...")
    embedder.load()
    chroma.init()
    logger.info(f"✅ Embedder ready  — dim={embedder.dim}, model={embedder.model_name}")
    logger.info(f"✅ ChromaDB ready  — collections: {chroma.collection_names()}")
    yield
    logger.info("👋 Shutting down ML Backend")


app = FastAPI(
    title="RecoMinds ML Backend",
    description="AI services: embedding · BM25 · ChromaDB ANN · LightGBM ranking · Greedy/ILP allocation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inject singletons into routers via app.state
app.state.embedder = embedder
app.state.chroma   = chroma

# Mount routers
app.include_router(embed_router.router,     prefix="/api", tags=["Embedding"])
app.include_router(rank_router.router,      prefix="/api", tags=["Ranking"])
app.include_router(shortlist_router.router, prefix="/api", tags=["Shortlisting"])
app.include_router(chroma_router.router,    prefix="/api", tags=["ChromaDB"])


@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "ok",
        "service": "RecoMinds ML Backend",
        "embedder": {
            "model":  embedder.model_name,
            "dim":    embedder.dim,
            "ready":  embedder.ready,
        },
        "chromadb": {
            "ready":       chroma.ready,
            "collections": chroma.collection_names(),
            "path":        chroma.path,
        },
    }
