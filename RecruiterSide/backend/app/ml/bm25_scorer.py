"""BM25 Keyword Scorer — relevance scoring based on term frequency."""
import re
import math
from typing import List, Dict
from collections import Counter


class BM25Scorer:
    """BM25 (Okapi BM25) implementation for keyword matching."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def _tokenize(self, text: str) -> List[str]:
        """Simple whitespace + punctuation tokenizer."""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        # Remove stopwords (minimal set)
        stopwords = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'can', 'shall',
            'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
            'and', 'or', 'but', 'not', 'this', 'that', 'it', 'as',
        }
        return [t for t in tokens if t not in stopwords and len(t) > 1]

    def score(self, query: str, document: str) -> float:
        """Calculate BM25 score for a single document against a query."""
        query_tokens = self._tokenize(query)
        doc_tokens = self._tokenize(document)

        if not query_tokens or not doc_tokens:
            return 0.0

        doc_len = len(doc_tokens)
        avg_dl = doc_len  # single document scoring
        tf_map = Counter(doc_tokens)

        score = 0.0
        for term in query_tokens:
            tf = tf_map.get(term, 0)
            if tf == 0:
                continue
            # IDF approximation (single doc)
            idf = math.log(2.0)  # simplified for single-doc
            numerator = tf * (self.k1 + 1)
            denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / max(avg_dl, 1)))
            score += idf * (numerator / denominator)

        return round(score, 4)

    def score_batch(self, query: str, documents: List[Dict]) -> List[Dict]:
        """
        Score multiple documents against a query.
        Each document dict must have 'text' and 'id' keys.
        Returns sorted list with scores.
        """
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return [{"id": d["id"], "score": 0.0} for d in documents]

        # Compute corpus-level stats for proper IDF
        doc_count = len(documents)
        doc_tokens_list = [self._tokenize(d["text"]) for d in documents]
        avg_dl = sum(len(dt) for dt in doc_tokens_list) / max(doc_count, 1)

        # Document frequency for IDF
        df = Counter()
        for dt in doc_tokens_list:
            unique_terms = set(dt)
            for term in unique_terms:
                df[term] += 1

        results = []
        for doc, doc_tokens in zip(documents, doc_tokens_list):
            if not doc_tokens:
                results.append({"id": doc["id"], "score": 0.0})
                continue

            tf_map = Counter(doc_tokens)
            doc_len = len(doc_tokens)
            score = 0.0

            for term in query_tokens:
                tf = tf_map.get(term, 0)
                if tf == 0:
                    continue
                idf = math.log((doc_count - df.get(term, 0) + 0.5) / (df.get(term, 0) + 0.5) + 1)
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / max(avg_dl, 1)))
                score += idf * (numerator / denominator)

            results.append({"id": doc["id"], "score": round(score, 4)})

        results.sort(key=lambda x: x["score"], reverse=True)
        return results


# Singleton instance
bm25_scorer = BM25Scorer()
