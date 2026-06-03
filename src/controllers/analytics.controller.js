const Application = require('../models/Application');
const Company = require('../models/Company');
const Student = require('../models/Student');

// GET /analytics/placements
const getPlacementAnalytics = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments();
    const shortlistedCount = await Application.countDocuments({ status: 'shortlisted' });
    const selectedCount = await Application.countDocuments({ status: 'selected' });
    const rejectedCount = await Application.countDocuments({ status: 'rejected' });

    res.status(200).json({
      success: true,
      message: 'Placement analytics fetched',
      data: { totalApplications, shortlistedCount, selectedCount, rejectedCount }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /analytics/departments
const getDepartmentAnalytics = async (req, res) => {
  try {
    const students = await Student.find();
    const totalByDept = {};
    students.forEach(s => {
      totalByDept[s.department] = (totalByDept[s.department] || 0) + 1;
    });

    const selected = await Application.find({ status: 'selected' }).populate('student', 'department');
    const placedByDept = {};
    selected.forEach(a => {
      if (a.student) {
        const dept = a.student.department;
        placedByDept[dept] = (placedByDept[dept] || 0) + 1;
      }
    });

    const data = Object.keys(totalByDept).map(dept => ({
      department: dept,
      placedCount: placedByDept[dept] || 0,
      placementPercentage: totalByDept[dept]
        ? ((placedByDept[dept] || 0) / totalByDept[dept] * 100).toFixed(2)
        : '0.00'
    }));

    res.status(200).json({ success: true, message: 'Department analytics fetched', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /analytics/companies
const getCompanyAnalytics = async (req, res) => {
  try {
    const companies = await Company.find();
    const data = await Promise.all(companies.map(async (company) => {
      const drives = await require('../models/Drive').find({ company: company._id });
      const driveIds = drives.map(d => d._id);
      const selectedStudents = await Application.countDocuments({ drive: { $in: driveIds }, status: 'selected' });
      const participationCount = await Application.countDocuments({ drive: { $in: driveIds } });
      return {
        _id: company._id,
        companyName: company.name,
        highestPackage: company.package || 0,
        participationCount,
        selectedStudents
      };
    }));

    res.status(200).json({ success: true, message: 'Company analytics fetched', data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPlacementAnalytics, getDepartmentAnalytics, getCompanyAnalytics };
