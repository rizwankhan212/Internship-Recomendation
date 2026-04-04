"""
BM25 Service — Okapi BM25 ranking using rank_bm25 library.
Falls back to simple TF scoring if rank_bm25 is unavailable.
"""

import re
import math
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def tokenize(text: str) -> List[str]:
    """Lowercase, strip punctuation, split on whitespace, filter short tokens."""
    return [
        t for t in re.sub(r"[^a-z0-9\s]", " ", (text or "").lower()).split()
        if len(t) > 1
    ]


def build_corpus_text(internship: Dict[str, Any]) -> str:
    """Build a single text string from internship fields for BM25 indexing."""
    return " ".join([
        internship.get("title", ""),
        internship.get("description", ""),
        " ".join(internship.get("skills", [])),
        internship.get("location", ""),
        internship.get("type", ""),
        internship.get("company", ""),
    ])


def rank_bm25(query: str, internships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank internships by BM25 score against the query.

    Returns list of dicts: [{internship, bm25_score}, ...] sorted descending.
    Normalizes scores to [0, 1].
    """
    if not internships:
        return []

    corpus = [tokenize(build_corpus_text(i)) for i in internships]
    query_tokens = tokenize(query)

    # Use rank_bm25 if available
    try:
        from rank_bm25 import BM25Okapi
        bm25 = BM25Okapi(corpus, k1=1.5, b=0.75)
        raw_scores = bm25.get_scores(query_tokens).tolist()
    except ImportError:
        logger.warning("rank_bm25 not installed, using simple TF scoring")
        raw_scores = [_simple_tf_score(query_tokens, doc) for doc in corpus]

    # Normalize to [0, 1]
    max_score = max(raw_scores) if raw_scores else 1.0
    max_score = max_score if max_score > 0 else 1.0
    normalized = [s / max_score for s in raw_scores]

    results = [
        {"internship": internships[i], "bm25_score": normalized[i]}
        for i in range(len(internships))
    ]
    return sorted(results, key=lambda x: x["bm25_score"], reverse=True)


def _simple_tf_score(query_tokens: List[str], doc_tokens: List[str]) -> float:
    """Simple TF-based score as fallback when rank_bm25 is unavailable."""
    doc_set = set(doc_tokens)
    return sum(1.0 for t in query_tokens if t in doc_set)
