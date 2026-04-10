const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, getMyInternships, postInternship,
  updateInternship, deleteInternship, getApplicants, getShortlist,
  updateApplicationStatus, getDashboardStats, deleteAccount,
} = require('../controllers/recruiter.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  updateRecruiterProfileRules, postInternshipRules,
  updateInternshipRules, updateStatusRules, mongoIdParam,
} = require('../middleware/validate.middleware');

router.use(protect, authorize('recruiter'));

router.get('/me', getProfile);
router.put('/me', updateRecruiterProfileRules, updateProfile);
router.delete('/me', deleteAccount);
router.get('/dashboard/stats', getDashboardStats);
router.get('/internships', getMyInternships);
router.post('/internships', postInternshipRules, postInternship);
router.put('/internships/:id', updateInternshipRules, updateInternship);
router.delete('/internships/:id', ...mongoIdParam('id'), deleteInternship);
router.get('/internships/:id/applications', ...mongoIdParam('id'), getApplicants);
router.get('/internships/:id/shortlist', ...mongoIdParam('id'), getShortlist);
router.put('/applications/:appId/status', updateStatusRules, updateApplicationStatus);

module.exports = router;
