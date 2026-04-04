const Candidate   = require('../models/Candidate');
const Internship  = require('../models/Internship');
const Application = require('../models/Application');
const ml = require('../services/mlClient.service');

// ── Profile ───────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id);
    res.json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, skills, location, preferredTypes, bio, cgpa, college, degree, experience } = req.body;
    const candidate = await Candidate.findById(req.user.id);
    Object.assign(candidate, { name, skills, location, preferredTypes, bio, cgpa, college, degree, experience });
    await candidate.save();

    // Upsert embedding asynchronously to Python ML backend (non-blocking)
    ml.upsertCandidateEmbedding(candidate).catch(console.error);

    res.json({ success: true, candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Search ────────────────────────────────────────────────────────────────────
exports.searchInternships = async (req, res) => {
  try {
    const { query = '', location, type, skills } = req.body;

    const filter = { isActive: true };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (type)     filter.type     = type;
    if (skills?.length) filter.skills = { $in: skills.map((s) => s.toLowerCase()) };

    const [internships, candidate] = await Promise.all([
      Internship.find(filter).populate('recruiter', 'name company'),
      Candidate.findById(req.user.id),
    ]);

    // Send to Python ML backend for hybrid ranking
    const ranked = await ml.rankInternships(candidate.toObject(), internships.map((i) => i.toObject()), query, 20);

    res.json({
      success: true,
      query,
      total:   internships.length,
      results: ranked.map(({ internship, rankScore, bm25Score, similarityScore, skillOverlapScore, locationScore }) => {
        // Map back to the populated Mongoose doc
        const pop = internships.find((i) => i._id.toString() === (internship?._id?.toString() || internship?.toString()));
        return {
          internship: pop || internship,
          scores: { rankScore, bm25Score, similarityScore, skillOverlapScore, locationScore },
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Recommendations ───────────────────────────────────────────────────────────
exports.getRecommendations = async (req, res) => {
  try {
    const [candidate, applied] = await Promise.all([
      Candidate.findById(req.user.id),
      Application.find({ candidate: req.user.id }).select('internship'),
    ]);

    const appliedIds  = new Set(applied.map((a) => a.internship.toString()));
    const internships = await Internship.find({ isActive: true }).populate('recruiter', 'name company');
    const unapplied   = internships.filter((i) => !appliedIds.has(i._id.toString()));

    const ranked = await ml.rankInternships(candidate.toObject(), unapplied.map((i) => i.toObject()), '', 10);

    // Restore populated docs
    const idMap = {};
    unapplied.forEach((i) => { idMap[i._id.toString()] = i; });

    res.json({
      success: true,
      total:   ranked.length,
      mlBackend: ml.isMLAvailable() ? 'python-fastapi' : 'local-fallback',
      recommendations: ranked.map(({ internship, rankScore, skillOverlapScore, similarityScore }) => ({
        internship:       idMap[internship?._id?.toString()] || internship,
        rankScore,
        skillOverlapScore,
        similarityScore,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Apply ─────────────────────────────────────────────────────────────────────
exports.applyToInternship = async (req, res) => {
  try {
    const { internshipId } = req.params;
    const { coverLetter = '' } = req.body;

    const internship = await Internship.findById(internshipId);
    if (!internship?.isActive) {
      return res.status(404).json({ success: false, message: 'Internship not found or inactive' });
    }
    if (await Application.findOne({ candidate: req.user.id, internship: internshipId })) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }

    const candidate = await Candidate.findById(req.user.id);

    // Score this pair through Python ML backend
    const [ranked] = await ml.rankInternships(candidate.toObject(), [internship.toObject()], '', 1);

    const application = await Application.create({
      candidate:         req.user.id,
      internship:        internshipId,
      recruiter:         internship.recruiter,
      coverLetter,
      rankScore:         ranked?.rankScore         || 0,
      bm25Score:         ranked?.bm25Score         || 0,
      similarityScore:   ranked?.similarityScore   || 0,
      skillOverlapScore: ranked?.skillOverlapScore || 0,
      locationScore:     ranked?.locationScore     || 0,
    });

    await application.populate([
      { path: 'internship', populate: { path: 'recruiter', select: 'name company' } },
    ]);

    res.status(201).json({ success: true, application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Already applied' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── My Applications ───────────────────────────────────────────────────────────
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate({ path: 'internship', populate: { path: 'recruiter', select: 'name company' } })
      .sort({ appliedAt: -1 });
    res.json({ success: true, count: applications.length, applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplicationStatus = async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, candidate: req.user.id })
      .populate({ path: 'internship', populate: { path: 'recruiter', select: 'name company' } });
    if (!application) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 20, skills, location } = req.query;
    const filter = {};
    if (skills)   filter.skills   = { $in: skills.split(',').map((s) => s.trim().toLowerCase()) };
    if (location) filter.location = { $regex: location, $options: 'i' };

    const candidates = await Candidate.find(filter)
      .select('-profileEmbedding -password')
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    const total = await Candidate.countDocuments(filter);
    res.json({ success: true, total, page: +page, candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
