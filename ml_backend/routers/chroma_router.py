"""
ChromaDB router — CRUD for internship and candidate embeddings.
Called by Express backend after each MongoDB create/update/delete.
"""
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────────

class UpsertInternshipRequest(BaseModel):
    id:          str
    title:       str = ""
    description: str = ""
    company:     str = ""
    location:    str = ""
    type:        str = ""
    skills:      List[str] = []
    isActive:    bool = True
    # Optional pre-computed embedding (if None, will be computed here)
    embedding:   Optional[List[float]] = None


class UpsertCandidateRequest(BaseModel):
    id:       str
    skills:   List[str] = []
    location: str = ""
    bio:      str = ""
    degree:   str = ""
    name:     str = ""
    preferredTypes: List[str] = []
    embedding: Optional[List[float]] = None


# ── Upsert internship ─────────────────────────────────────────────────────────

@router.post("/chroma/upsert/internship")
async def upsert_internship(req: UpsertInternshipRequest, request: Request):
    embedder = request.app.state.embedder
    chroma   = request.app.state.chroma

    # Generate embedding if not provided
    if req.embedding:
        emb = req.embedding
    else:
        text = " ".join([req.title, req.description, " ".join(req.skills), req.location, req.type, req.company])
        emb  = embedder.encode_one(text)

    metadata = {
        "title":    req.title,
        "company":  req.company,
        "location": req.location,
        "type":     req.type,
        "skills":   ",".join(req.skills),
        "isActive": str(req.isActive),
    }
    document = f"{req.title} {req.description} {' '.join(req.skills)}"

    chroma.upsert_internship(req.id, emb, metadata, document)

    return {"success": True, "id": req.id, "dim": len(emb), "chroma_live": chroma.ready}


# ── Upsert candidate ──────────────────────────────────────────────────────────

@router.post("/chroma/upsert/candidate")
async def upsert_candidate(req: UpsertCandidateRequest, request: Request):
    embedder = request.app.state.embedder
    chroma   = request.app.state.chroma

    if req.embedding:
        emb = req.embedding
    else:
        text = " ".join([" ".join(req.skills), req.location, req.bio, req.degree, " ".join(req.preferredTypes)])
        emb  = embedder.encode_one(text)

    metadata = {
        "name":     req.name,
        "location": req.location,
        "skills":   ",".join(req.skills),
        "degree":   req.degree,
    }
    document = f"{' '.join(req.skills)} {req.bio} {req.degree}"

    chroma.upsert_candidate(req.id, emb, metadata, document)

    return {"success": True, "id": req.id, "dim": len(emb), "chroma_live": chroma.ready}


# ── Delete endpoints ──────────────────────────────────────────────────────────

@router.delete("/chroma/internship/{doc_id}")
def delete_internship(doc_id: str, request: Request):
    chroma = request.app.state.chroma
    chroma.delete_internship(doc_id)
    return {"success": True, "deleted": doc_id}


@router.delete("/chroma/candidate/{doc_id}")
def delete_candidate(doc_id: str, request: Request):
    chroma = request.app.state.chroma
    chroma.delete_candidate(doc_id)
    return {"success": True, "deleted": doc_id}


# ── ANN search endpoint ───────────────────────────────────────────────────────

class ANNSearchRequest(BaseModel):
    embedding:   List[float]
    n_results:   int = 20
    exclude_ids: List[str] = []


@router.post("/chroma/search")
def ann_search(req: ANNSearchRequest, request: Request):
    """Direct ANN search in ChromaDB internship collection."""
    chroma = request.app.state.chroma
    results = chroma.query_internships(
        query_embedding=req.embedding,
        n_results=req.n_results,
        exclude_ids=req.exclude_ids,
    )
    return {"results": results, "count": len(results), "chroma_live": chroma.ready}


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/chroma/status")
def chroma_status(request: Request):
    chroma   = request.app.state.chroma
    embedder = request.app.state.embedder
    return {
        "chroma_live":  chroma.ready,
        "collections":  chroma.collection_names(),
        "embedder":     embedder.model_name,
        "embedder_dim": embedder.dim,
        "path":         chroma.path,
    }
