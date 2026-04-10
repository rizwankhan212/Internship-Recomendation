const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, searchInternships, getRecommendations,
  applyToInternship, getMyApplications, getApplicationStatus, getAllCandidates,
} = require('../controllers/candidate.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

// All routes require authentication as a candidate
router.use(protect);

// Candidate-only routes
router.get('/me', authorize('candidate'), getProfile);
router.put('/me', authorize('candidate'), updateProfile);
router.post('/search', authorize('candidate'), searchInternships);
router.get('/recommendations', authorize('candidate'), getRecommendations);
router.post('/apply/:internshipId', authorize('candidate'), upload.single('resume'), applyToInternship);
router.get('/applications', authorize('candidate'), getMyApplications);
router.get('/applications/:id', authorize('candidate'), getApplicationStatus);

// Accessible to recruiters as well (for viewing candidates)
router.get('/', authorize('recruiter', 'candidate'), getAllCandidates);

module.exports = router;
