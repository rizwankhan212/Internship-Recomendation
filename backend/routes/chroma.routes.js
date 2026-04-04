const express = require('express');
const router  = express.Router();
const { getChromaStatus } = require('../services/mlClient.service');

// @route GET /api/chroma/status — Proxies ChromaDB status from Python ML backend
router.get('/status', async (req, res) => {
  try {
    const status = await getChromaStatus();
    res.json({
      success: true,
      chroma: {
        available:    status.available ?? false,
        collections:  status.collections,
        embedder:     status.embedder,
        embedder_dim: status.embedder_dim,
        path:         status.path,
        message: status.available
          ? '✅ ChromaDB connected via Python ML Backend'
          : '⚠️  Python ML Backend offline — ChromaDB unavailable',
      },
    });
  } catch (err) {
    res.json({
      success: true,
      chroma: {
        available: false,
        message: '⚠️  Python ML Backend offline — ChromaDB unavailable',
      },
    });
  }
});

module.exports = router;
