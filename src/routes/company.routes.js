const express = require('express');
const router = express.Router();
const { createCompany, getCompanies, getCompanyById, updateCompany, deleteCompany } = require('../controllers/company.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/', protect, authorize('admin', 'placement_officer'), createCompany);
router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.patch('/:id', protect, authorize('admin', 'placement_officer'), updateCompany);
router.delete('/:id', protect, authorize('admin', 'placement_officer'), deleteCompany);

module.exports = router;
