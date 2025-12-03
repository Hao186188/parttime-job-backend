import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverLetter: {
    type: String,
    maxlength: [1000, 'Cover letter cannot be more than 1000 characters']
  },
  resume: String,
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  interviewDate: Date,
  interviewLocation: String
}, { timestamps: true });

// 🧩 Ngăn ứng viên nộp 2 lần cho 1 job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// 📈 Tự động tăng số lượng ứng tuyển khi có ứng viên mới
applicationSchema.post('save', async function () {
  const Job = mongoose.model('Job');
  await Job.findByIdAndUpdate(this.job, {
    $inc: { applicationCount: 1 }
  });
});

// 📉 Giảm khi ứng viên rút đơn
applicationSchema.post('remove', async function () {
  const Job = mongoose.model('Job');
  await Job.findByIdAndUpdate(this.job, {
    $inc: { applicationCount: -1 }
  });
});

const Application = mongoose.model('Application', applicationSchema);
export default Application;
