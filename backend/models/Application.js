const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter', required: true },

    status: {
      type: String,
      enum: ['pending', 'shortlisted', 'selected', 'not_selected'],
      default: 'pending',
    },

    // Scores from ranking engine
    rankScore: { type: Number, default: 0 },
    bm25Score: { type: Number, default: 0 },
    similarityScore: { type: Number, default: 0 },
    skillOverlapScore: { type: Number, default: 0 },
    locationScore: { type: Number, default: 0 },

    coverLetter: { type: String, default: '' },
    resumePath: { type: String, default: '' },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate applications
ApplicationSchema.index({ candidate: 1, internship: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
