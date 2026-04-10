"""
RecoMinds ML Backend — Evaluation Script
Tests: Accuracy, Precision, Recall, NDCG, MRR for the ranking pipeline.

Usage:
  cd ml_backend
  python evaluate.py

Yeh script synthetic test cases create karta hai jahan hume pata hai ki
kaunsi internship relevant hai, phir ML pipeline se rank karwata hai,
aur compare karta hai actual vs predicted rankings.
"""

import sys
import json
import numpy as np
from typing import List, Dict, Any

# ── Import ML services ─────────────────────────────────────────────────────────
from services.embedder import EmbedderService
from services.chroma_service import ChromaService
from services.bm25_service import rank_bm25
from services.ranking_service import rank_internships, _skill_overlap, _location_score

# ── Initialize services ────────────────────────────────────────────────────────
print("🚀 Loading ML services...")
embedder = EmbedderService()
embedder.load()
chroma = ChromaService(embedder=embedder)
chroma.init()
print(f"✅ Embedder: {embedder.model_name} (dim={embedder.dim})")
print(f"✅ ChromaDB: ready={chroma.ready}")
print()

# ═══════════════════════════════════════════════════════════════════════════════
# TEST DATA — Synthetic candidates and internships with KNOWN relevance
# ═══════════════════════════════════════════════════════════════════════════════

TEST_CANDIDATES = [
    {
        "_id": "cand_1",
        "name": "ML Engineer Candidate",
        "skills": ["python", "machine learning", "tensorflow", "deep learning", "nlp"],
        "location": "bangalore",
        "preferredTypes": ["remote", "hybrid"],
        "bio": "Machine learning engineer with experience in NLP and computer vision",
    },
    {
        "_id": "cand_2",
        "name": "Frontend Developer Candidate",
        "skills": ["javascript", "react", "typescript", "css", "html"],
        "location": "mumbai",
        "preferredTypes": ["remote"],
        "bio": "Frontend developer skilled in React and modern JavaScript",
    },
    {
        "_id": "cand_3",
        "name": "Full Stack Developer Candidate",
        "skills": ["javascript", "python", "react", "nodejs", "mongodb"],
        "location": "delhi",
        "preferredTypes": ["on-site", "hybrid"],
        "bio": "Full stack developer with MERN stack experience",
    },
    {
        "_id": "cand_4",
        "name": "Data Scientist Candidate",
        "skills": ["python", "sql", "machine learning", "data analysis", "statistics"],
        "location": "hyderabad",
        "preferredTypes": ["remote", "on-site"],
        "bio": "Data scientist with strong statistics and ML background",
    },
]

TEST_INTERNSHIPS = [
    {
        "_id": "int_1",
        "title": "Machine Learning Intern",
        "description": "Work on NLP models and deep learning pipelines using TensorFlow",
        "company": "AI Corp",
        "skills": ["python", "machine learning", "tensorflow", "deep learning"],
        "location": "bangalore",
        "type": "hybrid",
    },
    {
        "_id": "int_2",
        "title": "React Frontend Intern",
        "description": "Build modern UI components with React and TypeScript",
        "company": "WebDev Inc",
        "skills": ["javascript", "react", "typescript", "css"],
        "location": "mumbai",
        "type": "remote",
    },
    {
        "_id": "int_3",
        "title": "Full Stack Developer Intern",
        "description": "Develop full stack applications using MERN stack",
        "company": "TechStart",
        "skills": ["javascript", "react", "nodejs", "mongodb"],
        "location": "delhi",
        "type": "on-site",
    },
    {
        "_id": "int_4",
        "title": "Data Science Intern",
        "description": "Analyze datasets and build ML models for business insights",
        "company": "DataPro",
        "skills": ["python", "sql", "machine learning", "data analysis"],
        "location": "hyderabad",
        "type": "remote",
    },
    {
        "_id": "int_5",
        "title": "DevOps Engineer Intern",
        "description": "Manage CI/CD pipelines with Docker and Kubernetes on AWS",
        "company": "CloudOps",
        "skills": ["docker", "kubernetes", "aws", "linux", "devops"],
        "location": "pune",
        "type": "remote",
    },
    {
        "_id": "int_6",
        "title": "Android Developer Intern",
        "description": "Build native Android apps using Kotlin",
        "company": "MobileFirst",
        "skills": ["kotlin", "android", "java"],
        "location": "chennai",
        "type": "on-site",
    },
    {
        "_id": "int_7",
        "title": "Cybersecurity Intern",
        "description": "Network security analysis and penetration testing",
        "company": "SecureNet",
        "skills": ["cybersecurity", "linux", "python"],
        "location": "noida",
        "type": "on-site",
    },
    {
        "_id": "int_8",
        "title": "NLP Research Intern",
        "description": "Research and develop NLP models for text classification",
        "company": "LangAI",
        "skills": ["python", "nlp", "deep learning", "pytorch"],
        "location": "bangalore",
        "type": "remote",
    },
]

# ── Ground Truth: Which internships are RELEVANT for each candidate ────────────
# Relevance levels: 3 = highly relevant, 2 = relevant, 1 = somewhat relevant, 0 = not relevant
GROUND_TRUTH = {
    "cand_1": {  # ML Engineer
        "int_1": 3,  # ML Intern — perfect match
        "int_8": 3,  # NLP Research — perfect match
        "int_4": 2,  # Data Science — good match
        "int_7": 1,  # Cybersecurity — has Python
        "int_2": 0,  # React Frontend — no match
        "int_3": 0,  # Full Stack — no match
        "int_5": 0,  # DevOps — no match
        "int_6": 0,  # Android — no match
    },
    "cand_2": {  # Frontend Developer
        "int_2": 3,  # React Frontend — perfect match
        "int_3": 2,  # Full Stack — has React, JS
        "int_1": 0,  # ML — no match
        "int_4": 0,  # Data Science — no match
        "int_5": 0,  # DevOps — no match
        "int_6": 0,  # Android — no match
        "int_7": 0,  # Cybersecurity — no match
        "int_8": 0,  # NLP — no match
    },
    "cand_3": {  # Full Stack Developer
        "int_3": 3,  # Full Stack — perfect match
        "int_2": 2,  # React Frontend — has React, JS
        "int_1": 1,  # ML — has Python
        "int_4": 1,  # Data Science — has Python
        "int_5": 0,  # DevOps — no match
        "int_6": 0,  # Android — no match
        "int_7": 0,  # Cybersecurity — no match
        "int_8": 1,  # NLP — has Python
    },
    "cand_4": {  # Data Scientist
        "int_4": 3,  # Data Science — perfect match
        "int_1": 2,  # ML — has Python, ML
        "int_8": 2,  # NLP — has Python, ML
        "int_7": 1,  # Cybersecurity — has Python
        "int_2": 0,  # React — no match
        "int_3": 0,  # Full Stack — no match
        "int_5": 0,  # DevOps — no match
        "int_6": 0,  # Android — no match
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# EVALUATION METRICS
# ═══════════════════════════════════════════════════════════════════════════════

def precision_at_k(ranked_ids: List[str], relevant_ids: set, k: int) -> float:
    """Precision@K — Top K mein kitne relevant hain"""
    top_k = ranked_ids[:k]
    relevant_in_k = sum(1 for id in top_k if id in relevant_ids)
    return relevant_in_k / k if k > 0 else 0.0


def recall_at_k(ranked_ids: List[str], relevant_ids: set, k: int) -> float:
    """Recall@K — Relevant items mein se kitne top K mein aaye"""
    top_k = ranked_ids[:k]
    relevant_in_k = sum(1 for id in top_k if id in relevant_ids)
    return relevant_in_k / len(relevant_ids) if relevant_ids else 0.0


def average_precision(ranked_ids: List[str], relevant_ids: set) -> float:
    """AP — Average Precision for a single query"""
    hits = 0
    sum_precision = 0.0
    for i, id in enumerate(ranked_ids):
        if id in relevant_ids:
            hits += 1
            sum_precision += hits / (i + 1)
    return sum_precision / len(relevant_ids) if relevant_ids else 0.0


def ndcg_at_k(ranked_ids: List[str], relevance_map: Dict[str, int], k: int) -> float:
    """NDCG@K — Normalized Discounted Cumulative Gain"""
    # DCG
    dcg = 0.0
    for i, id in enumerate(ranked_ids[:k]):
        rel = relevance_map.get(id, 0)
        dcg += (2**rel - 1) / np.log2(i + 2)  # i+2 because log2(1) = 0
    
    # Ideal DCG
    ideal_rels = sorted(relevance_map.values(), reverse=True)[:k]
    idcg = sum((2**r - 1) / np.log2(i + 2) for i, r in enumerate(ideal_rels))
    
    return dcg / idcg if idcg > 0 else 0.0


def mrr(ranked_ids: List[str], relevant_ids: set) -> float:
    """MRR — Mean Reciprocal Rank (first relevant item kitne position pe hai)"""
    for i, id in enumerate(ranked_ids):
        if id in relevant_ids:
            return 1.0 / (i + 1)
    return 0.0


def f1_at_k(precision: float, recall: float) -> float:
    """F1@K — Harmonic mean of Precision and Recall"""
    if precision + recall == 0:
        return 0.0
    return 2 * (precision * recall) / (precision + recall)


# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENT-LEVEL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def test_skill_overlap():
    """Test Jaccard Skill Overlap accuracy"""
    print("=" * 60)
    print("📊 TEST 1: Skill Overlap (Jaccard Similarity)")
    print("=" * 60)
    
    test_cases = [
        (["python", "react"], ["python", "react"], 1.0),          # Exact match
        (["python", "react"], ["javascript", "angular"], 0.0),    # No overlap
        (["python", "react", "mongodb"], ["python", "react", "nodejs"], 0.5),  # Partial
        (["python"], ["python", "react", "nodejs"], 0.333),       # 1/3
        ([], ["python"], 0.0),                                      # Empty
    ]
    
    correct = 0
    for c_skills, i_skills, expected in test_cases:
        actual = round(_skill_overlap(c_skills, i_skills), 3)
        expected = round(expected, 3)
        match = abs(actual - expected) < 0.01
        correct += match
        status = "✅" if match else "❌"
        print(f"  {status} Skills: {c_skills} vs {i_skills}")
        print(f"     Expected: {expected}, Got: {actual}")
    
    accuracy = correct / len(test_cases) * 100
    print(f"\n  Skill Overlap Accuracy: {accuracy:.0f}% ({correct}/{len(test_cases)})")
    return accuracy


def test_bm25():
    """Test BM25 ranking quality"""
    print("\n" + "=" * 60)
    print("📊 TEST 2: BM25 Keyword Ranking")
    print("=" * 60)
    
    queries_and_expected_top = [
        ("machine learning python tensorflow", "int_1"),
        ("react javascript frontend typescript", "int_2"),
        ("full stack mern nodejs mongodb", "int_3"),
        ("data science sql analysis", "int_4"),
    ]
    
    correct = 0
    for query, expected_top_id in queries_and_expected_top:
        results = rank_bm25(query, TEST_INTERNSHIPS)
        actual_top_id = results[0]["internship"]["_id"] if results else None
        match = actual_top_id == expected_top_id
        correct += match
        status = "✅" if match else "❌"
        print(f"  {status} Query: \"{query}\"")
        print(f"     Expected #1: {expected_top_id}, Got: {actual_top_id}")
        if not match and results:
            print(f"     Top 3: {[r['internship']['_id'] for r in results[:3]]}")
    
    accuracy = correct / len(queries_and_expected_top) * 100
    print(f"\n  BM25 Top-1 Accuracy: {accuracy:.0f}% ({correct}/{len(queries_and_expected_top)})")
    return accuracy


def test_embedding_similarity():
    """Test if embeddings capture semantic similarity"""
    print("\n" + "=" * 60)
    print("📊 TEST 3: Embedding Semantic Similarity")
    print("=" * 60)
    
    # Pairs that should be similar
    similar_pairs = [
        ("machine learning engineer python", "deep learning AI researcher tensorflow"),
        ("react frontend developer", "javascript UI engineer"),
        ("data science analytics", "data analysis statistics ML"),
    ]
    
    # Pairs that should be dissimilar
    dissimilar_pairs = [
        ("machine learning python", "android kotlin mobile development"),
        ("react frontend UI", "cybersecurity penetration testing"),
        ("data science statistics", "devops docker kubernetes"),
    ]
    
    from numpy.linalg import norm
    
    correct = 0
    total = 0
    
    print("  Similar pairs (should have HIGH similarity):")
    sim_scores = []
    for t1, t2 in similar_pairs:
        e1 = np.array(embedder.encode_one(t1))
        e2 = np.array(embedder.encode_one(t2))
        sim = float(np.dot(e1, e2) / (norm(e1) * norm(e2)))
        sim_scores.append(sim)
        status = "✅" if sim > 0.4 else "❌"
        correct += sim > 0.4
        total += 1
        print(f"    {status} \"{t1}\" ↔ \"{t2}\": {sim:.4f}")
    
    print("\n  Dissimilar pairs (should have LOW similarity):")
    dissim_scores = []
    for t1, t2 in dissimilar_pairs:
        e1 = np.array(embedder.encode_one(t1))
        e2 = np.array(embedder.encode_one(t2))
        sim = float(np.dot(e1, e2) / (norm(e1) * norm(e2)))
        dissim_scores.append(sim)
        status = "✅" if sim < 0.4 else "❌"
        correct += sim < 0.4
        total += 1
        print(f"    {status} \"{t1}\" ↔ \"{t2}\": {sim:.4f}")
    
    avg_sim = np.mean(sim_scores)
    avg_dissim = np.mean(dissim_scores)
    accuracy = correct / total * 100
    
    print(f"\n  Avg Similar Score:    {avg_sim:.4f}")
    print(f"  Avg Dissimilar Score: {avg_dissim:.4f}")
    print(f"  Separation Gap:      {avg_sim - avg_dissim:.4f}")
    print(f"  Embedding Accuracy:   {accuracy:.0f}% ({correct}/{total})")
    return accuracy


# ═══════════════════════════════════════════════════════════════════════════════
# FULL PIPELINE EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════

def test_full_pipeline():
    """Test the complete ranking pipeline with ground truth"""
    print("\n" + "=" * 60)
    print("📊 TEST 4: Full Ranking Pipeline (End-to-End)")
    print("=" * 60)
    
    K_VALUES = [1, 3, 5]
    
    all_precision = {k: [] for k in K_VALUES}
    all_recall = {k: [] for k in K_VALUES}
    all_ndcg = {k: [] for k in K_VALUES}
    all_f1 = {k: [] for k in K_VALUES}
    all_ap = []
    all_mrr = []
    
    for candidate in TEST_CANDIDATES:
        cand_id = candidate["_id"]
        relevance_map = GROUND_TRUTH[cand_id]
        relevant_ids = {id for id, rel in relevance_map.items() if rel >= 2}
        
        print(f"\n  👤 {candidate['name']} ({cand_id})")
        print(f"     Skills: {candidate['skills']}")
        print(f"     Relevant internships: {relevant_ids}")
        
        # Generate candidate embedding
        profile_text = " ".join(candidate["skills"]) + " " + candidate.get("bio", "")
        candidate_emb = embedder.encode_one(profile_text)
        
        # ChromaDB ANN (if internships are indexed)
        ann_results = chroma.query_internships(
            query_embedding=candidate_emb,
            n_results=len(TEST_INTERNSHIPS),
        )
        
        # Full ranking
        ranked = rank_internships(
            candidate=candidate,
            internships=TEST_INTERNSHIPS,
            ann_results=ann_results,
            query="",
            top_n=len(TEST_INTERNSHIPS),
        )
        
        ranked_ids = [r["internship"]["_id"] for r in ranked]
        
        # Print rankings
        for i, r in enumerate(ranked):
            iid = r["internship"]["_id"]
            gt_rel = relevance_map.get(iid, 0)
            rel_marker = "⭐" * gt_rel if gt_rel > 0 else "  "
            print(f"     #{i+1} {iid} — score={r['rankScore']:.4f} "
                  f"(bm25={r['bm25Score']:.2f} ann={r['similarityScore']:.2f} "
                  f"skill={r['skillOverlapScore']:.2f} loc={r['locationScore']:.2f}) "
                  f"[GT: {rel_marker}]")
        
        # Calculate metrics
        for k in K_VALUES:
            p = precision_at_k(ranked_ids, relevant_ids, k)
            r = recall_at_k(ranked_ids, relevant_ids, k)
            n = ndcg_at_k(ranked_ids, relevance_map, k)
            f = f1_at_k(p, r)
            all_precision[k].append(p)
            all_recall[k].append(r)
            all_ndcg[k].append(n)
            all_f1[k].append(f)
        
        ap = average_precision(ranked_ids, relevant_ids)
        m = mrr(ranked_ids, relevant_ids)
        all_ap.append(ap)
        all_mrr.append(m)
    
    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("📈 FINAL RESULTS — Ranking Pipeline Metrics")
    print("=" * 60)
    
    print(f"\n  {'Metric':<25} ", end="")
    for k in K_VALUES:
        print(f"{'@'+str(k):<10}", end="")
    print()
    print("  " + "-" * 55)
    
    for name, values in [
        ("Precision", all_precision),
        ("Recall", all_recall),
        ("NDCG", all_ndcg),
        ("F1-Score", all_f1),
    ]:
        print(f"  {name:<25} ", end="")
        for k in K_VALUES:
            avg = np.mean(values[k])
            print(f"{avg:.4f}    ", end="")
        print()
    
    map_score = np.mean(all_ap)
    mrr_score = np.mean(all_mrr)
    
    print(f"\n  {'MAP (Mean Avg Precision)':<25}  {map_score:.4f}")
    print(f"  {'MRR (Mean Recip. Rank)':<25}  {mrr_score:.4f}")
    
    return {
        "precision@3": np.mean(all_precision[3]),
        "recall@3": np.mean(all_recall[3]),
        "ndcg@3": np.mean(all_ndcg[3]),
        "map": map_score,
        "mrr": mrr_score,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RUN ALL TESTS
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🧪 RecoMinds ML Backend — Evaluation Suite")
    print("=" * 60)
    
    results = {}
    
    # Component tests
    results["skill_overlap_accuracy"] = test_skill_overlap()
    results["bm25_accuracy"] = test_bm25()
    results["embedding_accuracy"] = test_embedding_similarity()
    
    # Full pipeline test
    pipeline_results = test_full_pipeline()
    results.update(pipeline_results)
    
    # ── Final Summary ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("🏆 OVERALL EVALUATION SUMMARY")
    print("=" * 60)
    print(f"""
  ┌─────────────────────────────────┬──────────┐
  │ Metric                          │ Score    │
  ├─────────────────────────────────┼──────────┤
  │ Skill Overlap Accuracy          │ {results['skill_overlap_accuracy']:>5.1f}%  │
  │ BM25 Top-1 Accuracy            │ {results['bm25_accuracy']:>5.1f}%  │
  │ Embedding Similarity Accuracy   │ {results['embedding_accuracy']:>5.1f}%  │
  │ Precision@3                     │ {results['precision@3']:>6.4f} │
  │ Recall@3                        │ {results['recall@3']:>6.4f} │
  │ NDCG@3                          │ {results['ndcg@3']:>6.4f} │
  │ MAP                             │ {results['map']:>6.4f} │
  │ MRR                             │ {results['mrr']:>6.4f} │
  └─────────────────────────────────┴──────────┘
    """)
    
    print("📖 Metrics Explained:")
    print("  • Precision@K  = Top K results mein se kitne relevant the")
    print("  • Recall@K     = Total relevant items mein se kitne top K mein aaye")
    print("  • NDCG@K       = Ranking quality (position-aware, higher = better)")
    print("  • MAP          = Mean Average Precision across all queries")
    print("  • MRR          = First relevant result kitne jaldi aaya")
    print("  • F1           = Precision aur Recall ka harmonic mean")
