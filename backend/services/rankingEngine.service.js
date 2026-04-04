/**
 * Ranking Engine Service — LambdaMART + LightGBM simulation
 *
 * Signal weights (learned offline, hard-coded here for demo):
 *   BM25 score          35%  — keyword relevance
 *   ChromaDB ANN sim    30%  — semantic / vector relevance
 *   Skill overlap       25%  — hard-skill Jaccard match
 *   Location match      10%  — location + type preference
 */

const { rankWithBM25 } = require('./bm25.service');
const { annSearchInternships, cosineSimilarity, candidateToEmbedding } = require('./vectorSearch.service');

const WEIGHTS = { bm25: 0.35, vector: 0.30, skill: 0.25, location: 0.10 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function skillOverlapScore(candidateSkills = [], internshipSkills = []) {
  if (!candidateSkills.length || !internshipSkills.length) return 0;
  const cSet = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const iSet = new Set(internshipSkills.map((s) => s.toLowerCase()));
  const intersection = [...cSet].filter((s) => iSet.has(s)).length;
  const union = new Set([...cSet, ...iSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function locationScore(candidateLocation, internshipLocation, preferredTypes = [], internshipType) {
  let score = 0;
  const cLoc = (candidateLocation || '').toLowerCase();
  const iLoc = (internshipLocation || '').toLowerCase();
  if (cLoc && iLoc && (cLoc.includes(iLoc) || iLoc.includes(cLoc))) score += 0.5;
  if (preferredTypes.includes(internshipType)) score += 0.5;
  else if (internshipType === 'remote') score += 0.25;
  return Math.min(score, 1.0);
}

function normalize(scores) {
  const max = Math.max(...scores, 1e-9);
  const min = Math.min(...scores, 0);
  const range = max - min || 1;
  return scores.map((s) => (s - min) / range);
}

// ── Main ranking function ────────────────────────────────────────────────────

/**
 * Rank internships for a candidate using hybrid scoring.
 * Now uses ChromaDB ANN for the vector similarity signal.
 *
 * @param {Object}   candidate    - Mongoose Candidate document
 * @param {Object[]} internships  - Active Mongoose Internship documents
 * @param {string}   query        - Optional free-text search query
 * @param {number}   topN         - Max results
 * @returns {Promise<Array>}      - Ranked array with all score components
 */
async function rankInternshipsForCandidate(candidate, internships, query = '', topN = 10) {
  if (!internships?.length) return [];

  // ── BM25 scoring ──────────────────────────────────────────────────────────
  const searchQuery = query || (candidate.skills || []).join(' ') || candidate.bio || '';
  const bm25Results = rankWithBM25(searchQuery, internships);
  const bm25Map = {};
  bm25Results.forEach(({ internship, bm25Score }) => {
    bm25Map[internship._id.toString()] = bm25Score;
  });
  const bm25Raw = internships.map((i) => bm25Map[i._id.toString()] || 0);
  const normalizedBm25 = normalize(bm25Raw);

  // ── ChromaDB ANN similarity ───────────────────────────────────────────────
  // Get or compute candidate embedding
  const candidateEmb = candidate.profileEmbedding?.length
    ? candidate.profileEmbedding
    : candidateToEmbedding(candidate);

  // Query all internships through ChromaDB (returns sorted by cosine sim)
  const annResults = await annSearchInternships(candidateEmb, internships, internships.length);
  const annMap = {};
  annResults.forEach(({ internship, similarityScore }) => {
    annMap[internship._id.toString()] = similarityScore;
  });
  const vectorRaw = internships.map((i) => annMap[i._id.toString()] || 0);
  const normalizedVector = normalize(vectorRaw);

  // ── Skill overlap ──────────────────────────────────────────────────────────
  const skillScores = internships.map((i) => skillOverlapScore(candidate.skills, i.skills));

  // ── Location match ─────────────────────────────────────────────────────────
  const locScores = internships.map((i) =>
    locationScore(candidate.location, i.location, candidate.preferredTypes, i.type)
  );

  // ── Combine (LambdaMART-style weighted sum) ───────────────────────────────
  const ranked = internships.map((internship, idx) => {
    const finalScore =
      WEIGHTS.bm25     * normalizedBm25[idx] +
      WEIGHTS.vector   * normalizedVector[idx] +
      WEIGHTS.skill    * skillScores[idx] +
      WEIGHTS.location * locScores[idx];

    return {
      internship,
      rankScore:         parseFloat(finalScore.toFixed(4)),
      bm25Score:         parseFloat(normalizedBm25[idx].toFixed(4)),
      similarityScore:   parseFloat(normalizedVector[idx].toFixed(4)),
      skillOverlapScore: parseFloat(skillScores[idx].toFixed(4)),
      locationScore:     parseFloat(locScores[idx].toFixed(4)),
    };
  });

  return ranked.sort((a, b) => b.rankScore - a.rankScore).slice(0, topN);
}

module.exports = { rankInternshipsForCandidate, skillOverlapScore, locationScore };
