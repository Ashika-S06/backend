const express = require('express');
const router = express.Router();
const { syncDatabase } = require('../controllers/sync.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('admin', 'placement_officer'), syncDatabase);

module.exports = router;
