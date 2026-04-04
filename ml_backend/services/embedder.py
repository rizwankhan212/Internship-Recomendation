"""
Embedder Service
Primary:  sentence-transformers  all-MiniLM-L6-v2  (384-dim, ~90MB download once)
Fallback: scikit-learn TF-IDF vectorizer over a 50-term vocabulary (no download needed)
"""

import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

# Fixed 50-term vocabulary for TF-IDF fallback
TFIDF_VOCAB = [
    "javascript", "python", "react", "nodejs", "express", "mongodb", "sql", "postgresql",
    "machine learning", "data science", "deep learning", "nlp", "computer vision",
    "java", "spring", "django", "flask", "tensorflow", "pytorch", "scikit",
    "docker", "kubernetes", "aws", "azure", "gcp", "devops", "linux",
    "html", "css", "typescript", "vue", "angular", "graphql", "rest",
    "data analysis", "tableau", "excel", "statistics",
    "git", "agile", "cpp", "golang", "rust",
    "android", "ios", "flutter", "swift", "kotlin",
    "blockchain", "cybersecurity", "redis",
]


class EmbedderService:
    """
    Wraps sentence-transformers with a TF-IDF fallback.
    Exposes a single `.encode(texts) -> np.ndarray` interface.
    """

    SBERT_MODEL = "all-MiniLM-L6-v2"  # 384-dim, fast, good quality

    def __init__(self):
        self.model       = None
        self.model_name  = self.SBERT_MODEL
        self.dim         = 384
        self.ready       = False
        self._using_fallback = False

    def load(self):
        """Load sentence-transformers model. Falls back to TF-IDF if unavailable."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading sentence-transformers model: {self.SBERT_MODEL} ...")
            self.model = SentenceTransformer(self.SBERT_MODEL)
            self.dim   = self.model.get_sentence_embedding_dimension()
            self._using_fallback = False
            logger.info(f"✅ Sentence transformer loaded (dim={self.dim})")
        except Exception as e:
            logger.warning(f"⚠️  sentence-transformers unavailable ({e}). Using TF-IDF fallback (50-dim).")
            self._using_fallback = True
            self.model_name = "tfidf-fallback"
            self.dim = len(TFIDF_VOCAB)
        self.ready = True

    def encode(self, texts: List[str]) -> np.ndarray:
        """
        Encode a list of texts into embeddings.
        Returns np.ndarray of shape (N, dim), L2-normalized.
        """
        if not self.ready:
            raise RuntimeError("Embedder not loaded — call load() first")

        if not self._using_fallback and self.model is not None:
            vecs = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.array(vecs, dtype=np.float32)

        # TF-IDF fallback
        return np.array([self._tfidf_encode(t) for t in texts], dtype=np.float32)

    def encode_one(self, text: str) -> List[float]:
        """Encode a single text and return as a plain Python list."""
        return self.encode([text])[0].tolist()

    @staticmethod
    def _tfidf_encode(text: str) -> np.ndarray:
        lower = (text or "").lower()
        vec = np.zeros(len(TFIDF_VOCAB), dtype=np.float32)
        for i, term in enumerate(TFIDF_VOCAB):
            count = lower.count(term)
            if count:
                vec[i] = float(count)
        mag = np.linalg.norm(vec)
        return vec / mag if mag > 0 else vec

    @property
    def using_fallback(self) -> bool:
        return self._using_fallback
