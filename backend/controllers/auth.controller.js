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

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    const Model = role === 'candidate' ? Candidate : role === 'recruiter' ? Recruiter : null;
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid role' });

    const user = await Model.findOne({ email });
    if (!user) {
      // Don't reveal if email exists — always say "sent"
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL (frontend page)
    const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/reset-password/${resetToken}?role=${role}`;

    // Send email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"RecoMinds" <${process.env.EMAIL_USER || 'noreply@recomids.com'}>`,
      to: email,
      subject: '🔐 Password Reset — RecoMinds',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 12px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">🔐 Password Reset</h2>
          <p style="color: #555; line-height: 1.6;">
            Hi <strong>${user.name}</strong>,<br><br>
            You requested a password reset for your <strong>${role}</strong> account on RecoMinds.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #6366f1); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password →
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">
            This link expires in <strong>30 minutes</strong>.<br>
            If you didn't request this, ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e2e2; margin: 20px 0;">
          <p style="color: #aaa; font-size: 11px; text-align: center;">RecoMinds — AI Internship Platform</p>
        </div>
      `,
    };

    // Try sending email; if email config missing, return link directly (dev mode)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Password reset email sent to ${email}`);
      res.json({ success: true, message: 'Password reset link sent to your email.' });
    } else {
      // Dev mode — no email configured, return token directly
      console.warn('⚠️  No EMAIL_USER/EMAIL_PASS configured. Returning reset link directly.');
      res.json({
        success: true,
        message: 'Email not configured. Use the link below (dev mode only).',
        devResetUrl: resetUrl,
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Could not process reset request' });
  }
};

// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { password, role } = req.body;
    const { token } = req.params;

    if (!password || !role) {
      return res.status(400).json({ success: false, message: 'Password and role are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const Model = role === 'candidate' ? Candidate : role === 'recruiter' ? Recruiter : null;
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid role' });

    // Hash the token from URL to match the stored hash
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await Model.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    console.log(`✅ Password reset for ${user.email} (${role})`);
    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
