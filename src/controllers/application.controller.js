const Application = require('../models/Application');
const Drive = require('../models/Drive');
const Student = require('../models/Student');

const generateAppId = async () => {
  const last = await Application.findOne().sort({ createdAt: -1 }).select('applicationId');
  if (last?.applicationId) {
    const num = parseInt(last.applicationId.replace('APP', '')) || 9000;
    return `APP${num + 1}`;
  }
  return 'APP9001';
};

// POST /applications
const createApplication = async (req, res) => {
  try {
    const { student: studentId, drive: driveId } = req.body;
    if (!studentId || !driveId)
      return res.status(400).json({ success: false, message: 'student and drive are required' });

    // Load student and drive
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const drive = await Drive.findById(driveId).populate('company');
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });

    // Workflow Rule 1: Closed drives cannot accept applications
    if (drive.status === 'closed' || drive.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Closed drives cannot accept applications' });
    }

    const company = drive.company;

    // Workflow Rule 2: Student CGPA must satisfy company minimum CGPA
    if (company?.minimumCgpa && student.cgpa < company.minimumCgpa) {
      return res.status(400).json({
        success: false,
        message: `Student CGPA (${student.cgpa}) does not meet company minimum CGPA (${company.minimumCgpa})`
      });
    }

    // Workflow Rule 3: Student department must be eligible
    if (company?.eligibleDepartments?.length > 0 &&
        !company.eligibleDepartments.includes(student.department)) {
      return res.status(400).json({
        success: false,
        message: `Student department (${student.department}) is not eligible for this drive`
      });
    }

    // Workflow Rule 4: Duplicate applications not allowed
    const duplicate = await Application.findOne({ student: studentId, drive: driveId });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Application already exists for this drive' });
    }

    const applicationId = await generateAppId();
    const app = await Application.create({ ...req.body, applicationId });
    res.status(201).json({ success: true, message: 'Application created successfully', data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /applications
const getApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;

    let applications = await Application.find(filter)
      .populate({ path: 'student', select: 'studentId name department email cgpa skills graduationYear phone status' })
      .populate({ path: 'drive', populate: { path: 'company', select: 'companyId name role package eligibleDepartments minimumCgpa driveDate status' } })
      .sort({ createdAt: -1 });

    if (search) {
      const s = search.toLowerCase();
      applications = applications.filter(a =>
        a.drive?.company?.name?.toLowerCase().includes(s) ||
        a.student?.name?.toLowerCase().includes(s)
      );
    }

    const total = applications.length;
    const paginated = applications.slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Applications fetched successfully',
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: paginated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /applications/:id
const getApplicationById = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate({ path: 'student', select: 'studentId name department email cgpa skills graduationYear phone status' })
      .populate({ path: 'drive', populate: { path: 'company', select: 'companyId name role package eligibleDepartments minimumCgpa driveDate status' } });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application fetched successfully', data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /applications/:id
const updateApplication = async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application updated successfully', data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /applications/:id
const deleteApplication = async (req, res) => {
  try {
    const app = await Application.findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.status(200).json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createApplication, getApplications, getApplicationById, updateApplication, deleteApplication };
