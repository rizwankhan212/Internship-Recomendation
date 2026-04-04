const Internship = require('../models/Internship');
const Application = require('../models/Application');

// @route  GET /api/internships — Public listing
exports.getAllInternships = async (req, res) => {
  try {
    const { page = 1, limit = 20, location, type, skills, search } = req.query;
    const filter = { isActive: true };

    if (location) filter.location = { $regex: location, $options: 'i' };
    if (type) filter.type = type;
    if (skills) filter.skills = { $in: skills.split(',').map((s) => s.trim().toLowerCase()) };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const internships = await Internship.find(filter)
      .populate('recruiter', 'name company website')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Internship.countDocuments(filter);

    res.json({ success: true, total, page: parseInt(page), internships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route  GET /api/internships/:id — Public single internship
exports.getInternshipById = async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('recruiter', 'name company website companyDescription designation');

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found' });
    }

    const applicationCount = await Application.countDocuments({ internship: req.params.id });

    res.json({ success: true, internship, applicationCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
