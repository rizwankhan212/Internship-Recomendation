require('dotenv').config();
const express   = require('express');
const path      = require('path');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB          = require('./config/db');
const { checkMLBackend, getMLStatus, getChromaStatus } = require('./services/mlClient.service');

// Connect to MongoDB
connectDB();

// Connect to Python ML backend (non-blocking)
checkMLBackend();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Global rate limiter: 100 requests per 15 minutes per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Health ─────────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const [ml, chroma] = await Promise.all([getMLStatus(), getChromaStatus()]);
  res.json({
    success:   true,
    message:   'Interns Home API is running 🚀',
    timestamp: new Date(),
    ml_backend: ml,
    chromadb:   chroma,
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/candidates',  require('./routes/candidate.routes'));
app.use('/api/recruiters',  require('./routes/recruiter.routes'));
app.use('/api/internships', require('./routes/internship.routes'));
app.use('/api/ml',          require('./routes/ml.routes'));
app.use('/api/chroma',      require('./routes/chroma.routes'));  // ChromaDB status via Python ML backend

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 RecoMinds Express API  → http://localhost:${PORT}`);
  console.log(`🤖 Python ML Backend     → ${process.env.ML_BACKEND_URL || 'http://localhost:8001'}`);
  console.log(`📦 MongoDB               → ${process.env.MONGO_URI}`);
});

module.exports = app;
