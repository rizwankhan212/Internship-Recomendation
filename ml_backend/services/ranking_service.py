"""
Ranking Service — LightGBM-style hybrid ranking.

Combines 4 signals with learned weights (simulating a trained LambdaMART model):
  - BM25 score         35%
  - ChromaDB ANN sim   30%
  - Skill overlap      25%  (Jaccard)
  - Location match     10%

LightGBM is used to apply a non-linear score combination via a pre-built
gradient-boosted model. Falls back to weighted sum if LightGBM is unavailable.
"""

import os
import logging
import numpy as np
from typing import List, Dict, Any, Optional

from services.bm25_service import rank_bm25, tokenize

logger = logging.getLogger(__name__)

# Signal weights (simulating LambdaMART learned weights)
WEIGHTS = {"bm25": 0.35, "vector": 0.30, "skill": 0.25, "location": 0.10}


# ── Helper functions ───────────────────────────────────────────────────────────

def _skill_overlap(candidate_skills: List[str], internship_skills: List[str]) -> float:
    """Jaccard similarity between two skill sets."""
    if not candidate_skills or not internship_skills:
        return 0.0
    c_set = set(s.lower() for s in candidate_skills)
    i_set = set(s.lower() for s in internship_skills)
    intersection = len(c_set & i_set)
    union = len(c_set | i_set)
    return intersection / union if union > 0 else 0.0


def _location_score(
    candidate_location: str,
    internship_location: str,
    preferred_types: List[str],
    internship_type: str,
) -> float:
    score = 0.0
    c_loc = (candidate_location or "").lower()
    i_loc = (internship_location or "").lower()
    if c_loc and i_loc and (c_loc in i_loc or i_loc in c_loc):
        score += 0.5
    if internship_type in (preferred_types or []):
        score += 0.5
    elif internship_type == "remote":
        score += 0.25
    return min(score, 1.0)


def _normalize(scores: List[float]) -> List[float]:
    arr = np.array(scores, dtype=float)
    mn, mx = arr.min(), arr.max()
    rng = mx - mn
    if rng < 1e-9:
        return [0.5] * len(scores)
    return ((arr - mn) / rng).tolist()


# ── LightGBM model ─────────────────────────────────────────────────────────────

_lgbm_model = None
_lgbm_tried  = False

MODEL_PATH = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models", "lgbm_ranker.pkl"))
print(f"🔍 LightGBM model path: {MODEL_PATH} (exists={os.path.exists(MODEL_PATH)})", flush=True)


def _get_lgbm_model():
    """
    Load the pre-trained LightGBM ranker from disk.
    Falls back to synthetic training if saved model not found.
    Run `python train_ranker.py` to train on real job data.
    """
    global _lgbm_model, _lgbm_tried
    if _lgbm_tried:
        return _lgbm_model
    _lgbm_tried = True

    # Try loading pre-trained model first
    if os.path.exists(MODEL_PATH):
        try:
            import pickle
            with open(MODEL_PATH, "rb") as f:
                _lgbm_model = pickle.load(f)
            print(f"✅ LightGBM ranker loaded from {MODEL_PATH}", flush=True)
            return _lgbm_model
        except Exception as e:
            print(f"⚠️  Failed to load saved model ({e}). Falling back.", flush=True)

    # Fallback: train on synthetic data
    try:
        import lightgbm as lgb
        logger.warning("⚠️  No saved model found. Training on synthetic data. Run `python train_ranker.py` for better results.")
        rng = np.random.default_rng(42)
        N = 500
        X = rng.random((N, 4))
        y = (
            WEIGHTS["bm25"]     * X[:, 0] +
            WEIGHTS["vector"]   * X[:, 1] +
            WEIGHTS["skill"]    * X[:, 2] +
            WEIGHTS["location"] * X[:, 3] +
            rng.normal(0, 0.05, N)
        ).clip(0, 1)
        y_bin = (y > 0.5).astype(int)
        model = lgb.LGBMClassifier(objective="binary", metric="binary_logloss",
                                    num_leaves=15, n_estimators=50, learning_rate=0.1, verbose=-1)
        model.fit(X, y_bin)
        _lgbm_model = model
        logger.info("✅ LightGBM ranker trained on synthetic data (fallback)")
    except Exception as e:
        logger.warning(f"⚠️  LightGBM unavailable ({e}). Using weighted-sum ranking.")
        _lgbm_model = None
    return _lgbm_model


# ── Main ranking function ──────────────────────────────────────────────────────

def rank_internships(
    candidate:    Dict[str, Any],
    internships:  List[Dict[str, Any]],
    ann_results:  List[Dict[str, Any]],   # from chroma_service.query_internships
    query:        str = "",
    top_n:        int = 10,
) -> List[Dict[str, Any]]:
    """
    Full hybrid ranking pipeline.

    :param candidate:    candidate dict with skills, location, preferredTypes, profileEmbedding
    :param internships:  list of internship dicts
    :param ann_results:  list of {id, similarity} from ChromaDB ANN
    :param query:        optional free-text search query
    :param top_n:        number of results to return
    :returns:            ranked list of {internship, rankScore, bm25Score, similarityScore, ...}
    """
    if not internships:
        return []

    # ── BM25 ──────────────────────────────────────────────────────────────────
    search_q = query or " ".join(candidate.get("skills", [])) or candidate.get("bio", "")
    bm25_results = rank_bm25(search_q, internships)
    bm25_map = {r["internship"].get("_id", ""): r["bm25_score"] for r in bm25_results}

    # ── ChromaDB ANN ───────────────────────────────────────────────────────────
    ann_map = {r["id"]: r["similarity"] for r in ann_results}

    bm25_scores = [bm25_map.get(i.get("_id", ""), 0.0) for i in internships]
    vec_scores   = [ann_map.get(i.get("_id", ""), 0.0)  for i in internships]
    bm25_norm    = _normalize(bm25_scores)
    vec_norm     = _normalize(vec_scores)

    # ── Per-internship signals ─────────────────────────────────────────────────
    skill_scores = [
        _skill_overlap(candidate.get("skills", []), i.get("skills", []))
        for i in internships
    ]
    loc_scores = [
        _location_score(
            candidate.get("location", ""),
            i.get("location", ""),
            candidate.get("preferredTypes", []),
            i.get("type", ""),
        )
        for i in internships
    ]

    # ── LightGBM scoring ──────────────────────────────────────────────────────
    model = _get_lgbm_model()
    ranked = []

    for idx, internship in enumerate(internships):
        features = np.array([[bm25_norm[idx], vec_norm[idx], skill_scores[idx], loc_scores[idx]]])

        if model is not None:
            try:
                # LightGBM probability of relevance as score
                lgbm_score = float(model.predict_proba(features)[0][1])
            except Exception:
                lgbm_score = (
                    WEIGHTS["bm25"]     * bm25_norm[idx] +
                    WEIGHTS["vector"]   * vec_norm[idx] +
                    WEIGHTS["skill"]    * skill_scores[idx] +
                    WEIGHTS["location"] * loc_scores[idx]
                )
        else:
            lgbm_score = (
                WEIGHTS["bm25"]     * bm25_norm[idx] +
                WEIGHTS["vector"]   * vec_norm[idx] +
                WEIGHTS["skill"]    * skill_scores[idx] +
                WEIGHTS["location"] * loc_scores[idx]
            )

        ranked.append({
            "internship":       internship,
            "rankScore":        round(lgbm_score, 4),
            "bm25Score":        round(bm25_norm[idx], 4),
            "similarityScore":  round(vec_norm[idx], 4),
            "skillOverlapScore":round(skill_scores[idx], 4),
            "locationScore":    round(loc_scores[idx], 4),
        })

    ranked.sort(key=lambda x: x["rankScore"], reverse=True)
    return ranked[:top_n]
