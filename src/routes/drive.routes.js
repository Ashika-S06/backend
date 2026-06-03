const express = require('express');
const router = express.Router();
const { createDrive, getDrives, getDriveById, updateDrive, deleteDrive } = require('../controllers/drive.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('admin', 'placement_officer'), createDrive);
router.get('/', getDrives);
router.get('/:id', getDriveById);
router.patch('/:id', protect, authorize('admin', 'placement_officer'), updateDrive);
router.delete('/:id', protect, authorize('admin', 'placement_officer'), deleteDrive);

module.exports = router;
