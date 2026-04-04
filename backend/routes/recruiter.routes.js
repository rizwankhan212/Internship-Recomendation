const express = require('express');
const router = express.Router();
const {
  getProfile, updateProfile, getMyInternships, postInternship,
  updateInternship, deleteInternship, getApplicants, getShortlist,
  updateApplicationStatus, getDashboardStats,
} = require('../controllers/recruiter.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect, authorize('recruiter'));

router.get('/me', getProfile);
router.put('/me', updateProfile);
router.get('/dashboard/stats', getDashboardStats);
router.get('/internships', getMyInternships);
router.post('/internships', postInternship);
router.put('/internships/:id', updateInternship);
router.delete('/internships/:id', deleteInternship);
router.get('/internships/:id/applications', getApplicants);
router.get('/internships/:id/shortlist', getShortlist);
router.put('/applications/:appId/status', updateApplicationStatus);

module.exports = router;
