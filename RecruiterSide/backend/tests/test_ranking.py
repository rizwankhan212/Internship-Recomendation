"""Tests for ML ranking pipeline components."""
import pytest
from app.ml.resume_parser import parse_resume, extract_skills
from app.ml.bm25_scorer import BM25Scorer
from app.ml.optimizer import greedy_shortlist, ilp_shortlist
from app.ml.lambdamart import LambdaMARTRanker


class TestResumeParser:
    def test_extract_skills(self):
        text = "Experienced in Python, machine learning, and SQL. Built apps with React."
        skills = extract_skills(text)
        assert "python" in skills
        assert "machine learning" in skills
        assert "sql" in skills
        assert "react" in skills

    def test_parse_resume_full(self):
        text = (
            "Software Engineer with 3 years of experience in Python and Django. "
            "Worked at TechCorp as Backend Developer. "
            "B.Tech Computer Science from IIT Delhi 2024."
        )
        result = parse_resume(text)
        assert "python" in result["skills"]
        assert "django" in result["skills"]
        assert len(result["skills"]) >= 2

    def test_empty_text(self):
        result = parse_resume("")
        assert result["skills"] == []


class TestBM25Scorer:
    def test_single_document_score(self):
        scorer = BM25Scorer()
        score = scorer.score(
            "python machine learning",
            "experienced python developer with machine learning skills"
        )
        assert score > 0

    def test_batch_scoring(self):
        scorer = BM25Scorer()
        docs = [
            {"id": "1", "text": "python machine learning tensorflow"},
            {"id": "2", "text": "java spring boot microservices"},
            {"id": "3", "text": "python data analysis pandas numpy"},
        ]
        results = scorer.score_batch("python machine learning data science", docs)
        assert len(results) == 3
        # Python-related docs should score higher than Java doc
        python_scores = [r for r in results if r["id"] in ("1", "3")]
        java_score = next(r for r in results if r["id"] == "2")
        assert all(ps["score"] > java_score["score"] for ps in python_scores)

    def test_empty_query(self):
        scorer = BM25Scorer()
        score = scorer.score("", "some document text")
        assert score == 0.0


class TestLambdaMARTRanker:
    def test_feature_extraction(self):
        ranker = LambdaMARTRanker()
        candidate = {
            "parsed_skills": ["python", "machine learning", "sql"],
            "parsed_experience": ["Intern at TechCorp"],
            "cgpa": 8.5,
            "bm25_score": 0.7,
            "semantic_score": 0.8,
        }
        job = {
            "required_skills": ["python", "machine learning", "tensorflow"],
            "preferred_skills": ["sql", "docker"],
            "min_cgpa": 7.0,
        }
        features = ranker.extract_features(candidate, job)
        assert features["skill_match_ratio"] == round(2/3, 4)
        assert features["bm25_score"] == 0.7
        assert features["semantic_score"] == 0.8
        assert features["cgpa_normalized"] > 0

    def test_rank_candidates(self):
        ranker = LambdaMARTRanker()
        candidates = [
            {"parsed_skills": ["python"], "parsed_experience": [], "cgpa": 6.0,
             "bm25_score": 0.3, "semantic_score": 0.3, "_id": "a1"},
            {"parsed_skills": ["python", "ml", "tensorflow"], "parsed_experience": ["Intern"],
             "cgpa": 9.0, "bm25_score": 0.9, "semantic_score": 0.8, "_id": "a2"},
        ]
        job = {"required_skills": ["python", "ml", "tensorflow"], "preferred_skills": [], "min_cgpa": 7.0}
        ranked = ranker.rank_candidates(candidates, job)
        assert ranked[0]["_id"] == "a2"  # Higher scoring candidate first
        assert ranked[0]["rank_score"] > ranked[1]["rank_score"]
        assert "explanation" in ranked[0]["rank_explanation"]


class TestOptimizer:
    def test_greedy_shortlist(self):
        candidates = [
            {"app_id": "1", "rank_score": 0.9, "branch": "CS"},
            {"app_id": "2", "rank_score": 0.7, "branch": "IT"},
            {"app_id": "3", "rank_score": 0.5, "branch": "CS"},
        ]
        result = greedy_shortlist(candidates, 2)
        assert len(result) == 2
        assert result[0]["app_id"] == "1"
        assert result[1]["app_id"] == "2"

    def test_ilp_shortlist(self):
        candidates = [
            {"app_id": "1", "rank_score": 0.9, "branch": "CS", "skills": ["python"]},
            {"app_id": "2", "rank_score": 0.85, "branch": "CS", "skills": ["python"]},
            {"app_id": "3", "rank_score": 0.7, "branch": "IT", "skills": ["java"]},
            {"app_id": "4", "rank_score": 0.6, "branch": "ECE", "skills": ["c++"]},
        ]
        result = ilp_shortlist(candidates, 3, branch_diversity=True)
        assert len(result) <= 3
        # With diversity, we should see multiple branches
        branches = {c["branch"] for c in result}
        assert len(branches) >= 2  # diversity enforced

    def test_greedy_fewer_than_max(self):
        candidates = [{"app_id": "1", "rank_score": 0.9, "branch": "CS"}]
        result = greedy_shortlist(candidates, 5)
        assert len(result) == 1
