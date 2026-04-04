const express = require('express');
const router = express.Router();
const { registerCandidate, registerRecruiter, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register/candidate', registerCandidate);
router.post('/register/recruiter', registerRecruiter);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
