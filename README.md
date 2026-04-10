# RecoMinds — AI-Powered Internship Recommendation Platform

> Smart internship matching using Hybrid Retrieval (BM25 + ChromaDB ANN), LightGBM ranking, and Greedy Allocation.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Frontend   │────▶│  Express Backend  │────▶│  FastAPI ML Backend │
│  React/Vite  │     │  Node.js/Mongoose │     │  Python/LightGBM    │
│  Port: 5173  │     │    Port: 5000     │     │    Port: 8001       │
└──────────────┘     └────────┬─────────┘     └──────────┬──────────┘
                              │                          │
                     ┌────────▼─────────┐       ┌────────▼──────────┐
                     │     MongoDB      │       │     ChromaDB      │
                     │  (Primary DB)    │       │  (Vector Search)  │
                     └──────────────────┘       └───────────────────┘
```

### How Ranking Works

```
Candidate Search Query
    │
    ├──▶ BM25 Keyword Scoring (35%)
    ├──▶ ChromaDB ANN Semantic Similarity (30%)  ← 384-dim sentence-transformers
    ├──▶ Skill Overlap — Jaccard Similarity (25%)
    └──▶ Location + Type Match (10%)
         │
         ▼
    LightGBM Classifier (trained on 1068 real job listings)
         │
         ▼
    Ranked Results → Top 10 Recommendations
```

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) |
| Vector DB | ChromaDB (embedded, `hnsw:space=cosine`) |
| ML Backend | Python FastAPI |
| Embeddings | `all-MiniLM-L6-v2` (384-dim, sentence-transformers) |
| Ranking | LightGBM Binary Classifier |
| BM25 | `rank-bm25` (Python) |
| Shortlisting | Greedy Allocator + ILP Solver (SciPy) |
| Auth | JWT (role-based: candidate / recruiter) |
| File Storage | Cloudinary (resume uploads) |
| Resume Parsing | Google Gemini API |

## Features

### Candidate
- 🔍 **AI-powered search** — Hybrid BM25 + semantic similarity ranking
- ✨ **Smart recommendations** — Personalized top-10 internship matches
- 📄 **Resume upload** — Cloudinary storage with AI skill extraction (Gemini)
- 📊 **Score breakdown** — See match %, BM25, similarity, skill overlap scores
- 🏷️ **Profile management** — Skills, location, preferred types, education
- 📋 **Application tracking** — View status (pending → shortlisted → selected)
- 🗑️ **Account deletion** — GDPR-compliant full data cleanup

### Recruiter
- 📝 **Post internships** — Free-form skill tagging, flexible fields
- 👥 **View applicants** — Ranked by AI match score
- 📄 **View resumes** — Inline viewer (Google Docs)
- ✅ **Shortlisting** — AI-powered greedy allocation (top 20)
- 🔄 **Application management** — Select / reject candidates
- 📊 **Dashboard stats** — Total internships, applications, selections
- 🗑️ **Account deletion** — Cascading cleanup (internships, applications, resumes)

### ML Pipeline
- 🧠 **LightGBM ranker** — Trained on 1068 real job listings from `job_dataset.csv`
- 📐 **Sentence transformers** — `all-MiniLM-L6-v2` (384-dim embeddings)
- 🗂️ **ChromaDB** — Embedded vector database for ANN search
- 📊 **Evaluation suite** — Precision, Recall, NDCG, MAP, MRR metrics
- 🏋️ **Training pipeline** — `train_ranker.py` for model retraining

## Setup

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.8
- **MongoDB** (local or Atlas)
- **Cloudinary account** (for resume storage)

### 1. Clone the repository
```bash
git clone https://github.com/rizwankhan212/Internship-Recomendation.git
cd Internship-Recomendation
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/recomids
JWT_SECRET=your_strong_secret_here
JWT_EXPIRE=7d
ML_BACKEND_URL=http://localhost:8001
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

### 4. ML Backend setup
```bash
cd ml_backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 5. Train the ML model
```bash
cd ml_backend
python train_ranker.py
```
This trains the LightGBM ranker on `job_dataset.csv` (1068 real job listings) and saves the model to `ml_backend/models/lgbm_ranker.pkl`.

### 6. Evaluate the model (optional)
```bash
cd ml_backend
python evaluate.py
```

## Running

### Start all services (3 terminals)

**Terminal 1 — ML Backend:**
```bash
cd ml_backend
python run.py
```

**Terminal 2 — Express Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Verify connections
Express backend should show:
```
🚀 RecoMinds Express API  → http://localhost:5000
✅ MongoDB Connected: localhost
✅ Python ML Backend connected at http://localhost:8001
```

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register/candidate` | Register new candidate |
| POST | `/api/auth/register/recruiter` | Register new recruiter |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user profile |

### Candidate APIs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/candidates/me` | Get profile |
| PUT | `/api/candidates/me` | Update profile (re-embeds in ChromaDB) |
| POST | `/api/candidates/search` | Hybrid search (BM25 + ANN + LightGBM) |
| GET | `/api/candidates/recommendations` | Top 10 AI recommendations |
| POST | `/api/candidates/apply/:id` | Apply with resume + cover letter |
| GET | `/api/candidates/applications` | List all applications |
| DELETE | `/api/candidates/account` | Delete account (GDPR cleanup) |

### Recruiter APIs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/recruiters/me` | Get profile |
| PUT | `/api/recruiters/me` | Update profile |
| GET | `/api/recruiters/dashboard/stats` | Dashboard statistics |
| GET | `/api/recruiters/internships` | List posted internships |
| POST | `/api/recruiters/internships` | Post new internship (embeds in ChromaDB) |
| PUT | `/api/recruiters/internships/:id` | Update internship |
| DELETE | `/api/recruiters/internships/:id` | Delete internship (cascade cleanup) |
| GET | `/api/recruiters/internships/:id/applications` | View applicants (ranked) |
| GET | `/api/recruiters/internships/:id/shortlist` | Run Greedy Allocator → top 20 |
| PUT | `/api/recruiters/applications/:id/status` | Update status (select/reject) |
| DELETE | `/api/recruiters/account` | Delete account (cascade cleanup) |

### ML Backend APIs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check (embedder + ChromaDB status) |
| POST | `/api/embed/one` | Generate 384-dim embedding |
| POST | `/api/rank` | Full hybrid ranking pipeline |
| POST | `/api/shortlist/greedy` | Greedy allocation |
| POST | `/api/shortlist/ilp` | ILP batch allocation |
| POST | `/api/chroma/upsert/internship` | Upsert internship embedding |
| POST | `/api/chroma/upsert/candidate` | Upsert candidate embedding |
| GET | `/api/chroma/status` | ChromaDB collection stats |

## ML Model Performance

| Metric | Score |
|---|---|
| Skill Overlap Accuracy | 100% |
| BM25 Top-1 Accuracy | 100% |
| Embedding Similarity Accuracy | 100% |
| Precision@3 | 0.7500 |
| Recall@3 | 0.9167 |
| NDCG@3 | 0.9759 |
| MAP | 0.9479 |
| MRR | 1.0000 |

## Project Structure

```
Internship-Recomendation/
├── frontend/                    # React + Vite
│   └── src/
│       ├── api/                 # Axios API clients
│       ├── components/          # Navbar, InternshipCard, ScoreBar
│       ├── context/             # AuthContext (JWT)
│       └── pages/
│           ├── candidate/       # Dashboard, Profile, Applications
│           └── recruiter/       # Dashboard, Profile, PostInternship, Applicants, Shortlist
│
├── backend/                     # Express.js
│   ├── controllers/             # Auth, Candidate, Recruiter, Internship
│   ├── middleware/               # JWT auth, role check, Cloudinary upload
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # Express routes
│   └── services/
│       └── mlClient.service.js  # HTTP client for Python ML backend
│
├── ml_backend/                  # FastAPI (Python)
│   ├── main.py                  # App entry + lifespan
│   ├── run.py                   # Windows startup helper
│   ├── routers/                 # embed, rank, shortlist, chroma
│   ├── services/
│   │   ├── embedder.py          # sentence-transformers wrapper
│   │   ├── chroma_service.py    # ChromaDB embedded client
│   │   ├── bm25_service.py      # BM25 ranking
│   │   └── ranking_service.py   # LightGBM hybrid ranker
│   ├── models/
│   │   └── lgbm_ranker.pkl      # Trained model (110KB)
│   ├── train_ranker.py          # Training script
│   ├── evaluate.py              # Evaluation suite
│   └── job_dataset.csv          # 1068 real job listings
│
└── README.md
```

## License

MIT
