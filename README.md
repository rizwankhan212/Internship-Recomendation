#Intern's Home

> AI-powered internship recommendation platform using Hybrid Retrieval (BM25 + ChromaDB ANN), LambdaMART ranking, and Greedy Allocation.

## Architecture

```
Candidate ──→ Search Query ──→ BM25 + ChromaDB ANN ──→ LambdaMART Rank ──→ Top 10
Candidate ──→ Apply         ──→ MongoDB Application  ──→ Greedy Allocator ──→ Shortlist 20
Recruiter ──→ View Shortlist ──→ Select / Reject    ──→ Status visible to candidate
```

## Tech Stack

| Component | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Primary DB | MongoDB (Mongoose) |
| **Vector DB** | **ChromaDB** (`hnsw:space=cosine`) |
| Auth | JWT (role: candidate / recruiter) |
| Ranking | BM25 + 50-dim TF-IDF embeddings via ChromaDB ANN |
| Shortlisting | Greedy Real-time Allocator + Batch ILP Solver |
| Frontend | React (Vite) + React Router |

## Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- Python ≥ 3.8 (for ChromaDB server)

### 1. Install ChromaDB (Python)
```bash
pip install chromadb
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
```

### 4. Configure environment
Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/recomids
JWT_SECRET=recomids_secret_superkey_sih2025
JWT_EXPIRE=7d
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION_INTERNSHIPS=recomids_internships
CHROMA_COLLECTION_CANDIDATES=recomids_candidates
```

## Running

### Option A — Use the startup script (Windows)
```
start.bat
```

### Option B — Manual
**Terminal 1 — ChromaDB:**
```bash
chroma run --path ./chroma_db
```

**Terminal 2 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 — Seed data:**
```bash
cd backend
npm run seed
```

**Terminal 4 — Frontend:**
```bash
cd frontend
npm run dev
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Recruiter | priya@google.com | Google@123 |
| Recruiter | rahul@microsoft.com | Microsoft@123 |
| Recruiter | sneha@amazon.com | Amazon@123 |
| Recruiter | arjun@flipkart.com | Flipkart@123 |
| Recruiter | kavya@razorpay.com | Razorpay@123 |
| Candidate | *(any seeded email)* | Password@123 |

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/candidate` | Register new candidate |
| POST | `/api/auth/register/recruiter` | Register new recruiter |
| POST | `/api/auth/login` | Login (role in body) |
| GET | `/api/auth/me` | Get current user |

### Candidate APIs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/candidates/me` | Get own profile |
| PUT | `/api/candidates/me` | Update profile (recalculates embedding in ChromaDB) |
| POST | `/api/candidates/search` | Hybrid search (BM25 + ChromaDB ANN) |
| GET | `/api/candidates/recommendations` | Top 10 AI-ranked recommendations |
| POST | `/api/candidates/apply/:id` | Apply to internship |
| GET | `/api/candidates/applications` | List all applications |
| GET | `/api/candidates/applications/:id` | Get application status |

### Recruiter APIs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/recruiters/me` | Get recruiter profile |
| PUT | `/api/recruiters/me` | Update recruiter profile |
| GET | `/api/recruiters/dashboard/stats` | Dashboard statistics |
| GET | `/api/recruiters/internships` | List all posted internships |
| POST | `/api/recruiters/internships` | Post new internship (generates ChromaDB embedding) |
| PUT | `/api/recruiters/internships/:id` | Update internship (re-embeds in ChromaDB) |
| DELETE | `/api/recruiters/internships/:id` | Delete internship (removes from ChromaDB) |
| GET | `/api/recruiters/internships/:id/applications` | View all applicants (ranked by score) |
| GET | `/api/recruiters/internships/:id/shortlist` | Run Greedy Allocator → top 20 |
| PUT | `/api/recruiters/applications/:id/status` | Set selected / not_selected |

### ChromaDB
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chroma/status` | ChromaDB connection status |
| GET | `/api/health` | Full health check incl. ChromaDB |

## ChromaDB Integration Details

- **Collections**: `recomids_internships` + `recomids_candidates`
- **Distance metric**: `cosine` (via `hnsw:space=cosine`)
- **Embedding**: 50-dim TF-IDF term-frequency vector over a fixed tech-skills vocabulary, L2-normalized
- **Upsert**: Every create/update of an internship or candidate profile upserts its embedding into ChromaDB
- **Query**: ANN query returns top-K by cosine similarity (distance = 1 - cosine_similarity)
- **Fallback**: If ChromaDB is offline, falls back to in-memory cosine similarity over embeddings stored in MongoDB
