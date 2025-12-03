import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  logo: String,
  coverImage: String,
  website: {
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL']
  },
  industry: {
    type: String,
    maxlength: [100, 'Industry cannot be more than 100 characters']
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
  },
  founded: {
    type: Number,
    min: [1900, 'Founded year must be after 1900'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future']
  },
  address: {
    type: String,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  city: {
    type: String,
    required: true
  },
  district: String,
  phone: {
    type: String,
    match: [/^(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b$/, 'Please enter a valid Vietnamese phone number']
  },
  email: {
    type: String,
    required: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  taxCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  socialMedia: {
    facebook: String,
    linkedin: String,
    twitter: String
  },
  jobCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// 📊 Cập nhật số lượng công việc khi có thay đổi
companySchema.methods.updateJobCount = async function () {
  const Job = mongoose.model('Job');
  const count = await Job.countDocuments({ company: this._id, isActive: true });
  this.jobCount = count;
  await this.save();
};

const Company = mongoose.model('Company', companySchema);
export default Company;
