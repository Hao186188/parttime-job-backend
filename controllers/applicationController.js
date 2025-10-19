import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

// @desc    Apply for a job
// @route   POST /api/applications
// @access  Private (Student)
export const applyForJob = async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;
    const studentId = req.user.id;

    const job = await Job.findOne({ _id: jobId, isActive: true });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer available'
      });
    }

    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: studentId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    const application = await Application.create({
      job: jobId,
      applicant: studentId,
      coverLetter,
      appliedAt: new Date()
    });

    await application.populate('job', 'title company');
    await application.populate('applicant', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application }
    });

  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get student's applications
// @route   GET /api/applications/student/my-applications
// @access  Private (Student)
export const getStudentApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const studentId = req.user.id;

    const filter = { applicant: studentId };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate({
        path: 'job',
        select: 'title company salary location jobType category isActive applicationDeadline',
        populate: {
          path: 'company',
          select: 'name logo industry'
        }
      })
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get applications for employer's jobs
// @route   GET /api/applications/employer/job-applications
// @access  Private (Employer)
export const getEmployerApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, jobId, status, sortBy = 'appliedAt', sortOrder = 'desc' } = req.query;
    const employerId = req.user.id;

    const jobFilter = { employer: employerId };
    if (jobId) jobFilter._id = jobId;

    const employerJobs = await Job.find(jobFilter).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    const applicationFilter = { job: { $in: jobIds } };
    if (status) applicationFilter.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const applications = await Application.find(applicationFilter)
      .populate({
        path: 'job',
        select: 'title company salary location',
        populate: {
          path: 'company',
          select: 'name logo'
        }
      })
      .populate('applicant', 'name email phone school major skills resume')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(applicationFilter);

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get employer applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Employer)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes, interviewDate, interviewLocation } = req.body;
    const employerId = req.user.id;

    const application = await Application.findById(req.params.id)
      .populate({ path: 'job', select: 'employer' });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.job.employer.toString() !== employerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    const updateData = { status };
    if (notes !== undefined) updateData.notes = notes;
    if (interviewDate !== undefined) updateData.interviewDate = interviewDate;
    if (interviewLocation !== undefined) updateData.interviewLocation = interviewLocation;

    if (application.status === 'pending' && status !== 'pending') {
      updateData.reviewedAt = new Date();
      updateData.reviewedBy = employerId;
    }

    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('job', 'title company')
      .populate('applicant', 'name email');

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: { application: updatedApplication }
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get application statistics for employer
// @route   GET /api/applications/employer/statistics
// @access  Private (Employer)
export const getApplicationStatistics = async (req, res) => {
  try {
    const employerId = req.user.id;

    const employerJobs = await Job.find({ employer: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    const stats = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalApplications = await Application.countDocuments({ job: { $in: jobIds } });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentApplications = await Application.countDocuments({
      job: { $in: jobIds },
      appliedAt: { $gte: oneWeekAgo }
    });

    const statistics = {
      total: totalApplications,
      recent: recentApplications,
      byStatus: {}
    };

    stats.forEach(stat => {
      statistics.byStatus[stat._id] = stat.count;
    });

    res.json({
      success: true,
      data: { statistics }
    });

  } catch (error) {
    console.error('Get application statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Withdraw application
// @route   DELETE /api/applications/:id
// @access  Private (Student)
export const withdrawApplication = async (req, res) => {
  try {
    const studentId = req.user.id;
    const applicationId = req.params.id;

    const application = await Application.findOne({
      _id: applicationId,
      applicant: studentId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (['shortlisted', 'accepted'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application in current status'
      });
    }

    await Application.findByIdAndDelete(applicationId);

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });

  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
