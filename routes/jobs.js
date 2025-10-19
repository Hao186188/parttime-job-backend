const express = require('express');
const { body } = require('express-validator');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getEmployerJobs,
  getFeaturedJobs
} = require('../controllers/jobController');
const { auth, employerAuth, optionalAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Description must be between 50 and 2000 characters'),
  body('salary')
    .notEmpty()
    .withMessage('Salary information is required'),
  body('location')
    .notEmpty()
    .withMessage('Location is required'),
  body('jobType')
    .isIn(['Bán thời gian', 'Toàn thời gian', 'Thực tập', 'Freelance'])
    .withMessage('Invalid job type'),
  body('category')
    .isIn(['Phục vụ', 'Bán hàng', 'Gia sư', 'Công nghệ', 'Giao hàng', 'Văn phòng', 'Khác'])
    .withMessage('Invalid category'),
  body('contactEmail')
    .isEmail()
    .withMessage('Please enter a valid contact email')
];

// Public routes
router.get('/', optionalAuth, getJobs);
router.get('/featured', getFeaturedJobs);
router.get('/:id', optionalAuth, getJob);

// Employer routes
router.get('/employer/my-jobs', employerAuth, getEmployerJobs);
router.post('/', employerAuth, createJobValidation, handleValidationErrors, createJob);
router.put('/:id', employerAuth, createJobValidation, handleValidationErrors, updateJob);
router.delete('/:id', employerAuth, deleteJob);

module.exports = router;