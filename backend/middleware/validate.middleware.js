/**
 * Validation Middleware — express-validator rules for all routes.
 *
 * Provides:
 * - Input validation (type, length, format)
 * - XSS sanitization (strips HTML/scripts from text fields)
 * - Consistent error responses
 */

const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');

// ── XSS sanitizer helper ─────────────────────────────────────────────────────
const sanitize = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim());
};

const sanitizeField = (field) =>
  body(field).optional().customSanitizer(sanitize);

// ── Validation error handler ──────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const registerCandidateRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .customSanitizer(sanitize),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  body('skills')
    .optional().isArray({ max: 50 }).withMessage('Skills must be an array (max 50)'),
  body('skills.*')
    .optional().isString().trim().isLength({ max: 50 }).customSanitizer(sanitize),
  body('location')
    .optional().trim().isLength({ max: 100 }).customSanitizer(sanitize),
  body('preferredTypes')
    .optional().isArray({ max: 3 }),
  body('preferredTypes.*')
    .optional().isIn(['remote', 'on-site', 'hybrid']).withMessage('Invalid type'),
  sanitizeField('bio'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio max 1000 characters'),
  body('cgpa')
    .optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0-10'),
  sanitizeField('college'),
  sanitizeField('degree'),
  handleValidationErrors,
];

const registerRecruiterRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .customSanitizer(sanitize),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  body('company')
    .trim().notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Company must be 2-200 characters')
    .customSanitizer(sanitize),
  sanitizeField('designation'),
  sanitizeField('companyDescription'),
  body('companyDescription').optional().isLength({ max: 2000 }).withMessage('Description max 2000 characters'),
  sanitizeField('website'),
  body('website').optional().isURL().withMessage('Invalid URL'),
  sanitizeField('industry'),
  sanitizeField('companySize'),
  handleValidationErrors,
];

const loginRules = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['candidate', 'recruiter']).withMessage('Role must be candidate or recruiter'),
  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const updateProfileRules = [
  body('name')
    .optional().trim().isLength({ min: 2, max: 100 }).customSanitizer(sanitize),
  body('skills')
    .optional().isArray({ max: 50 }).withMessage('Skills must be an array (max 50)'),
  body('skills.*')
    .optional().isString().trim().isLength({ max: 50 }).customSanitizer(sanitize),
  sanitizeField('location'),
  body('preferredTypes')
    .optional().isArray({ max: 3 }),
  body('preferredTypes.*')
    .optional().isIn(['remote', 'on-site', 'hybrid']),
  sanitizeField('bio'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio max 1000 characters'),
  body('cgpa')
    .optional().isFloat({ min: 0, max: 10 }),
  sanitizeField('college'),
  sanitizeField('degree'),
  body('experience')
    .optional().isInt({ min: 0, max: 600 }).withMessage('Experience 0-600 months'),
  handleValidationErrors,
];

const searchRules = [
  body('query')
    .optional({ values: 'falsy' }).trim().isLength({ max: 500 }).customSanitizer(sanitize),
  body('location')
    .optional({ values: 'falsy' }).trim().isLength({ max: 100 }).customSanitizer(sanitize),
  body('type')
    .optional({ values: 'falsy' }).isIn(['remote', 'on-site', 'hybrid']).withMessage('Invalid type'),
  body('skills')
    .optional({ values: 'falsy' }).isArray({ max: 20 }),
  body('skills.*')
    .optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }).customSanitizer(sanitize),
  handleValidationErrors,
];

const applyRules = [
  param('internshipId')
    .isMongoId().withMessage('Invalid internship ID'),
  sanitizeField('coverLetter'),
  body('coverLetter').optional().isLength({ max: 5000 }).withMessage('Cover letter max 5000 characters'),
  handleValidationErrors,
];

// ═══════════════════════════════════════════════════════════════════════════════
// RECRUITER VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const updateRecruiterProfileRules = [
  body('name')
    .optional().trim().isLength({ min: 2, max: 100 }).customSanitizer(sanitize),
  sanitizeField('company'),
  sanitizeField('designation'),
  sanitizeField('companyDescription'),
  body('companyDescription').optional().isLength({ max: 2000 }),
  sanitizeField('website'),
  body('website').optional({ values: 'falsy' }).isURL().withMessage('Invalid URL'),
  sanitizeField('industry'),
  sanitizeField('companySize'),
  handleValidationErrors,
];

const postInternshipRules = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters')
    .customSanitizer(sanitize),
  body('description')
    .trim().notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters')
    .customSanitizer(sanitize),
  body('skills')
    .isArray({ min: 1, max: 30 }).withMessage('At least 1 skill required (max 30)'),
  body('skills.*')
    .isString().trim().isLength({ max: 50 }).customSanitizer(sanitize),
  body('location')
    .trim().notEmpty().withMessage('Location is required')
    .isLength({ max: 100 }).customSanitizer(sanitize),
  body('type')
    .isIn(['remote', 'on-site', 'hybrid']).withMessage('Type must be remote, on-site, or hybrid'),
  sanitizeField('duration'),
  body('stipend')
    .optional().isInt({ min: 0, max: 1000000 }).withMessage('Stipend must be 0-1000000'),
  body('openings')
    .optional().isInt({ min: 1, max: 500 }).withMessage('Openings must be 1-500'),
  body('minCgpa')
    .optional().isFloat({ min: 0, max: 10 }).withMessage('Min CGPA must be 0-10'),
  handleValidationErrors,
];

const updateInternshipRules = [
  param('id').isMongoId().withMessage('Invalid internship ID'),
  body('title')
    .optional().trim().isLength({ min: 3, max: 200 }).customSanitizer(sanitize),
  body('description')
    .optional().trim().isLength({ min: 10, max: 5000 }).customSanitizer(sanitize),
  body('skills')
    .optional().isArray({ max: 30 }),
  body('skills.*')
    .optional().isString().trim().isLength({ max: 50 }).customSanitizer(sanitize),
  sanitizeField('location'),
  body('type')
    .optional().isIn(['remote', 'on-site', 'hybrid']),
  body('stipend')
    .optional().isInt({ min: 0, max: 1000000 }),
  body('openings')
    .optional().isInt({ min: 1, max: 500 }),
  body('isActive')
    .optional().isBoolean(),
  handleValidationErrors,
];

const updateStatusRules = [
  param('appId').isMongoId().withMessage('Invalid application ID'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['selected', 'not_selected', 'shortlisted', 'pending']).withMessage('Invalid status'),
  handleValidationErrors,
];

const mongoIdParam = (paramName) => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

module.exports = {
  registerCandidateRules,
  registerRecruiterRules,
  loginRules,
  updateProfileRules,
  searchRules,
  applyRules,
  updateRecruiterProfileRules,
  postInternshipRules,
  updateInternshipRules,
  updateStatusRules,
  mongoIdParam,
  handleValidationErrors,
};
