const Recruiter  = require('../models/Recruiter');
const Internship = require('../models/Internship');
const Application = require('../models/Application');
const ml = require('../services/mlClient.service');

// ── Profile ───────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const recruiter = await Recruiter.findById(req.user.id);
    res.json({ success: true, recruiter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, company, designation, companyDescription, website, industry, companySize } = req.body;
    const recruiter = await Recruiter.findByIdAndUpdate(
      req.user.id,
      { $set: { name, company, designation, companyDescription, website, industry, companySize } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, recruiter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalInternships, activeInternships, totalApplications, shortlisted, selected, pending] =
      await Promise.all([
        Internship.countDocuments({ recruiter: req.user.id }),
        Internship.countDocuments({ recruiter: req.user.id, isActive: true }),
        Application.countDocuments({ recruiter: req.user.id }),
        Application.countDocuments({ recruiter: req.user.id, status: 'shortlisted' }),
        Application.countDocuments({ recruiter: req.user.id, status: 'selected' }),
        Application.countDocuments({ recruiter: req.user.id, status: 'pending' }),
      ]);
    res.json({ success: true, stats: { totalInternships, activeInternships, totalApplications, shortlisted, selected, pending } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Internships CRUD ──────────────────────────────────────────────────────────
exports.getMyInternships = async (req, res) => {
  try {
    const internships = await Internship.find({ recruiter: req.user.id }).sort({ createdAt: -1 });
    const withCounts  = await Promise.all(
      internships.map(async (i) => ({
        ...i.toObject(),
        applicationCount: await Application.countDocuments({ internship: i._id }),
      }))
    );
    res.json({ success: true, count: internships.length, internships: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.postInternship = async (req, res) => {
  try {
    const { title, description, skills, location, type, duration, stipend, openings, minCgpa } = req.body;
    const recruiter = await Recruiter.findById(req.user.id);

    const internship = await Internship.create({
      title, description,
      company:   recruiter.company,
      recruiter: req.user.id,
      skills:    (skills || []).map((s) => s.toLowerCase()),
      location, type, duration, stipend, openings, minCgpa,
    });

    // Upsert embedding to Python ML backend (ChromaDB)
    ml.upsertInternshipEmbedding(internship.toObject()).catch(console.error);

    res.status(201).json({ success: true, internship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateInternship = async (req, res) => {
  try {
    const internship = await Internship.findOne({ _id: req.params.id, recruiter: req.user.id });
    if (!internship) return res.status(404).json({ success: false, message: 'Not found' });

    const { title, description, skills, location, type, duration, stipend, openings, minCgpa, isActive } = req.body;

    // Only assign fields that were actually sent in the request body
    // to avoid overwriting required fields with undefined
    const updates = { title, description, location, type, duration, stipend, openings, minCgpa, isActive };
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) internship[key] = updates[key];
    });
    if (skills !== undefined) {
      internship.skills = skills.map((s) => s.toLowerCase());
    }
    await internship.save();

    // Re-upsert embedding
    ml.upsertInternshipEmbedding(internship.toObject()).catch(console.error);

    res.json({ success: true, internship });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteInternship = async (req, res) => {
  try {
    const internship = await Internship.findOneAndDelete({ _id: req.params.id, recruiter: req.user.id });
    if (!internship) return res.status(404).json({ success: false, message: 'Not found' });

    // Remove from Python ML / ChromaDB
    ml.deleteInternshipEmbedding(internship._id.toString()).catch(console.error);

    // Delete all applications for this internship + their resumes from Cloudinary
    const applications = await Application.find({ internship: req.params.id });
    if (applications.length > 0) {
      const cloudinary = require('cloudinary').v2;
      for (const app of applications) {
        if (app.resumePath) {
          try {
            const parts = app.resumePath.split('/upload/');
            if (parts[1]) {
              const publicId = parts[1].split('/').slice(1).join('/').replace(/\.[^/.]+$/, '');
              await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            }
          } catch (cloudErr) {
            console.error('Cloudinary delete error:', cloudErr.message);
          }
        }
      }
      await Application.deleteMany({ internship: req.params.id });
    }

    res.json({ success: true, message: 'Internship and all related applications deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Applicants ────────────────────────────────────────────────────────────────
exports.getApplicants = async (req, res) => {
  try {
    const internship = await Internship.findOne({ _id: req.params.id, recruiter: req.user.id });
    if (!internship) return res.status(404).json({ success: false, message: 'Not found' });

    const { page = 1, limit = 50 } = req.query;
    const [applications, total] = await Promise.all([
      Application.find({ internship: req.params.id })
        .populate('candidate', '-profileEmbedding -password')
        .sort({ rankScore: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
      Application.countDocuments({ internship: req.params.id }),
    ]);

    res.json({
      success: true,
      internship: { title: internship.title, company: internship.company, openings: internship.openings },
      total, page: +page, applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Shortlist (Greedy Allocator) ──────────────────────────────────────────────
exports.getShortlist = async (req, res) => {
  try {
    const internship = await Internship.findOne({ _id: req.params.id, recruiter: req.user.id });
    if (!internship) return res.status(404).json({ success: false, message: 'Not found' });

    const applications = await Application.find({ internship: req.params.id })
      .populate('candidate', '-profileEmbedding -password');

    // Call Python ML backend Greedy Allocator
    const shortlisted    = await ml.shortlistGreedy(applications, 20);
    const shortlistedIds = shortlisted.map((a) => a._id);

    await Application.updateMany({ _id: { $in: shortlistedIds } }, { $set: { status: 'shortlisted' } });
    await Application.updateMany(
      { internship: req.params.id, _id: { $nin: shortlistedIds } },
      { $set: { status: 'pending' } }
    );

    res.json({
      success: true,
      internship:        internship.title,
      totalApplications: applications.length,
      shortlistSize:     shortlisted.length,
      shortlist:         shortlisted,
      algorithm:         ml.isMLAvailable() ? 'python-greedy-allocator' : 'local-fallback',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Application Status Update ─────────────────────────────────────────────────
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['selected', 'not_selected', 'shortlisted', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const application = await Application.findOne({ _id: req.params.appId, recruiter: req.user.id })
      .populate('candidate', 'name email')
      .populate('internship', 'title company');
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });

    // If rejected — delete resume from Cloudinary but keep the application record
    // so the candidate can see the rejection status on their dashboard
    if (status === 'not_selected') {
      if (application.resumePath) {
        try {
          const cloudinary = require('cloudinary').v2;
          // Extract public_id from Cloudinary URL
          // URL format: https://res.cloudinary.com/<cloud>/raw/upload/v123/interns-home/resumes/<filename>
          const parts = application.resumePath.split('/upload/');
          if (parts[1]) {
            const publicId = parts[1].split('/').slice(1).join('/').replace(/\.[^/.]+$/, '');
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
          }
        } catch (cloudErr) {
          console.error('Cloudinary delete error:', cloudErr.message);
        }
      }
      application.status = 'not_selected';
      application.resumePath = ''; // cleared from Cloudinary
      await application.save();
      return res.json({ success: true, application, message: 'Application rejected' });
    }

    application.status = status;
    await application.save();
    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete Account ────────────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    // Find all internships by this recruiter
    const internships = await Internship.find({ recruiter: recruiterId });

    const cloudinary = require('cloudinary').v2;

    for (const internship of internships) {
      // Find all applications for this internship
      const applications = await Application.find({ internship: internship._id });

      // Delete resumes from Cloudinary
      for (const app of applications) {
        if (app.resumePath) {
          try {
            const parts = app.resumePath.split('/upload/');
            if (parts[1]) {
              const publicId = parts[1].split('/').slice(1).join('/').replace(/\.[^/.]+$/, '');
              await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            }
          } catch (cloudErr) {
            console.error('Cloudinary delete error:', cloudErr.message);
          }
        }
      }

      // Delete all applications for this internship
      await Application.deleteMany({ internship: internship._id });

      // Delete ChromaDB embedding for internship
      ml.deleteInternshipEmbedding(internship._id.toString()).catch(console.error);
    }

    // Delete all internships
    await Internship.deleteMany({ recruiter: recruiterId });

    // Delete the recruiter
    await Recruiter.findByIdAndDelete(recruiterId);

    res.json({ success: true, message: 'Account and all data deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
