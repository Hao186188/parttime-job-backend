import Job from '../models/Job.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';

// @desc    Get all jobs with filters
// @route   GET /api/jobs
// @access  Public
export const getJobs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      jobType,
      category,
      salaryMin,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { isActive: true };

    if (search) filter.$text = { $search: search };
    if (location) filter.location = new RegExp(location, 'i');
    if (jobType) filter.jobType = jobType;
    if (category) filter.category = category;
    if (salaryMin) {
      filter.$or = [
        { salaryMin: { $gte: parseInt(salaryMin) } },
        { salary: { $regex: salaryMin, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const jobs = await Job.find(filter)
      .populate('company', 'name logo industry')
      .populate('employer', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(filter);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
export const getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company')
      .populate('employer', 'name email phone');

    if (!job)
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });

    job.views += 1;
    await job.save();

    res.json({ success: true, data: { job } });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private (Employer)
export const createJob = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      employer: req.user.id,
      company: req.user.company
    };

    const job = await Job.create(jobData);

    await Company.findByIdAndUpdate(req.user.company, {
      $inc: { jobCount: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Employer)
export const updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);
    if (!job)
      return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.employer.toString() !== req.user.id)
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this job' });

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('company');

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Employer)
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job)
      return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.employer.toString() !== req.user.id)
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to delete this job' });

    await Job.findByIdAndDelete(req.params.id);

    await Company.findByIdAndUpdate(req.user.company, {
      $inc: { jobCount: -1 }
    });

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get employer's jobs
// @route   GET /api/jobs/employer/my-jobs
// @access  Private (Employer)
export const getEmployerJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const filter = { employer: req.user.id };
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    const jobs = await Job.find(filter)
      .populate('company')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(filter);

    const jobsWithStats = await Promise.all(
      jobs.map(async (job) => {
        const stats = await Application.aggregate([
          { $match: { job: job._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const statsObj = {};
        stats.forEach((stat) => (statsObj[stat._id] = stat.count));
        return { ...job.toObject(), applicationStats: statsObj };
      })
    );

    res.json({
      success: true,
      data: {
        jobs: jobsWithStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get featured jobs
// @route   GET /api/jobs/featured
// @access  Public
export const getFeaturedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isFeatured: true, isActive: true })
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({ success: true, data: { jobs } });
  } catch (error) {
    console.error('Get featured jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
