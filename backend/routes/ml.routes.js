const express = require('express');
const router  = express.Router();
const { getMLStatus, getChromaStatus, isMLAvailable } = require('../services/mlClient.service');

// GET /api/ml/status — public
router.get('/status', async (req, res) => {
  const ml     = await getMLStatus();
  const chroma = await getChromaStatus();
  res.json({
    success: true,
    ml_backend: { ...ml, url: process.env.ML_BACKEND_URL || 'http://localhost:8001' },
    chromadb:   chroma,
  });
});

// GET /api/ml/health — quick alive check
router.get('/health', (req, res) => {
  res.json({ success: true, ml_alive: isMLAvailable() });
});

module.exports = router;
