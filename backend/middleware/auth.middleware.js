const jwt = require('jsonwebtoken');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };

    // Attach full user document
    if (decoded.role === 'candidate') {
      req.candidate = await Candidate.findById(decoded.id);
      if (!req.candidate) {
        return res.status(401).json({ success: false, message: 'Candidate not found' });
      }
    } else if (decoded.role === 'recruiter') {
      req.recruiter = await Recruiter.findById(decoded.id);
      if (!req.recruiter) {
        return res.status(401).json({ success: false, message: 'Recruiter not found' });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect };
