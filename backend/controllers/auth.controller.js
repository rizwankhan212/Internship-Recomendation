const jwt = require('jsonwebtoken');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const ml = require('../services/mlClient.service');

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/register/candidate
exports.registerCandidate = async (req, res) => {
  try {
    const { name, email, password, skills, location, preferredTypes, bio, cgpa, college, degree } = req.body;
    if (await Candidate.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const candidate = await Candidate.create({
      name, email, password,
      skills: skills || [], location, preferredTypes: preferredTypes || [],
      bio, cgpa, college, degree,
    });

    // Async upsert to Python ML backend (non-blocking)
    ml.upsertCandidateEmbedding(candidate.toObject()).catch(console.error);

    const token = generateToken(candidate._id, 'candidate');
    const data  = candidate.toObject();
    delete data.password;
    res.status(201).json({ success: true, token, role: 'candidate', user: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/register/recruiter
exports.registerRecruiter = async (req, res) => {
  try {
    const { name, email, password, company, designation, companyDescription, website, industry, companySize } = req.body;
    if (await Recruiter.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const recruiter = await Recruiter.create({
      name, email, password, company, designation, companyDescription, website, industry, companySize,
    });
    const token = generateToken(recruiter._id, 'recruiter');
    const data  = recruiter.toObject();
    delete data.password;
    res.status(201).json({ success: true, token, role: 'recruiter', user: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password and role are required' });
    }
    const Model = role === 'candidate' ? Candidate : role === 'recruiter' ? Recruiter : null;
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid role' });

    const user = await Model.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(user._id, role);
    const data  = user.toObject();
    delete data.password;
    res.json({ success: true, token, role, user: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const Model = req.user.role === 'candidate' ? Candidate : Recruiter;
    const user  = await Model.findById(req.user.id);
    res.json({ success: true, role: req.user.role, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
