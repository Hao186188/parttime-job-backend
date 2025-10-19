import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  requirements: {
    type: String,
    maxlength: [1000, 'Requirements cannot be more than 1000 characters']
  },
  benefits: {
    type: String,
    maxlength: [1000, 'Benefits cannot be more than 1000 characters']
  },
  salary: {
    type: String,
    required: [true, 'Salary information is required']
  },
  salaryMin: Number,
  salaryMax: Number,
  salaryType: {
    type: String,
    enum: ['hourly', 'daily', 'monthly', 'project'],
    default: 'hourly'
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  address: {
    type: String,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  jobType: {
    type: String,
    enum: ['Bán thời gian', 'Toàn thời gian', 'Thực tập', 'Freelance'],
    required: true
  },
  category: {
    type: String,
    enum: ['Phục vụ', 'Bán hàng', 'Gia sư', 'Công nghệ', 'Giao hàng', 'Văn phòng', 'Khác'],
    required: true
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
    required: true
  },
  contactPhone: String,
  applicationDeadline: Date,
  workHours: String,
  vacancies: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: String,
    enum: ['Không yêu cầu', 'Dưới 1 năm', '1-2 năm', 'Trên 2 năm']
  },
  education: {
    type: String,
    enum: ['Không yêu cầu', 'THPT', 'Trung cấp', 'Cao đẳng', 'Đại học']
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
}, { timestamps: true });

// 🔍 Tạo index để hỗ trợ tìm kiếm
jobSchema.index({
  title: 'text',
  description: 'text',
  requirements: 'text'
});

// ⚙️ Virtual: kiểm tra hết hạn
jobSchema.virtual('isExpired').get(function () {
  if (!this.applicationDeadline) return false;
  return new Date() > this.applicationDeadline;
});

// 📊 Cập nhật số lượng ứng tuyển
jobSchema.methods.updateApplicationCount = async function () {
  const Application = mongoose.model('Application');
  const count = await Application.countDocuments({ job: this._id });
  this.applicationCount = count;
  await this.save();
};

const Job = mongoose.model('Job', jobSchema);
export default Job;
