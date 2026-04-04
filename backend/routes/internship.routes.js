const express = require('express');
const router = express.Router();
const { getAllInternships, getInternshipById } = require('../controllers/internship.controller');

router.get('/', getAllInternships);
router.get('/:id', getInternshipById);

module.exports = router;
