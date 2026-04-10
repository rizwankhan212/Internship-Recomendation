const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerCandidate, registerRecruiter, login, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { registerCandidateRules, registerRecruiterRules, loginRules } = require('../middleware/validate.middleware');

// ── Rate Limiters ─────────────────────────────────────────────────────────────

// Login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register: 5 accounts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many accounts created. Try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/register/candidate', registerLimiter, registerCandidateRules, registerCandidate);
router.post('/register/recruiter', registerLimiter, registerRecruiterRules, registerRecruiter);
router.post('/login', loginLimiter, loginRules, login);
router.get('/me', protect, getMe);

// Password reset (rate limited: 5 attempts per 15 min)
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many reset attempts. Try again after 15 minutes.' },
});
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password/:token', resetLimiter, resetPassword);

module.exports = router;
