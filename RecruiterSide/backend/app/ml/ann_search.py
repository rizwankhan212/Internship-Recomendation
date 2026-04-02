"""ANN Semantic Search — sentence embeddings + ChromaDB vector similarity."""
from typing import List, Dict, Optional
import hashlib


class ANNSearch:
    """
    Approximate Nearest Neighbor search using ChromaDB.
    Uses sentence-transformers to generate embeddings, ChromaDB for storage & retrieval.
    Falls back to a lightweight cosine-similarity implementation if sentence-transformers
    is unavailable (e.g. in CI/testing).
    """

    def __init__(self):
        self._model = None
        self._collection = None

    def _get_model(self):
        """Lazy-load the sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("all-MiniLM-L6-v2")
            except ImportError:
                self._model = "fallback"
        return self._model

    def _get_collection(self):
        """Lazy-load ChromaDB collection."""
        if self._collection is None:
            from app.database import get_chroma_collection
            self._collection = get_chroma_collection()
        return self._collection

    def _text_to_id(self, text: str) -> str:
        """Generate a stable ID from text content."""
        return hashlib.md5(text.encode()).hexdigest()

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a text string."""
        model = self._get_model()
        if model == "fallback":
            return self._fallback_embed(text)
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def _fallback_embed(self, text: str) -> List[float]:
        """Simple TF-based embedding fallback (for testing without sentence-transformers)."""
        import math
        words = text.lower().split()
        vocab = sorted(set(words))[:100]
        vec = [words.count(w) for w in vocab]
        # Pad to 384 dimensions
        vec = vec + [0.0] * (384 - len(vec))
        # Normalize
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec[:384]]

    def index_resume(self, doc_id: str, resume_text: str, metadata: Optional[Dict] = None):
        """Index a resume embedding in ChromaDB."""
        collection = self._get_collection()
        embedding = self.embed_text(resume_text)
        meta = metadata or {}
        meta["text_preview"] = resume_text[:500]

        collection.upsert(
            ids=[doc_id],
            embeddings=[embedding],
            metadatas=[meta],
            documents=[resume_text[:1000]],
        )

    def search(self, query_text: str, n_results: int = 20) -> List[Dict]:
        """Search for similar resumes given a job description query."""
        collection = self._get_collection()
        query_embedding = self.embed_text(query_text)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, collection.count() or 1),
            include=["distances", "metadatas", "documents"],
        )

        if not results["ids"] or not results["ids"][0]:
            return []

        output = []
        for i, doc_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i] if results["distances"] else 0
            # ChromaDB cosine distance → similarity
            similarity = max(0, 1 - distance)
            output.append({
                "id": doc_id,
                "similarity": round(similarity, 4),
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
            })
        return output

    def batch_score(self, query_text: str, documents: List[Dict]) -> List[Dict]:
        """
        Score multiple documents against a query using semantic similarity.
        Each document dict: {"id": str, "text": str}
        """
        # Index all documents
        collection = self._get_collection()
        for doc in documents:
            self.index_resume(doc["id"], doc["text"])

        # Search
        results = self.search(query_text, n_results=len(documents))
        score_map = {r["id"]: r["similarity"] for r in results}

        return [
            {"id": doc["id"], "score": score_map.get(doc["id"], 0.0)}
            for doc in documents
        ]


# Singleton
ann_search = ANNSearch()
