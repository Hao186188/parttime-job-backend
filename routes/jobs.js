import express from 'express';
import { body } from 'express-validator';
import {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getEmployerJobs,
  getFeaturedJobs
} from '../controllers/jobController.js';
import { auth, employerAuth, optionalAuth } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Validation rules - LINH HOẠT HƠN
const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 }) // Giảm min length, tăng max
    .withMessage('Description must be between 10 and 5000 characters'),
  body('location')
    .notEmpty()
    .withMessage('Location is required'),
  body('jobType')
    .isIn(['Bán thời gian', 'Toàn thời gian', 'Thực tập', 'Freelance'])
    .withMessage('Invalid job type'),
  body('category')
    .isIn(['Phục vụ', 'Bán hàng', 'Gia sư', 'Công nghệ', 'Giao hàng', 'Văn phòng', 'Khác'])
    .withMessage('Invalid category')
  // BỎ required cho salary và contactEmail để linh hoạt hơn
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

export default router;