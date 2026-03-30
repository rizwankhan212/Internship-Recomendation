import mongoose from "mongoose";

const Schema = mongoose.Schema;

const candidateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  skills: {
    type: [String],
    default: [],
    required: true
  },
  stipend: {
    type: Number,
    required: true,
    min: 0
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  degree: {
    type: String,
    default: "Illiterate"
  }
});

const Candidate = mongoose.model("Candidate", candidateSchema);

export default Candidate;