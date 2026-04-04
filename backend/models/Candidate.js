const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const CandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: 'candidate', immutable: true },

    // Profile
    skills: [{ type: String, lowercase: true }],
    location: { type: String, default: '' },
    preferredTypes: [{ type: String, enum: ['remote', 'on-site', 'hybrid'] }],
    bio: { type: String, default: '' },
    cgpa: { type: Number, default: 0, min: 0, max: 10 },
    college: { type: String, default: '' },
    degree: { type: String, default: '' },
    experience: { type: Number, default: 0 }, // months of experience

    // Vector embedding (50-dim, stored for ANN search)
    profileEmbedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

// Hash password before save
CandidateSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

CandidateSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Candidate', CandidateSchema);
