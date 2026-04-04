const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    company: { type: String, required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },

    // Requirements
    skills: [{ type: String, lowercase: true }],
    location: { type: String, required: true },
    type: { type: String, enum: ['remote', 'on-site', 'hybrid'], default: 'remote' },
    duration: { type: String, default: '3 months' },
    stipend: { type: Number, default: 0 }, // INR per month
    openings: { type: Number, default: 5 },
    minCgpa: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },

    // Vector embedding (50-dim)
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Internship', InternshipSchema);
