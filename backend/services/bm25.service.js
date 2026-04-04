/**
 * BM25 Service — Term Frequency scoring for internship retrieval
 * Classic BM25 ranking function: k1=1.5, b=0.75
 */

const k1 = 1.5;
const b = 0.75;

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function buildCorpus(internships) {
  return internships.map((doc) => {
    const text = [doc.title, doc.description, ...(doc.skills || []), doc.location, doc.type].join(' ');
    return tokenize(text);
  });
}

function computeIDF(corpus) {
  const N = corpus.length;
  const df = {};
  corpus.forEach((doc) => {
    const uniqueTerms = new Set(doc);
    uniqueTerms.forEach((term) => {
      df[term] = (df[term] || 0) + 1;
    });
  });
  const idf = {};
  Object.entries(df).forEach(([term, count]) => {
    idf[term] = Math.log((N - count + 0.5) / (count + 0.5) + 1);
  });
  return idf;
}

function bm25Score(queryTokens, docTokens, idf, avgDocLen) {
  const docLen = docTokens.length;
  const tf = {};
  docTokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });

  let score = 0;
  queryTokens.forEach((term) => {
    if (!idf[term]) return;
    const termFreq = tf[term] || 0;
    const numerator = termFreq * (k1 + 1);
    const denominator = termFreq + k1 * (1 - b + b * (docLen / avgDocLen));
    score += idf[term] * (numerator / denominator);
  });
  return score;
}

/**
 * Rank internships against a query using BM25
 * @param {string} query - search query
 * @param {Array} internships - array of internship documents
 * @returns {Array} internships with bm25Score, sorted descending
 */
function rankWithBM25(query, internships) {
  if (!internships || internships.length === 0) return [];

  const corpus = buildCorpus(internships);
  const idf = computeIDF(corpus);
  const avgDocLen = corpus.reduce((sum, doc) => sum + doc.length, 0) / corpus.length;
  const queryTokens = tokenize(query);

  const scored = internships.map((internship, idx) => ({
    internship,
    bm25Score: bm25Score(queryTokens, corpus[idx], idf, avgDocLen),
  }));

  return scored.sort((a, b) => b.bm25Score - a.bm25Score);
}

module.exports = { rankWithBM25, tokenize };
