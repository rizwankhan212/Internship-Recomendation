"""Embedding endpoint — generate embeddings for text strings."""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import List

router = APIRouter()


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedOneRequest(BaseModel):
    text: str


@router.post("/embed")
def embed_texts(req: EmbedRequest, request: Request):
    """Generate embeddings for a list of texts."""
    embedder = request.app.state.embedder
    vecs = embedder.encode(req.texts)
    return {
        "embeddings": vecs.tolist(),
        "dim":        embedder.dim,
        "model":      embedder.model_name,
        "count":      len(req.texts),
    }


@router.post("/embed/one")
def embed_one(req: EmbedOneRequest, request: Request):
    """Generate embedding for a single text string."""
    embedder = request.app.state.embedder
    vec = embedder.encode_one(req.text)
    return {"embedding": vec, "dim": len(vec), "model": embedder.model_name}
