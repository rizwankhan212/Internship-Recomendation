/**
 * ML Client Service — Express-side HTTP client for the Python FastAPI ML backend.
 *
 * All AI/ML operations (embedding, BM25, ChromaDB ANN, LightGBM ranking,
 * Greedy/ILP allocation) are handled by the Python backend at ML_BACKEND_URL.
 *
 * This service provides typed wrappers with graceful fallbacks so the
 * Express server still works even if the Python backend is temporarily down.
 */

const axios = require('axios');

const ML_URL = process.env.ML_BACKEND_URL || 'http://localhost:8001';
let mlAvailable = false;

// Lightweight axios instance for internal calls
const ml = axios.create({
  baseURL:        ML_URL,
  timeout:        15000,  // 15s — ranking can take a moment
  headers:        { 'Content-Type': 'application/json' },
});

// ── Connection check ──────────────────────────────────────────────────────────
async function checkMLBackend() {
  try {
    const res = await ml.get('/health');
    mlAvailable = res.data?.status === 'ok';
    if (mlAvailable) {
      const { embedder, chromadb } = res.data;
      console.log(`✅ Python ML Backend connected at ${ML_URL}`);
      console.log(`   Embedder:  ${embedder.model} (dim=${embedder.dim})`);
      console.log(`   ChromaDB:  ${chromadb.ready ? 'ready' : 'not ready'}`);
    }
  } catch (err) {
    mlAvailable = false;
    console.warn(`⚠️  Python ML Backend unavailable at ${ML_URL}`);
    console.warn('   Start with: cd ml_backend && uvicorn main:app --port 8001');
  }
  return mlAvailable;
}

// ── Embedding ──────────────────────────────────────────────────────────────────
async function embedText(text) {
  if (!mlAvailable) return null;
  try {
    const res = await ml.post('/api/embed/one', { text });
    return res.data.embedding;
  } catch (err) {
    console.error('ML embed error:', err.message);
    return null;
  }
}

// ── ChromaDB upsert / delete ──────────────────────────────────────────────────

async function upsertInternshipEmbedding(internship) {
  const payload = {
    id:          internship._id.toString(),
    title:       internship.title       || '',
    description: internship.description || '',
    company:     internship.company     || '',
    location:    internship.location    || '',
    type:        internship.type        || '',
    skills:      internship.skills      || [],
    isActive:    !!internship.isActive,
  };

  if (!mlAvailable) return null;
  try {
    const res = await ml.post('/api/chroma/upsert/internship', payload);
    return res.data;
  } catch (err) {
    console.error('ML upsert internship error:', err.message);
    return null;
  }
}

async function upsertCandidateEmbedding(candidate) {
  const payload = {
    id:             candidate._id.toString(),
    name:           candidate.name           || '',
    skills:         candidate.skills         || [],
    location:       candidate.location       || '',
    bio:            candidate.bio            || '',
    degree:         candidate.degree         || '',
    preferredTypes: candidate.preferredTypes || [],
  };

  if (!mlAvailable) return null;
  try {
    const res = await ml.post('/api/chroma/upsert/candidate', payload);
    return res.data;
  } catch (err) {
    console.error('ML upsert candidate error:', err.message);
    return null;
  }
}

async function deleteInternshipEmbedding(internshipId) {
  if (!mlAvailable) return;
  try {
    await ml.delete(`/api/chroma/internship/${internshipId}`);
  } catch (err) {
    console.error('ML delete internship error:', err.message);
  }
}

// ── Hybrid Ranking ────────────────────────────────────────────────────────────

/**
 * Rank internships for a candidate using the full Python ML pipeline:
 * BM25 + ChromaDB ANN + LightGBM
 *
 * @param {Object}   candidate    - Mongoose candidate document (plain object)
 * @param {Object[]} internships  - Array of internship objects (plain, _id as string)
 * @param {string}   query        - Optional free-text search query
 * @param {number}   topN         - Max results
 * @returns {Promise<Array>}      - Ranked results with all score components
 */
async function rankInternships(candidate, internships, query = '', topN = 10) {
  if (!internships?.length) return [];

  // Serialize for HTTP
  const candidatePayload = {
    _id:              candidate._id?.toString() || '',
    skills:           candidate.skills         || [],
    location:         candidate.location       || '',
    preferredTypes:   candidate.preferredTypes || [],
    bio:              candidate.bio            || '',
    profileEmbedding: candidate.profileEmbedding || null,
  };

  const internshipsPayload = internships.map((i) => ({
    _id:         i._id?.toString() || '',
    title:       i.title       || '',
    description: i.description || '',
    company:     i.company     || '',
    location:    i.location    || '',
    type:        i.type        || '',
    skills:      i.skills      || [],
    stipend:     i.stipend     || 0,
    openings:    i.openings    || 1,
    duration:    i.duration    || '',
    isActive:    !!i.isActive,
  }));

  if (!mlAvailable) {
    // Fallback: local cosine similarity + simple scoring
    console.warn('ML backend offline — using local fallback scoring');
    return localFallbackRank(candidate, internships, topN);
  }

  try {
    const res = await ml.post('/api/rank', {
      candidate:   candidatePayload,
      internships: internshipsPayload,
      query,
      top_n:       topN,
    });

    // Map ranked results back to Mongoose documents
    const idToDoc = {};
    internships.forEach((i) => { idToDoc[i._id.toString()] = i; });

    return (res.data.ranked || []).map((r) => ({
      internship:       idToDoc[r.internship?._id] || r.internship,
      rankScore:        r.rankScore,
      bm25Score:        r.bm25Score,
      similarityScore:  r.similarityScore,
      skillOverlapScore:r.skillOverlapScore,
      locationScore:    r.locationScore,
    }));
  } catch (err) {
    console.error('ML rank error:', err.message);
    return localFallbackRank(candidate, internships, topN);
  }
}

// ── Shortlisting ──────────────────────────────────────────────────────────────

async function shortlistGreedy(applications, quota = 20) {
  if (!mlAvailable) {
    return [...applications].sort((a, b) => b.rankScore - a.rankScore).slice(0, quota);
  }
  try {
    const payload = {
      applications: applications.map((a) => ({
        _id:        a._id.toString(),
        candidate:  a.candidate?._id?.toString() || a.candidate.toString(),
        internship: a.internship?._id?.toString() || a.internship.toString(),
        rankScore:  a.rankScore || 0,
      })),
      quota,
    };
    const res = await ml.post('/api/shortlist/greedy', payload);
    const shortlistedIds = new Set(res.data.shortlisted || []);
    return applications.filter((a) => shortlistedIds.has(a._id.toString()))
                       .sort((a, b) => b.rankScore - a.rankScore);
  } catch (err) {
    console.error('ML shortlist error:', err.message);
    return [...applications].sort((a, b) => b.rankScore - a.rankScore).slice(0, quota);
  }
}

async function batchILPAllocate(applications, quotaMap) {
  if (!mlAvailable) {
    return { selected: [], allocations: {} };
  }
  try {
    const payload = {
      applications: applications.map((a) => ({
        _id:        a._id.toString(),
        candidate:  a.candidate?._id?.toString() || a.candidate.toString(),
        internship: a.internship?._id?.toString() || a.internship.toString(),
        rankScore:  a.rankScore || 0,
      })),
      quota_map: quotaMap,
    };
    const res = await ml.post('/api/shortlist/ilp', payload);
    return res.data;
  } catch (err) {
    console.error('ML ILP error:', err.message);
    return { selected: [], allocations: {} };
  }
}

// ── ML Status ─────────────────────────────────────────────────────────────────

async function getMLStatus() {
  try {
    const res = await ml.get('/health');
    return { available: true, ...res.data };
  } catch {
    return { available: false, url: ML_URL };
  }
}

async function getChromaStatus() {
  try {
    const res = await ml.get('/api/chroma/status');
    return { available: true, ...res.data };
  } catch {
    return { available: false };
  }
}

// ── Local fallback (no Python) ────────────────────────────────────────────────

function localFallbackRank(candidate, internships, topN) {
  const cSkills = new Set((candidate.skills || []).map((s) => s.toLowerCase()));
  return internships
    .map((i) => {
      const iSkills = new Set((i.skills || []).map((s) => s.toLowerCase()));
      const overlap = [...cSkills].filter((s) => iSkills.has(s)).length;
      const union   = new Set([...cSkills, ...iSkills]).size;
      const score   = union > 0 ? overlap / union : 0;
      return {
        internship:        i,
        rankScore:         parseFloat(score.toFixed(4)),
        bm25Score:         0,
        similarityScore:   0,
        skillOverlapScore: parseFloat(score.toFixed(4)),
        locationScore:     0,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, topN);
}

module.exports = {
  checkMLBackend,
  embedText,
  upsertInternshipEmbedding,
  upsertCandidateEmbedding,
  deleteInternshipEmbedding,
  rankInternships,
  shortlistGreedy,
  batchILPAllocate,
  getMLStatus,
  getChromaStatus,
  isMLAvailable: () => mlAvailable,
};
