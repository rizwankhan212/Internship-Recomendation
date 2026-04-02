"""LambdaMART Ranker — Learning-to-Rank using LightGBM."""
import os
import pickle
import numpy as np
from typing import List, Dict, Optional


class LambdaMARTRanker:
    """
    LambdaMART ranking model using LightGBM.
    
    Features used for ranking:
    - bm25_score: BM25 keyword relevance
    - semantic_score: Cosine similarity from ANN search
    - cgpa_normalized: CGPA / 10
    - skill_match_ratio: matched_skills / required_skills
    - experience_score: number of relevant experiences
    - preferred_skill_ratio: matched_preferred / total_preferred
    
    For the prototype, uses a weighted combination approach.
    Can be retrained with recruiter feedback data using LightGBM ranker.
    """

    MODEL_PATH = os.path.join(os.path.dirname(__file__), "lambdamart_model.pkl")

    def __init__(self):
        self.model = None
        self._load_model()

        # Default feature weights (used when no trained model exists)
        self.weights = {
            "bm25_score": 0.20,
            "semantic_score": 0.25,
            "cgpa_normalized": 0.15,
            "skill_match_ratio": 0.25,
            "experience_score": 0.10,
            "preferred_skill_ratio": 0.05,
        }

    def _load_model(self):
        """Load pre-trained LightGBM model if available."""
        if os.path.exists(self.MODEL_PATH):
            try:
                with open(self.MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
            except Exception:
                self.model = None

    def extract_features(self, candidate: Dict, job: Dict) -> Dict[str, float]:
        """Extract ranking features for a candidate-job pair."""
        required_skills = set(s.lower() for s in job.get("required_skills", []))
        preferred_skills = set(s.lower() for s in job.get("preferred_skills", []))
        candidate_skills = set(s.lower() for s in candidate.get("parsed_skills", []))

        matched_required = required_skills & candidate_skills
        matched_preferred = preferred_skills & candidate_skills

        skill_match_ratio = (
            len(matched_required) / len(required_skills) if required_skills else 0
        )
        preferred_ratio = (
            len(matched_preferred) / len(preferred_skills) if preferred_skills else 0
        )

        cgpa = candidate.get("cgpa", 0)
        min_cgpa = job.get("min_cgpa", 0)
        cgpa_normalized = cgpa / 10.0
        # Bonus if above minimum
        if cgpa >= min_cgpa and min_cgpa > 0:
            cgpa_normalized = min(1.0, cgpa_normalized * 1.1)

        experience_count = len(candidate.get("parsed_experience", []))
        experience_score = min(1.0, experience_count / 3.0)

        return {
            "bm25_score": candidate.get("bm25_score", 0),
            "semantic_score": candidate.get("semantic_score", 0),
            "cgpa_normalized": round(cgpa_normalized, 4),
            "skill_match_ratio": round(skill_match_ratio, 4),
            "experience_score": round(experience_score, 4),
            "preferred_skill_ratio": round(preferred_ratio, 4),
            "matched_skills": list(matched_required | matched_preferred),
            "missing_skills": list(required_skills - candidate_skills),
        }

    def predict_score(self, features: Dict[str, float]) -> float:
        """Predict ranking score for a candidate."""
        if self.model is not None:
            # Use trained LightGBM model
            feature_vec = np.array([[
                features["bm25_score"],
                features["semantic_score"],
                features["cgpa_normalized"],
                features["skill_match_ratio"],
                features["experience_score"],
                features["preferred_skill_ratio"],
            ]])
            score = float(self.model.predict(feature_vec)[0])
        else:
            # Weighted combination fallback
            score = sum(
                features.get(f, 0) * w
                for f, w in self.weights.items()
                if f in features
            )

        return round(min(1.0, max(0.0, score)), 4)

    def rank_candidates(self, candidates: List[Dict], job: Dict) -> List[Dict]:
        """
        Rank all candidates for a job.
        Returns candidates sorted by rank_score descending.
        """
        ranked = []
        for candidate in candidates:
            features = self.extract_features(candidate, job)
            score = self.predict_score(features)

            # Build explanation
            explanation = self._generate_explanation(features, score, job)

            ranked.append({
                **candidate,
                "rank_score": score,
                "rank_explanation": {
                    "bm25_score": features["bm25_score"],
                    "semantic_score": features["semantic_score"],
                    "cgpa_score": features["cgpa_normalized"],
                    "skill_match_score": features["skill_match_ratio"],
                    "experience_score": features["experience_score"],
                    "final_rank_score": score,
                    "matched_skills": features.get("matched_skills", []),
                    "missing_skills": features.get("missing_skills", []),
                    "explanation": explanation,
                },
            })

        ranked.sort(key=lambda x: x["rank_score"], reverse=True)
        return ranked

    def _generate_explanation(self, features: Dict, score: float, job: Dict) -> str:
        """Generate human-readable ranking explanation."""
        parts = []

        skill_pct = int(features["skill_match_ratio"] * 100)
        if skill_pct >= 80:
            parts.append(f"Excellent skill match ({skill_pct}% of required skills)")
        elif skill_pct >= 50:
            parts.append(f"Good skill match ({skill_pct}% of required skills)")
        else:
            parts.append(f"Partial skill match ({skill_pct}% of required skills)")

        if features["semantic_score"] > 0.7:
            parts.append("Strong resume-job semantic alignment")
        elif features["semantic_score"] > 0.4:
            parts.append("Moderate resume relevance")

        cgpa_val = features["cgpa_normalized"] * 10
        if cgpa_val >= 8.5:
            parts.append(f"Outstanding CGPA ({cgpa_val:.1f})")
        elif cgpa_val >= 7.5:
            parts.append(f"Good CGPA ({cgpa_val:.1f})")

        if features["experience_score"] >= 0.7:
            parts.append("Strong relevant experience")
        elif features["experience_score"] > 0:
            parts.append("Some relevant experience")

        missing = features.get("missing_skills", [])
        if missing:
            parts.append(f"Missing skills: {', '.join(missing[:3])}")

        return ". ".join(parts) + "."

    def train(self, training_data: List[Dict]):
        """
        Train LambdaMART model using recruiter feedback.
        training_data: list of dicts with features + relevance_label (0-4)
        """
        try:
            import lightgbm as lgb

            features = []
            labels = []
            groups = []

            for item in training_data:
                features.append([
                    item["bm25_score"],
                    item["semantic_score"],
                    item["cgpa_normalized"],
                    item["skill_match_ratio"],
                    item["experience_score"],
                    item["preferred_skill_ratio"],
                ])
                labels.append(item["relevance_label"])

            if not features:
                return False

            X = np.array(features)
            y = np.array(labels)

            # Simple ranking model
            model = lgb.LGBMRanker(
                objective="lambdarank",
                metric="ndcg",
                n_estimators=100,
                learning_rate=0.1,
                num_leaves=31,
                min_child_samples=5,
            )

            # Group by queries (jobs) — simplified: all one group for prototype
            groups = [len(y)]
            model.fit(X, y, group=groups)

            self.model = model
            with open(self.MODEL_PATH, "wb") as f:
                pickle.dump(model, f)

            return True
        except Exception as e:
            print(f"Training failed: {e}")
            return False


# Singleton
lambdamart_ranker = LambdaMARTRanker()
