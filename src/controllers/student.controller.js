const Student = require('../models/Student');

// GET /students
const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, cgpaMin, status } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (cgpaMin) filter.cgpa = { $gte: parseFloat(cgpaMin) };
    if (status) filter.status = status;

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: students
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /students/:id
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student fetched successfully', data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStudents, getStudentById };
