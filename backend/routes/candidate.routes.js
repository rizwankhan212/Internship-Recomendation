const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, searchInternships, getRecommendations,
  applyToInternship, getMyApplications, getApplicationStatus, getAllCandidates, deleteAccount,
} = require('../controllers/candidate.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');
const {
  updateProfileRules, searchRules, applyRules, mongoIdParam,
} = require('../middleware/validate.middleware');

// All routes require authentication as a candidate
router.use(protect);

// Candidate-only routes
router.get('/me', authorize('candidate'), getProfile);
router.put('/me', authorize('candidate'), updateProfileRules, updateProfile);
router.delete('/me', authorize('candidate'), deleteAccount);
router.post('/search', authorize('candidate'), searchRules, searchInternships);
router.get('/recommendations', authorize('candidate'), getRecommendations);
router.post('/apply/:internshipId', authorize('candidate'), upload.single('resume'), applyRules, applyToInternship);
router.get('/applications', authorize('candidate'), getMyApplications);
router.get('/applications/:id', authorize('candidate'), ...mongoIdParam('id'), getApplicationStatus);

// Accessible to recruiters as well (for viewing candidates)
router.get('/', authorize('recruiter', 'candidate'), getAllCandidates);

module.exports = router;
