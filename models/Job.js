import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  // === TRƯỜNG ĐÃ THÊM (QUAN TRỌNG CHO ID TÙY CHỈNH) ===
  customId: {
    type: String,
    trim: true,
    unique: true, // Đảm bảo không có ID nào bị trùng
    required: false, // Hoặc true, tùy vào logic nghiệp vụ của bạn
    maxlength: [20, 'Custom ID cannot be more than 20 characters']
  },
  // =======================================================
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Description cannot be more than 5000 characters']
  },
  requirements: {
    type: String,
    default: '',
    maxlength: [2000, 'Requirements cannot be more than 2000 characters']
  },
  benefits: {
    type: String,
    default: '',
    maxlength: [2000, 'Benefits cannot be more than 2000 characters']
  },
  salary: {
    type: String,
    default: 'Thương lượng',
    maxlength: [100, 'Salary cannot be more than 100 characters']
  },
  salaryMin: {
    type: Number,
    default: null
  },
  salaryMax: {
    type: Number,
    default: null
  },
  salaryType: {
    type: String,
    enum: ['hourly', 'daily', 'monthly', 'project'],
    default: 'hourly'
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    maxlength: [200, 'Location cannot be more than 200 characters']
  },
  address: {
    type: String,
    default: '',
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  jobType: {
    type: String,
    required: true,
    enum: ['Bán thời gian', 'Toàn thời gian', 'Thực tập', 'Freelance'],
    default: 'Bán thời gian'
  },
  category: {
    type: String,
    required: true,
    enum: ['Phục vụ', 'Bán hàng', 'Gia sư', 'Công nghệ', 'Giao hàng', 'Văn phòng', 'Khác'],
    default: 'Khác'
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  contactEmail: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    default: '',
    match: [/^(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b$/, 'Please enter a valid Vietnamese phone number']
  },
  applicationDeadline: {
    type: Date,
    default: null
  },
  workHours: {
    type: String,
    default: 'Linh hoạt',
    maxlength: [100, 'Work hours cannot be more than 100 characters']
  },
  vacancies: {
    type: Number,
    default: 1,
    min: [1, 'Vacancies must be at least 1']
  },
  experience: {
    type: String,
    enum: ['Không yêu cầu', 'Dưới 1 năm', '1-2 năm', 'Trên 2 năm'],
    default: 'Không yêu cầu'
  },
  education: {
    type: String,
    enum: ['Không yêu cầu', 'THPT', 'Trung cấp', 'Cao đẳng', 'Đại học'],
    default: 'Không yêu cầu'
  },
  skills: [{
    type: String,
    maxlength: [50, 'Skill cannot be more than 50 characters']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true 
});

// 🔍 Index for search functionality
jobSchema.index({
  title: 'text',
  description: 'text',
  requirements: 'text',
  location: 'text'
});

// 🔍 Index for performance
jobSchema.index({ employer: 1, createdAt: -1 });
jobSchema.index({ company: 1, isActive: 1 });
jobSchema.index({ jobType: 1, category: 1, isActive: 1 });

// ⚙️ Virtual: Check if job is expired
jobSchema.virtual('isExpired').get(function() {
  if (!this.applicationDeadline) return false;
  return new Date() > this.applicationDeadline;
});

// ⚙️ Virtual: Check if job is accepting applications
jobSchema.virtual('isAcceptingApplications').get(function() {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  return true;
});

// 📊 Method: Update application count
jobSchema.methods.updateApplicationCount = async function() {
  try {
    const Application = mongoose.model('Application');
    const count = await Application.countDocuments({ job: this._id });
    this.applicationCount = count;
    await this.save();
    return count;
  } catch (error) {
    console.error('Error updating application count:', error);
    throw error;
  }
};

// 📊 Method: Increment view count
jobSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
  return this.views;
};

// 🎯 Static: Get active jobs by employer
jobSchema.statics.getActiveJobsByEmployer = async function(employerId) {
  return this.find({ 
    employer: employerId, 
    isActive: true 
  }).populate('company', 'name logo industry');
};

// 🎯 Static: Get featured active jobs
jobSchema.statics.getFeaturedJobs = async function(limit = 6) {
  return this.find({ 
    isFeatured: true, 
    isActive: true 
  })
    .populate('company', 'name logo industry')
    .populate('employer', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// 🎯 Static: Search jobs with filters
jobSchema.statics.searchJobs = async function(filters = {}, page = 1, limit = 10) {
  const {
    search,
    location,
    jobType,
    category,
    salaryMin,
    experience,
    education,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const query = { isActive: true };

  // Text search
  if (search) {
    query.$text = { $search: search };
  }

  // Location filter
  if (location) {
    query.location = new RegExp(location, 'i');
  }

  // Job type filter
  if (jobType) {
    query.jobType = jobType;
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Salary filter
  if (salaryMin) {
    query.$or = [
      { salaryMin: { $gte: parseInt(salaryMin) } },
      { salary: { $regex: salaryMin, $options: 'i' } }
    ];
  }

  // Experience filter
  if (experience) {
    query.experience = experience;
  }

  // Education filter
  if (education) {
    query.edducation = education;
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const jobs = await this.find(query)
    .populate('company', 'name logo industry')
    .populate('employer', 'name email')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    jobs,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  };
};

// 🎯 Middleware: Update company job count when job is created/deleted
jobSchema.post('save', async function(doc) {
  try {
    const Company = mongoose.model('Company');
    if (doc.isNew) {
      // Job mới được tạo - tăng count
      await Company.findByIdAndUpdate(doc.company, {
        $inc: { jobCount: 1 }
      });
    }
  } catch (error) {
    console.error('Error updating company job count after save:', error);
  }
});

jobSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      const Company = mongoose.model('Company');
      // Job bị xóa - giảm count
      await Company.findByIdAndUpdate(doc.company, {
        $inc: { jobCount: -1 }
      });
    }
  } catch (error) {
    console.error('Error updating company job count after delete:', error);
  }
});

// 🎯 Transform: Customize JSON output
jobSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Job', jobSchema);