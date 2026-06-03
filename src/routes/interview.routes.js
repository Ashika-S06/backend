const express = require('express');
const router = express.Router();
const { scheduleInterview, updateInterview, getInterviews } = require('../controllers/interview.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('admin', 'placement_officer'), scheduleInterview);
router.get('/', protect, authorize('admin', 'placement_officer'), getInterviews);
router.patch('/:id', protect, authorize('admin', 'placement_officer'), updateInterview);

module.exports = router;
