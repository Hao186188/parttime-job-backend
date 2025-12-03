import User from '../models/User.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';

// @desc    Get user profile
// @route   GET /api/users/profile/:id?
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;

    const user = await User.findById(userId)
      .populate('company')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add statistics for students
    if (user.userType === 'student') {
      const applicationStats = await Application.aggregate([
        { $match: { applicant: user._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      user._doc.applicationStats = {};
      applicationStats.forEach(stat => {
        user._doc.applicationStats[stat._id] = stat.count;
      });
    }

    // Add statistics for employers
    if (user.userType === 'employer') {
      const jobStats = await Job.aggregate([
        { $match: { employer: user._id } },
        { $group: { _id: '$isActive', count: { $sum: 1 } } }
      ]);

      user._doc.jobStats = {
        active: 0,
        total: 0
      };

      jobStats.forEach(stat => {
        user._doc.jobStats.total += stat.count;
        if (stat._id === true) {
          user._doc.jobStats.active = stat.count;
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      bio,
      address,
      dateOfBirth,
      school,
      major,
      year,
      skills,
      position
    } = req.body;

    const updateData = {
      name,
      phone,
      bio,
      address,
      dateOfBirth,
      ...(req.user.userType === 'student' && { school, major, year, skills }),
      ...(req.user.userType === 'employer' && { position })
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    // Handle skills array
    if (updateData.skills && Array.isArray(updateData.skills)) {
      updateData.skills = updateData.skills
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0 && skill.length <= 50)
        .slice(0, 20);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('company')
      .select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload resume
// @route   POST /api/users/upload-resume
// @access  Private (Student)
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a resume file'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { resume: `/uploads/resumes/${req.file.filename}` },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Resume uploaded successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/upload-avatar
// @access  Private
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: `/uploads/avatars/${req.file.filename}` },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get saved jobs
// @route   GET /api/users/saved-jobs
// @access  Private (Student)
export const getSavedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('savedJobs');

    if (!user.savedJobs || user.savedJobs.length === 0) {
      return res.json({
        success: true,
        data: { savedJobs: [] }
      });
    }

    const savedJobs = await Job.find({
      _id: { $in: user.savedJobs },
      isActive: true
    })
      .populate('company', 'name logo industry')
      .select('title company salary location jobType category createdAt');

    res.json({
      success: true,
      data: { savedJobs }
    });

  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Save job
// @route   POST /api/users/saved-jobs/:jobId
// @access  Private (Student)
export const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({ _id: jobId, isActive: true });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const user = await User.findById(req.user.id);

    if (user.savedJobs.includes(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Job already saved'
      });
    }

    user.savedJobs.push(jobId);
    if (user.savedJobs.length > 50) {
      user.savedJobs = user.savedJobs.slice(-50);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Job saved successfully'
    });

  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove saved job
// @route   DELETE /api/users/saved-jobs/:jobId
// @access  Private (Student)
export const removeSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const user = await User.findById(req.user.id);

    user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
    await user.save();

    res.json({
      success: true,
      message: 'Job removed from saved list'
    });

  } catch (error) {
    console.error('Remove saved job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get recommended jobs
// @route   GET /api/users/recommended-jobs
// @access  Private (Student)
export const getRecommendedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const recommendedJobs = await Job.find({
      isActive: true,
      $or: [
        { category: { $in: user.skills || [] } },
        { skills: { $in: user.skills || [] } },
        { $text: { $search: user.major || user.school || '' } }
      ]
    })
      .populate('company', 'name logo industry')
      .select('title company salary location jobType category isFeatured createdAt')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { recommendedJobs }
    });

  } catch (error) {
    console.error('Get recommended jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
