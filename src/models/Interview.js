const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  interviewId: { type: String, required: true, unique: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  interviewer: { type: String },
  round: { type: String },
  interviewDate: { type: Date },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  result: { type: String, enum: ['pending', 'pass', 'fail'], default: 'pending' },
  feedback: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
