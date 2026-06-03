const Company = require('../models/Company');

const generateCompanyId = async () => {
  const count = await Company.countDocuments();
  return `CMP${600 + count + 1}`;
};

// POST /companies
const createCompany = async (req, res) => {
  try {
    const companyId = await generateCompanyId();
    const company = await Company.create({ ...req.body, companyId });
    res.status(201).json({ success: true, message: 'Company created successfully', data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /companies
const getCompanies = async (req, res) => {
  try {
    const { company: name, status } = req.query;
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (status) filter.status = status;

    const companies = await Company.find(filter);
    res.status(200).json({
      success: true,
      message: 'Companies fetched successfully',
      total: companies.length,
      data: companies
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /companies/:id
const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, message: 'Company fetched successfully', data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /companies/:id
const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, message: 'Company updated successfully', data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /companies/:id
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany };
