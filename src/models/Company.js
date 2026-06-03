const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String },
  package: { type: Number },
  eligibleDepartments: [{ type: String }],
  minimumCgpa: { type: Number },
  driveDate: { type: Date },
  status: { type: String, enum: ['active', 'inactive', 'upcoming'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
