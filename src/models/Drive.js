const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
  driveId: { type: String, required: true, unique: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
  location: { type: String },
  registrationDeadline: { type: Date },
  rounds: [{ type: String }],
  status: { type: String, enum: ['open', 'closed', 'completed', 'upcoming'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Drive', driveSchema);
