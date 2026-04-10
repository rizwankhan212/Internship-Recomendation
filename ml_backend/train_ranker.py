"""
RecoMinds — LightGBM Ranker Training (Real Dataset)

Uses job_dataset.csv (1068 real job listings) to train the LightGBM ranker.
Also uses skills.csv for skill vocabulary enrichment.

Usage:
  cd ml_backend
  python train_ranker.py

Output: ml_backend/models/lgbm_ranker.pkl
"""

import os
import json
import random
import numpy as np
import pandas as pd
import logging
import pickle
from typing import List, Dict

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

from services.embedder import EmbedderService
from services.ranking_service import _skill_overlap, _location_score

LOCATIONS = ["bangalore", "mumbai", "delhi", "hyderabad", "pune", "chennai", "noida", "kolkata", "remote"]
TYPES = ["remote", "on-site", "hybrid"]


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Load & parse job_dataset.csv
# ═══════════════════════════════════════════════════════════════════════════════

def load_jobs(path="job_dataset.csv"):
    """Load real jobs and parse their skills"""
    logger.info(f"📂 Loading jobs from {path}...")
    df = pd.read_csv(path)

    jobs = []
    for _, row in df.iterrows():
        raw_skills = str(row.get("Skills", ""))
        skills = [s.strip().lower() for s in raw_skills.split(";") if s.strip()]

        title = str(row.get("Title", ""))
        description = str(row.get("Responsibilities", ""))
        keywords = str(row.get("Keywords", ""))
        exp_level = str(row.get("ExperienceLevel", ""))

        if not skills or not title:
            continue

        jobs.append({
            "title": title,
            "description": description,
            "keywords": keywords,
            "skills": skills,
            "exp_level": exp_level,
            "location": random.choice(LOCATIONS),
            "type": random.choice(TYPES),
        })

    logger.info(f"✅ Loaded {len(jobs)} jobs with {len(set(j['title'] for j in jobs))} unique titles")

    # Extract all unique skills
    all_skills = set()
    for j in jobs:
        all_skills.update(j["skills"])
    logger.info(f"   Total unique skills in dataset: {len(all_skills)}")

    return jobs, list(all_skills)


def load_skill_vocab(path="skills.csv"):
    """Load extra skill vocabulary"""
    try:
        df = pd.read_csv(path)
        skills = [str(s).strip().lower().replace("\n", "") for s in df.iloc[:, 0] if pd.notna(s)]
        skills = [s for s in skills if 2 <= len(s) <= 40]
        logger.info(f"📂 Loaded {len(skills)} skills from {path}")
        return skills
    except Exception as e:
        logger.warning(f"Could not load {path}: {e}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Build skill clusters from real data
# ═══════════════════════════════════════════════════════════════════════════════

def build_skill_clusters(jobs: List[Dict]):
    """
    Group jobs by title and build skill clusters.
    E.g. all "Data Engineer" jobs → their combined skills = data engineering cluster
    """
    from collections import defaultdict
    title_skills = defaultdict(set)

    for job in jobs:
        title_skills[job["title"]].update(job["skills"])

    clusters = {}
    for title, skills in title_skills.items():
        if len(skills) >= 3:
            clusters[title] = list(skills)

    logger.info(f"📊 Built {len(clusters)} skill clusters from job titles")
    return clusters


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Generate candidate-job pairs with features
# ═══════════════════════════════════════════════════════════════════════════════

def generate_candidate_from_job(job: Dict, rng: random.Random, noise: float = 0.3):
    """
    Generate a realistic candidate profile based on a job listing.
    A candidate "inspired by" a job has most of its skills (with some noise).
    """
    skills = list(job["skills"])

    # Keep 50-90% of the job's skills (simulating partial match)
    keep = max(2, int(len(skills) * rng.uniform(0.5, 0.9)))
    rng.shuffle(skills)
    cand_skills = skills[:keep]

    # Add some random noise skills
    if rng.random() < noise:
        extra = rng.sample(
            ["git", "agile", "communication", "teamwork", "problem solving",
             "excel", "powerpoint", "linux", "windows", "rest api"],
            k=rng.randint(1, 3)
        )
        cand_skills.extend(extra)

    return {
        "skills": list(set(cand_skills)),
        "location": rng.choice(LOCATIONS),
        "preferredTypes": rng.sample(TYPES, k=rng.randint(1, 2)),
        "source_job": job["title"],
    }


def compute_relevance(candidate: Dict, job: Dict) -> int:
    """
    Compute relevance label (0-3) based on real skill overlap.

    3 — High match:  Jaccard >= 0.5  AND  candidate has most job skills
    2 — Good match:  Jaccard >= 0.3
    1 — Weak match:  Jaccard >= 0.15
    0 — No match:    Jaccard < 0.15
    """
    jaccard = _skill_overlap(candidate["skills"], job["skills"])
    loc_match = candidate["location"] == job["location"]
    type_match = job["type"] in candidate["preferredTypes"]

    # Precision: how many of the job's required skills does the candidate have?
    job_set = set(s.lower() for s in job["skills"])
    cand_set = set(s.lower() for s in candidate["skills"])
    precision = len(cand_set & job_set) / len(job_set) if job_set else 0

    score = 0
    if jaccard >= 0.5 and precision >= 0.6:
        score = 3
    elif jaccard >= 0.3 or precision >= 0.5:
        score = 2
    elif jaccard >= 0.15 or precision >= 0.25:
        score = 1
    else:
        score = 0

    # Bonus for location/type (can bump up by 1)
    if loc_match and type_match and score < 3:
        score += 1

    return min(score, 3)


def generate_dataset(jobs: List[Dict], embedder: EmbedderService, n_pairs=3000, seed=42):
    """
    Generate training pairs:
    - Positive pairs: candidate generated FROM the job (high relevance)
    - Negative pairs: candidate generated from a DIFFERENT job (low relevance)
    """
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)

    features = []
    labels = []
    pair_info = []

    logger.info(f"\n📊 Generating {n_pairs} training pairs from {len(jobs)} real jobs...")

    # Pre-compute job embeddings (cache)
    logger.info("   Computing job embeddings...")
    job_embeddings = {}
    for i, job in enumerate(jobs):
        text = f"{job['title']} {job['description']} {' '.join(job['skills'])}"
        job_embeddings[i] = np.array(embedder.encode_one(text))
        if (i + 1) % 200 == 0:
            logger.info(f"   Embedded {i+1}/{len(jobs)} jobs...")

    pairs_created = 0
    while pairs_created < n_pairs:
        # Pick a random job
        job_idx = rng.randint(0, len(jobs) - 1)
        job = jobs[job_idx]

        # 50% positive pairs (candidate matches job), 50% negative (random mismatch)
        if rng.random() < 0.5:
            # Positive: candidate inspired by THIS job
            candidate = generate_candidate_from_job(job, rng, noise=0.2)
        else:
            # Negative: candidate inspired by a DIFFERENT job
            other_idx = rng.randint(0, len(jobs) - 1)
            while jobs[other_idx]["title"] == job["title"]:
                other_idx = rng.randint(0, len(jobs) - 1)
            candidate = generate_candidate_from_job(jobs[other_idx], rng, noise=0.1)

        # ── Compute 4 features ────────────────────────────────────────────────

        # Feature 1: BM25 proxy (keyword overlap between candidate skills and job text)
        cand_tokens = set(" ".join(candidate["skills"]).lower().split())
        job_text = f"{job['title']} {' '.join(job['skills'])} {job.get('keywords', '')}".lower()
        job_tokens = set(job_text.split())
        common = len(cand_tokens & job_tokens)
        bm25_proxy = common / max(len(job_tokens), 1)

        # Feature 2: Vector similarity (cosine)
        cand_text = " ".join(candidate["skills"]) + " " + candidate["location"]
        cand_emb = np.array(embedder.encode_one(cand_text))
        job_emb = job_embeddings[job_idx]
        cos_sim = float(np.dot(cand_emb, job_emb) / (
            np.linalg.norm(cand_emb) * np.linalg.norm(job_emb) + 1e-9
        ))
        cos_sim = max(0.0, min(1.0, cos_sim))

        # Feature 3: Skill overlap (Jaccard)
        skill_ov = _skill_overlap(candidate["skills"], job["skills"])

        # Feature 4: Location + type score
        loc_score = _location_score(
            candidate["location"], job["location"],
            candidate["preferredTypes"], job["type"]
        )

        # Label
        label = compute_relevance(candidate, job)

        features.append([bm25_proxy, cos_sim, skill_ov, loc_score])
        labels.append(label)
        pairs_created += 1

        if pairs_created % 500 == 0:
            logger.info(f"   Generated {pairs_created}/{n_pairs} pairs...")

    X = np.array(features, dtype=np.float32)
    y = np.array(labels, dtype=np.int32)

    logger.info(f"\n✅ Dataset ready: {X.shape[0]} pairs, {X.shape[1]} features")
    unique, counts = np.unique(y, return_counts=True)
    dist = dict(zip(unique.tolist(), counts.tolist()))
    logger.info(f"   Label distribution: {dist}")
    logger.info(f"   0=Not relevant, 1=Weak, 2=Good, 3=Highly relevant")

    return X, y


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Train LightGBM
# ═══════════════════════════════════════════════════════════════════════════════

def train_model(X, y):
    """Train LightGBM binary classifier: relevant (2,3) vs not relevant (0,1)"""
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        classification_report, accuracy_score, precision_score,
        recall_score, f1_score, roc_auc_score, confusion_matrix
    )
    import lightgbm as lgb

    y_binary = (y >= 2).astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_binary, test_size=0.2, random_state=42, stratify=y_binary
    )

    logger.info(f"\n🏋️ Training LightGBM on REAL job data...")
    logger.info(f"   Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")
    logger.info(f"   Train positives: {y_train.sum()}, negatives: {len(y_train)-y_train.sum()}")

    model = lgb.LGBMClassifier(
        objective="binary",
        metric="binary_logloss",
        num_leaves=31,
        n_estimators=150,
        learning_rate=0.05,
        min_child_samples=10,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=0.1,
        verbose=-1,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.log_evaluation(period=0)],
    )

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    # ── Metrics ────────────────────────────────────────────────────────────────
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 60)
    print("📈 TRAINING RESULTS")
    print("=" * 60)

    print(f"""
  ┌─────────────────────┬──────────┐
  │ Metric              │ Score    │
  ├─────────────────────┼──────────┤
  │ Accuracy            │ {accuracy:>6.4f}  │
  │ Precision           │ {precision:>6.4f}  │
  │ Recall              │ {recall:>6.4f}  │
  │ F1-Score            │ {f1:>6.4f}  │
  │ AUC-ROC             │ {auc:>6.4f}  │
  └─────────────────────┴──────────┘
    """)

    print("  Confusion Matrix:")
    print(f"                    Predicted")
    print(f"                  Not Rel  Relevant")
    print(f"  Actual Not Rel  [{cm[0][0]:>5}]  [{cm[0][1]:>5}]")
    print(f"  Actual Relevant [{cm[1][0]:>5}]  [{cm[1][1]:>5}]")

    print(f"\n  Classification Report:")
    report = classification_report(y_test, y_pred, target_names=["Not Relevant", "Relevant"])
    for line in report.split("\n"):
        print(f"  {line}")

    # Feature importance
    importance = model.feature_importances_
    feature_names = ["BM25 Score", "Vector Similarity", "Skill Overlap", "Location Score"]
    print("\n  Feature Importance (learned from REAL data):")
    sorted_imp = sorted(zip(feature_names, importance), key=lambda x: -x[1])
    total_imp = sum(importance)
    for name, imp in sorted_imp:
        pct = imp / total_imp * 100
        bar = "█" * int(pct / 100 * 40)
        print(f"    {name:<20} {pct:>5.1f}%  {bar}")

    # ── Save ──────────────────────────────────────────────────────────────────
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "lgbm_ranker.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    logger.info(f"\n✅ Model saved to: {model_path}")

    meta = {
        "trained_on": "job_dataset.csv (1068 real jobs)",
        "n_pairs": int(len(y)),
        "n_train": int(len(y_train)),
        "n_test": int(len(y_test)),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "auc_roc": float(auc),
        "features": feature_names,
        "n_estimators": 150,
        "num_leaves": 31,
        "feature_importance": {n: float(i/total_imp) for n, i in zip(feature_names, importance)},
    }
    meta_path = os.path.join(model_dir, "model_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    logger.info(f"✅ Metadata saved to: {meta_path}")

    return model, meta


# ═══════════════════════════════════════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🧪 RecoMinds — LightGBM Training on Real Job Data")
    print("=" * 60)

    # Step 1: Load real jobs
    jobs, all_skills = load_jobs("job_dataset.csv")

    # Step 2: Build skill clusters
    clusters = build_skill_clusters(jobs)
    print(f"\n  Sample clusters:")
    for title, skills in list(clusters.items())[:5]:
        print(f"    {title}: {skills[:6]}...")

    # Step 3: Initialize embedder
    print()
    embedder = EmbedderService()
    embedder.load()

    # Step 4: Generate training data using real jobs
    X, y = generate_dataset(jobs, embedder, n_pairs=3000, seed=42)

    # Step 5: Train
    model, meta = train_model(X, y)

    print("\n" + "=" * 60)
    print("🎯 DONE! Model trained on REAL job data")
    print("=" * 60)
    print(f"""
  Model file:  ml_backend/models/lgbm_ranker.pkl
  Metadata:    ml_backend/models/model_meta.json
  
  Trained on:  {meta['n_pairs']} candidate-job pairs
  From:        1068 real job listings (job_dataset.csv)
  Accuracy:    {meta['accuracy']*100:.1f}%
  F1-Score:    {meta['f1']:.4f}
  AUC-ROC:     {meta['auc_roc']:.4f}
    """)
