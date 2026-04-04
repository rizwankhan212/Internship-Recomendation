/**
 * ChromaDB Service — Full integration with ChromaDB vector database
 *
 * Manages two collections:
 *   - recomids_internships  : embeddings of internship postings
 *   - recomids_candidates   : embeddings of candidate profiles
 *
 * Embedding strategy: 50-dim TF-IDF style term-frequency vector over a
 * fixed tech-skills vocabulary, L2-normalized. This gives meaningful cosine
 * distances without needing a language model server.
 *
 * ChromaDB must be running: `chroma run --path ./chroma_db`  (port 8000)
 */

const { ChromaClient } = require('chromadb');

// ── Vocabulary (50 tech skills / domain terms) ────────────────────────────────
const VOCABULARY = [
  'javascript', 'python', 'react', 'nodejs', 'express', 'mongodb', 'sql', 'postgresql',
  'machine learning', 'data science', 'deep learning', 'nlp', 'computer vision',
  'java', 'spring', 'django', 'flask', 'tensorflow', 'pytorch', 'scikit',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'devops', 'linux',
  'html', 'css', 'typescript', 'vue', 'angular', 'graphql', 'rest',
  'data analysis', 'tableau', 'excel', 'statistics',
  'git', 'agile', 'cpp', 'golang', 'rust',
  'android', 'ios', 'flutter', 'swift', 'kotlin',
  'blockchain', 'cybersecurity', 'redis',
];

// ── Singleton client & collections ───────────────────────────────────────────
let chromaClient = null;
let internshipsCollection = null;
let candidatesCollection = null;
let chromaAvailable = false;

/**
 * Initialize ChromaDB client and ensure collections exist.
 * Called once at server startup. Falls back gracefully if Chroma is down.
 */
async function initChroma() {
  try {
    chromaClient = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

    // Ping to verify connection
    await chromaClient.heartbeat();

    const internshipCollName = process.env.CHROMA_COLLECTION_INTERNSHIPS || 'recomids_internships';
    const candidateCollName  = process.env.CHROMA_COLLECTION_CANDIDATES  || 'recomids_candidates';

    // Get-or-create both collections
    internshipsCollection = await chromaClient.getOrCreateCollection({
      name: internshipCollName,
      metadata: { 'hnsw:space': 'cosine', description: 'RecoMinds internship embeddings' },
    });

    candidatesCollection = await chromaClient.getOrCreateCollection({
      name: candidateCollName,
      metadata: { 'hnsw:space': 'cosine', description: 'RecoMinds candidate profile embeddings' },
    });

    chromaAvailable = true;
    console.log(`✅ ChromaDB connected — collections: [${internshipCollName}] [${candidateCollName}]`);
  } catch (err) {
    chromaAvailable = false;
    console.warn(`⚠️  ChromaDB unavailable (${err.message}). Falling back to in-memory cosine search.`);
    console.warn('   Start ChromaDB with: pip install chromadb && chroma run --path ./chroma_db');
  }
}

// ── Embedding generation (pure JS, no Python needed) ────────────────────────

/**
 * Convert text to a 50-dim L2-normalized term-frequency vector.
 * @param {string} text
 * @returns {number[]} 50-element float array
 */
function textToEmbedding(text) {
  const lower = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const vec = new Array(VOCABULARY.length).fill(0);

  VOCABULARY.forEach((term, idx) => {
    // Use word-boundary aware matching for single-word terms
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches) vec[idx] = matches.length;
  });

  // L2 normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? vec : vec.map((v) => v / mag);
}

/**
 * Build candidate profile embedding from their skills, location, bio, degree.
 */
function candidateToEmbedding(candidate) {
  const text = [
    (candidate.skills || []).join(' '),
    candidate.location || '',
    candidate.bio || '',
    candidate.degree || '',
    (candidate.preferredTypes || []).join(' '),
  ].join(' ');
  return textToEmbedding(text);
}

/**
 * Build internship embedding from title, description, skills, location, type.
 */
function internshipToEmbedding(internship) {
  const text = [
    internship.title || '',
    internship.description || '',
    (internship.skills || []).join(' '),
    internship.location || '',
    internship.type || '',
    internship.company || '',
  ].join(' ');
  return textToEmbedding(text);
}

// ── Cosine similarity (used for fallback + ranking engine) ──────────────────

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    mA  += a[i] * a[i];
    mB  += b[i] * b[i];
  }
  const denom = Math.sqrt(mA) * Math.sqrt(mB);
  return denom === 0 ? 0 : dot / denom;
}

// ── ChromaDB UPSERT helpers ─────────────────────────────────────────────────

/**
 * Upsert an internship embedding into ChromaDB.
 * @param {Object} internship - Mongoose document
 */
async function upsertInternshipEmbedding(internship) {
  const embedding = internshipToEmbedding(internship);
  // Store embedding back on the document (MongoDB side)
  internship.embedding = embedding;

  if (!chromaAvailable || !internshipsCollection) return embedding;

  try {
    await internshipsCollection.upsert({
      ids: [internship._id.toString()],
      embeddings: [embedding],
      metadatas: [{
        title:    internship.title,
        company:  internship.company,
        location: internship.location,
        type:     internship.type,
        skills:   (internship.skills || []).join(','),
        recruiter: internship.recruiter?.toString() || '',
        isActive:  String(internship.isActive),
      }],
      documents: [`${internship.title} ${internship.description} ${(internship.skills || []).join(' ')}`],
    });
  } catch (err) {
    console.error('ChromaDB upsert internship error:', err.message);
  }
  return embedding;
}

/**
 * Upsert a candidate profile embedding into ChromaDB.
 * @param {Object} candidate - Mongoose document
 */
async function upsertCandidateEmbedding(candidate) {
  const embedding = candidateToEmbedding(candidate);
  candidate.profileEmbedding = embedding;

  if (!chromaAvailable || !candidatesCollection) return embedding;

  try {
    await candidatesCollection.upsert({
      ids: [candidate._id.toString()],
      embeddings: [embedding],
      metadatas: [{
        name:     candidate.name,
        location: candidate.location || '',
        skills:   (candidate.skills || []).join(','),
        degree:   candidate.degree || '',
      }],
      documents: [`${(candidate.skills || []).join(' ')} ${candidate.bio || ''} ${candidate.degree || ''}`],
    });
  } catch (err) {
    console.error('ChromaDB upsert candidate error:', err.message);
  }
  return embedding;
}

/**
 * Delete an internship from ChromaDB (when deleted from MongoDB).
 */
async function deleteInternshipEmbedding(internshipId) {
  if (!chromaAvailable || !internshipsCollection) return;
  try {
    await internshipsCollection.delete({ ids: [internshipId.toString()] });
  } catch (err) {
    console.error('ChromaDB delete internship error:', err.message);
  }
}

// ── ANN Search ───────────────────────────────────────────────────────────────

/**
 * Query ChromaDB for the top-K internships most similar to the given embedding.
 * Falls back to in-memory cosine search if ChromaDB is unavailable.
 *
 * @param {number[]} queryEmbedding   - 50-dim query vector (from candidate or search)
 * @param {Object[]} internshipDocs   - Mongoose internship documents (for fallback + enrichment)
 * @param {number}   topK             - Number of results
 * @param {string[]} [excludeIds]     - Internship IDs to exclude
 * @returns {Promise<Array<{internship, similarityScore}>>}
 */
async function annSearchInternships(queryEmbedding, internshipDocs, topK = 20, excludeIds = []) {
  // ── ChromaDB path ─────────────────────────────────────────────────────────
  if (chromaAvailable && internshipsCollection && queryEmbedding?.length) {
    try {
      const activeIds  = internshipDocs.map((d) => d._id.toString());
      const validQuery = queryEmbedding.some((v) => v !== 0);

      if (validQuery) {
        const chromaResult = await internshipsCollection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: Math.min(topK + excludeIds.length + 5, Math.max(internshipDocs.length, 1)),
          // ChromaDB where clause: only active internships (stored in metadata)
          where: { isActive: 'true' },
        });

        const ids       = chromaResult.ids?.[0]       || [];
        const distances = chromaResult.distances?.[0] || [];

        // Build a lookup map from the mongo docs
        const docMap = {};
        internshipDocs.forEach((d) => { docMap[d._id.toString()] = d; });

        const results = [];
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          if (excludeIds.includes(id)) continue;
          if (!docMap[id]) continue; // not in current filter set

          // ChromaDB cosine distance = 1 - cosine_similarity
          const simScore = Math.max(0, 1 - (distances[i] || 0));
          results.push({ internship: docMap[id], similarityScore: simScore });

          if (results.length >= topK) break;
        }

        if (results.length > 0) {
          return results;
        }
        // Fall through to in-memory if ChromaDB returned nothing useful
      }
    } catch (err) {
      console.error('ChromaDB query error (falling back):', err.message);
    }
  }

  // ── In-memory fallback ────────────────────────────────────────────────────
  const scored = internshipDocs
    .filter((d) => !excludeIds.includes(d._id.toString()))
    .map((internship) => ({
      internship,
      similarityScore: cosineSimilarity(queryEmbedding, internship.embedding || []),
    }));

  return scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, topK);
}

/**
 * Query ChromaDB for internships most similar to a TEXT query (BM25-style).
 * Used when there is no candidate embedding — pure text matching through Chroma.
 */
async function textQueryInternships(queryText, internshipDocs, topK = 20) {
  const queryEmbedding = textToEmbedding(queryText);
  return annSearchInternships(queryEmbedding, internshipDocs, topK);
}

/**
 * Return ChromaDB status information.
 */
function getChromaStatus() {
  return {
    available: chromaAvailable,
    url: process.env.CHROMA_URL || 'http://localhost:8000',
    collections: {
      internships: process.env.CHROMA_COLLECTION_INTERNSHIPS || 'recomids_internships',
      candidates:  process.env.CHROMA_COLLECTION_CANDIDATES  || 'recomids_candidates',
    },
  };
}

module.exports = {
  initChroma,
  textToEmbedding,
  candidateToEmbedding,
  internshipToEmbedding,
  cosineSimilarity,
  upsertInternshipEmbedding,
  upsertCandidateEmbedding,
  deleteInternshipEmbedding,
  annSearchInternships,
  textQueryInternships,
  getChromaStatus,
  isChromaAvailable: () => chromaAvailable,
};
