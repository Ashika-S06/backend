const Drive = require('../models/Drive');

const generateDriveId = async () => {
  const count = await Drive.countDocuments();
  return `DRV${9000 + count + 1}`;
};

// POST /drives
const createDrive = async (req, res) => {
  try {
    const driveId = await generateDriveId();
    const drive = await Drive.create({ ...req.body, driveId });
    res.status(201).json({ success: true, message: 'Drive created successfully', data: drive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /drives
const getDrives = async (req, res) => {
  try {
    const { status, company: companyName } = req.query;
    const filter = {};
    if (status) filter.status = status;

    let drives = await Drive.find(filter).populate({
      path: 'company',
      select: 'companyId name package eligibleDepartments minimumCgpa driveDate'
    });

    if (companyName) {
      drives = drives.filter(d =>
        d.company && d.company.name.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      message: 'Drives fetched successfully',
      total: drives.length,
      data: drives
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /drives/:id
const getDriveById = async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id).populate({
      path: 'company',
      select: 'companyId name package eligibleDepartments minimumCgpa driveDate'
    });
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.status(200).json({ success: true, message: 'Drive fetched successfully', data: drive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /drives/:id
const updateDrive = async (req, res) => {
  try {
    const drive = await Drive.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.status(200).json({ success: true, message: 'Drive updated successfully', data: drive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /drives/:id
const deleteDrive = async (req, res) => {
  try {
    const drive = await Drive.findByIdAndDelete(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });
    res.status(200).json({ success: true, message: 'Drive deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createDrive, getDrives, getDriveById, updateDrive, deleteDrive };
