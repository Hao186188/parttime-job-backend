import express from 'express';
const { body } = require('express-validator');
const {
  getUserProfile,
  updateUserProfile,
  uploadResume,
  uploadAvatar,
  getSavedJobs,
  saveJob,
  removeSavedJob,
  getRecommendedJobs
} = require('../controllers/userController');
const { auth, studentAuth } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { uploadResume: resumeUpload, uploadAvatar: avatarUpload } = require('../utils/upload');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b$/)
    .withMessage('Please enter a valid Vietnamese phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot be more than 500 characters'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each skill cannot be more than 50 characters')
];

// Public routes (with optional auth)
router.get('/profile/:id?', auth, getUserProfile);

// Authenticated routes
router.put('/profile', auth, updateProfileValidation, handleValidationErrors, updateUserProfile);
router.post('/upload-avatar', auth, avatarUpload.single('avatar'), uploadAvatar);

// Student only routes
router.get('/saved-jobs', studentAuth, getSavedJobs);
router.post('/saved-jobs/:jobId', studentAuth, saveJob);
router.delete('/saved-jobs/:jobId', studentAuth, removeSavedJob);
router.get('/recommended-jobs', studentAuth, getRecommendedJobs);
router.post('/upload-resume', studentAuth, resumeUpload.single('resume'), uploadResume);

export default router;