const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const RecruiterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: 'recruiter', immutable: true },

    // Company info
    company: { type: String, required: true },
    designation: { type: String, default: 'HR Manager' },
    companyDescription: { type: String, default: '' },
    website: { type: String, default: '' },
    industry: { type: String, default: 'Technology' },
    companySize: { type: String, default: '' }, // e.g. "100-500"
  },
  { timestamps: true }
);

RecruiterSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

RecruiterSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Recruiter', RecruiterSchema);
