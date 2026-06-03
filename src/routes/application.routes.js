const express = require('express');
const router = express.Router();
const { createApplication, getApplications, getApplicationById, updateApplication, deleteApplication } = require('../controllers/application.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, createApplication);
router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.patch('/:id', protect, authorize('admin', 'placement_officer'), updateApplication);
router.delete('/:id', protect, authorize('admin', 'placement_officer'), deleteApplication);

module.exports = router;
