const express = require('express');
const router = express.Router();
const { getPlacementAnalytics, getDepartmentAnalytics, getCompanyAnalytics } = require('../controllers/analytics.controller');

router.get('/placements', getPlacementAnalytics);
router.get('/departments', getDepartmentAnalytics);
router.get('/companies', getCompanyAnalytics);

module.exports = router;
