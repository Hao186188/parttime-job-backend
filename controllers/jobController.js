import Job from '../models/Job.js';
import Company from '../models/Company.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import mongoose from 'mongoose'; // Cần import để kiểm tra ObjectId

// @desc    Get all jobs with filters
// @route   GET /api/jobs
// @access  Public
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

    console.log('🔍 Get jobs query:', req.query);

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

    console.log(`✅ Found ${jobs.length} jobs out of ${total} total`);

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
    console.error('❌ Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching jobs',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
export const getJob = async (req, res) => {
  try {
    const jobIdentifier = req.params.id; // Có thể là ObjectId hoặc ID tùy chỉnh
    console.log('🔍 Get job by ID:', jobIdentifier);
    
    let job = null;
    
    // 1. Thử tìm kiếm theo ID TÙY CHỈNH (Ví dụ: 'gs_001')
    // **QUAN TRỌNG:** Thay 'customId' bằng tên trường ID tùy chỉnh thực tế trong Job Schema của bạn
    job = await Job.findOne({ customId: jobIdentifier }) 
        .populate('company')
        .populate('employer', 'name email phone');

    // 2. Nếu không tìm thấy, thử tìm kiếm theo MongoDB _id
    if (!job && mongoose.Types.ObjectId.isValid(jobIdentifier)) {
        console.log('💡 Thử tìm kiếm theo MongoDB ObjectId...');
        job = await Job.findById(jobIdentifier)
            .populate('company')
            .populate('employer', 'name email phone');
    }

    if (!job) {
      console.log('❌ Job not found:', jobIdentifier);
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Cập nhật lượt xem
    job.views += 1;
    await job.save();

    console.log('✅ Job found and view count updated');

    res.json({ 
      success: true, 
      data: { job } 
    });
  } catch (error) {
    console.error('❌ Get job error:', error);
    
    // Xử lý CastError hoặc bất kỳ lỗi DB nào khác
    if (error.name === 'CastError') {
        // Trả về 404 thay vì 500 khi ID có định dạng sai nhưng không được bắt ở trên
        return res.status(404).json({
            success: false,
            message: 'Job not found (Invalid ID format)'
        });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching job',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// @desc    Create job - DEBUG VERSION
// @route   POST /api/jobs
// @access  Private (Employer)
export const createJob = async (req, res) => {
  try {
    console.log('=== JOB CREATION START ===');
    console.log('📥 User making request:', req.user.id);

    // Kiểm tra và xử lý company
    let companyId = req.user.company;
    
    if (!companyId) {
      console.log('⚠️ User has no company, creating temporary company...');
      
      // Tạo company tạm thời từ thông tin form
      const tempCompany = await Company.create({
        name: req.body.company || `${req.user.name}'s Company`,
        email: req.body.contactEmail || req.user.email,
        phone: req.body.contactPhone || '',
        industry: 'General',
        size: '1-10',
        isVerified: false
      });
      
      companyId = tempCompany._id;
      console.log('✅ Created temporary company:', companyId);
      
      // Cập nhật user với company mới
      await User.findByIdAndUpdate(req.user.id, { company: companyId });
    }

    // Chuẩn bị job data với fallback values
    const jobData = {
      title: req.body.title,
      company: companyId,
      employer: req.user.id,
      location: req.body.location,
      description: req.body.description,
      jobType: req.body.jobType || 'Bán thời gian',
      category: req.body.category || 'Khác',
      
      // Các trường optional với default values
      salary: req.body.salary || 'Thương lượng',
      requirements: req.body.requirements || '',
      benefits: req.body.benefits || '',
      contactEmail: req.body.contactEmail || req.user.email,
      contactPhone: req.body.contactPhone || '',
      workHours: req.body.workHours || 'Linh hoạt',
      vacancies: parseInt(req.body.vacancies) || 1,
      experience: req.body.experience || 'Không yêu cầu',
      education: req.body.education || 'Không yêu cầu',
      isActive: true
    };

    // Xử lý deadline nếu có
    if (req.body.applicationDeadline) {
      jobData.applicationDeadline = new Date(req.body.applicationDeadline);
    }

    // Tạo job
    const job = await Job.create(jobData);

    console.log('✅ Job created successfully:', job._id);

    // Update company job count
    await Company.findByIdAndUpdate(companyId, {
      $inc: { jobCount: 1 }
    });

    // Populate job để trả về thông tin đầy đủ
    const populatedJob = await Job.findById(job._id)
      .populate('company', 'name email industry')
      .populate('employer', 'name email');

    console.log('=== JOB CREATION COMPLETE ===');

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job: populatedJob }
    });

  } catch (error) {
    console.error('❌ CREATE JOB ERROR:', error);
    
    // Log chi tiết lỗi validation
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Lỗi duplicate key
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Job with similar details already exists'
      });
    }

    // Lỗi MongoDB connection
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating job',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Employer)
export const updateJob = async (req, res) => {
  try {
    console.log('🔧 Update job request:', req.params.id);

    let job = await Job.findById(req.params.id);
    
    if (!job) {
      console.log('❌ Job not found for update:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (job.employer.toString() !== req.user.id) {
      console.log('🚫 Unauthorized update attempt by user:', req.user.id);
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this job' 
      });
    }

    job = await Job.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    ).populate('company');

    console.log('✅ Job updated successfully:', req.params.id);

    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    console.error('❌ Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating job',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Employer)
export const deleteJob = async (req, res) => {
  try {
    console.log('🗑️ Delete job request:', req.params.id);

    const job = await Job.findById(req.params.id);
    
    if (!job) {
      console.log('❌ Job not found for deletion:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Kiểm tra quyền sở hữu
    if (job.employer.toString() !== req.user.id) {
      console.log('🚫 Unauthorized deletion attempt by user:', req.user.id);
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this job' 
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    // Update company job count
    await Company.findByIdAndUpdate(job.company, {
      $inc: { jobCount: -1 }
    });

    console.log('✅ Job deleted successfully:', req.params.id);

    res.json({ 
      success: true, 
      message: 'Job deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting job',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// @desc    Get employer's jobs
// @route   GET /api/jobs/employer/my-jobs
// @access  Private (Employer)
export const getEmployerJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    
    console.log('👨‍💼 Get employer jobs for user:', req.user.id);

    const filter = { employer: req.user.id };
    
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    const jobs = await Job.find(filter)
      .populate('company')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(filter);

    console.log(`📊 Found ${jobs.length} jobs for employer`);

    // Lấy thống kê applications cho mỗi job
    const jobsWithStats = await Promise.all(
      jobs.map(async (job) => {
        const stats = await Application.aggregate([
          { $match: { job: job._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        const statsObj = {};
        stats.forEach((stat) => (statsObj[stat._id] = stat.count));
        
        return { 
          ...job.toObject(), 
          applicationStats: statsObj,
          applicationCount: stats.reduce((sum, stat) => sum + stat.count, 0)
        };
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
    console.error('❌ Get employer jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employer jobs',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// @desc    Get featured jobs
// @route   GET /api/jobs/featured
// @access  Public
export const getFeaturedJobs = async (req, res) => {
  try {
    console.log('⭐ Get featured jobs request');
    
    const jobs = await Job.find({ 
      isFeatured: true, 
      isActive: true 
    })
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .limit(6);

    console.log(`✅ Found ${jobs.length} featured jobs`);

    res.json({ 
      success: true, 
      data: { jobs } 
    });
  } catch (error) {
    console.error('❌ Get featured jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching featured jobs',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};