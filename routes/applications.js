const express = require('express');
const { body } = require('express-validator');
const {
  applyForJob,
  getStudentApplications,
  getEmployerApplications,
  updateApplicationStatus,
  getApplicationStatistics,
  withdrawApplication
} = require('../controllers/applicationController');
const { auth, employerAuth, studentAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const applyForJobValidation = [
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Cover letter cannot be more than 1000 characters')
];

const updateStatusValidation = [
  body('status')
    .isIn(['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'])
    .withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot be more than 500 characters')
];

// Student routes
router.post('/', studentAuth, applyForJobValidation, handleValidationErrors, applyForJob);
router.get('/student/my-applications', studentAuth, getStudentApplications);
router.delete('/:id', studentAuth, withdrawApplication);

// Employer routes
router.get('/employer/job-applications', employerAuth, getEmployerApplications);
router.get('/employer/statistics', employerAuth, getApplicationStatistics);
router.put('/:id/status', employerAuth, updateStatusValidation, handleValidationErrors, updateApplicationStatus);

module.exports = router;