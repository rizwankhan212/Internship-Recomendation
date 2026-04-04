"""
ChromaDB Service — Embedded mode (no separate server needed)
Manages two collections:
  - recomids_internships  : internship embeddings
  - recomids_candidates   : candidate profile embeddings
"""

import os
import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

INTERNSHIP_COLLECTION = "recomids_internships"
CANDIDATE_COLLECTION  = "recomids_candidates"
CHROMA_PATH           = os.path.join(os.path.dirname(__file__), "..", "chroma_db")


class ChromaService:
    def __init__(self, embedder=None):
        self.embedder   = embedder
        self.client     = None
        self.internships_col = None
        self.candidates_col  = None
        self.ready      = False
        self.path       = os.path.abspath(CHROMA_PATH)

    def init(self):
        """Initialize ChromaDB in embedded (persistent) mode."""
        try:
            import chromadb
            from chromadb.config import Settings

            os.makedirs(self.path, exist_ok=True)
            self.client = chromadb.PersistentClient(
                path=self.path,
                settings=Settings(anonymized_telemetry=False),
            )

            self.internships_col = self.client.get_or_create_collection(
                name=INTERNSHIP_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
            self.candidates_col = self.client.get_or_create_collection(
                name=CANDIDATE_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )

            self.ready = True
            logger.info(
                f"ChromaDB ready at {self.path} | "
                f"internships={self.internships_col.count()} | "
                f"candidates={self.candidates_col.count()}"
            )
        except Exception as e:
            self.ready = False
            logger.error(f"ChromaDB init failed: {e}")

    def collection_names(self) -> Dict[str, Any]:
        if not self.ready:
            return {"internships": "offline", "candidates": "offline"}
        return {
            "internships": f"{INTERNSHIP_COLLECTION} ({self.internships_col.count()})",
            "candidates":  f"{CANDIDATE_COLLECTION} ({self.candidates_col.count()})",
        }

    # ── Upsert ────────────────────────────────────────────────────────────────

    def upsert_internship(
        self,
        doc_id:    str,
        embedding: List[float],
        metadata:  Dict[str, str],
        document:  str,
    ):
        if not self.ready:
            return
        try:
            self.internships_col.upsert(
                ids=[doc_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[document],
            )
        except Exception as e:
            logger.error(f"Upsert internship {doc_id} failed: {e}")

    def upsert_candidate(
        self,
        doc_id:    str,
        embedding: List[float],
        metadata:  Dict[str, str],
        document:  str,
    ):
        if not self.ready:
            return
        try:
            self.candidates_col.upsert(
                ids=[doc_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[document],
            )
        except Exception as e:
            logger.error(f"Upsert candidate {doc_id} failed: {e}")

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_internship(self, doc_id: str):
        if not self.ready:
            return
        try:
            self.internships_col.delete(ids=[doc_id])
        except Exception as e:
            logger.error(f"Delete internship {doc_id} failed: {e}")

    def delete_candidate(self, doc_id: str):
        if not self.ready:
            return
        try:
            self.candidates_col.delete(ids=[doc_id])
        except Exception as e:
            logger.error(f"Delete candidate {doc_id} failed: {e}")

    # ── ANN Query ─────────────────────────────────────────────────────────────

    def query_internships(
        self,
        query_embedding: List[float],
        n_results: int = 20,
        exclude_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query internship collection for nearest neighbours.
        Returns list of {id, distance, metadata}.
        """
        if not self.ready or not self.internships_col.count():
            return []

        # ChromaDB nResults must be <= collection count
        n = min(n_results + len(exclude_ids or []) + 5, self.internships_col.count())
        if n < 1:
            return []

        try:
            result = self.internships_col.query(
                query_embeddings=[query_embedding],
                n_results=n,
                include=["distances", "metadatas"],
            )
            ids       = result["ids"][0]
            distances = result["distances"][0]
            metadatas = result["metadatas"][0]

            out = []
            for i, doc_id in enumerate(ids):
                if exclude_ids and doc_id in exclude_ids:
                    continue
                # cosine distance = 1 - cosine_similarity
                sim = max(0.0, 1.0 - distances[i])
                out.append({"id": doc_id, "similarity": sim, "metadata": metadatas[i]})
                if len(out) >= n_results:
                    break
            return out
        except Exception as e:
            logger.error(f"ChromaDB query failed: {e}")
            return []
