const { syncDataset } = require('../services/dataset.service');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Drive = require('../models/Drive');
const Application = require('../models/Application');

// POST /sync
const syncDatabase = async (req, res) => {
  try {
    console.log('[sync] Starting dataset sync...');
    const { stats } = await syncDataset();

    res.status(200).json({
      success: true,
      message: 'Database synced successfully',
      data: {
        students:     await Student.countDocuments(),
        companies:    await Company.countDocuments(),
        drives:       await Drive.countDocuments(),
        applications: await Application.countDocuments(),
        // Sync summary per collection
        sync: {
          students:     stats.students,
          companies:    stats.companies,
          drives:       stats.drives,
          applications: stats.applications
        }
      }
    });
  } catch (err) {
    console.error('[sync] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { syncDatabase };
