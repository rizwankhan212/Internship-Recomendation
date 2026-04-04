"""
Ranking router — Full hybrid ranking using BM25 + ChromaDB ANN + LightGBM.
Called by Express backend for candidate recommendations and search results.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from services.ranking_service import rank_internships

router = APIRouter()


class InternshipItem(BaseModel):
    _id:         str
    title:       str = ""
    description: str = ""
    company:     str = ""
    location:    str = ""
    type:        str = ""
    skills:      List[str] = []
    stipend:     float = 0
    openings:    int = 1
    duration:    str = ""
    isActive:    bool = True


class CandidateInfo(BaseModel):
    _id:              str = ""
    skills:           List[str] = []
    location:         str = ""
    preferredTypes:   List[str] = []
    bio:              str = ""
    profileEmbedding: Optional[List[float]] = None


class RankRequest(BaseModel):
    candidate:    CandidateInfo
    internships:  List[Dict[str, Any]]
    query:        str = ""
    top_n:        int = 10


@router.post("/rank")
async def rank_endpoint(req: RankRequest, request: Request):
    """
    Full hybrid ranking:
      1. BM25 keyword scoring (rank_bm25)
      2. ChromaDB ANN semantic search
      3. LightGBM scoring combining all signals
    """
    embedder = request.app.state.embedder
    chroma   = request.app.state.chroma

    candidate    = req.candidate.model_dump()
    internships  = req.internships

    # ── 1. Get or generate candidate embedding ────────────────────────────────
    candidate_emb = candidate.get("profileEmbedding")
    if not candidate_emb:
        profile_text = " ".join([
            " ".join(candidate.get("skills", [])),
            candidate.get("location", ""),
            candidate.get("bio", ""),
        ])
        candidate_emb = embedder.encode_one(profile_text)
        candidate["profileEmbedding"] = candidate_emb

    # ── 2. ChromaDB ANN search ────────────────────────────────────────────────
    ann_results = chroma.query_internships(
        query_embedding=candidate_emb,
        n_results=len(internships),
    )

    # ── 3. LightGBM hybrid ranking ─────────────────────────────────────────────
    ranked = rank_internships(
        candidate=candidate,
        internships=internships,
        ann_results=ann_results,
        query=req.query,
        top_n=req.top_n,
    )

    return {
        "ranked":      ranked,
        "total":       len(internships),
        "query":       req.query,
        "ann_hits":    len(ann_results),
        "model":       embedder.model_name,
        "chroma_live": chroma.ready,
    }
