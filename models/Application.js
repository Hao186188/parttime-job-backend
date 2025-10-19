const mongoose = require('mongoose');

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
  resume: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  interviewDate: {
    type: Date
  },
  interviewLocation: {
    type: String
  }
}, {
  timestamps: true
});

// Prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// Update job application count when application is saved
applicationSchema.post('save', async function() {
  const Job = mongoose.model('Job');
  await Job.findByIdAndUpdate(this.job, { 
    $inc: { applicationCount: 1 } 
  });
});

// Update job application count when application is removed
applicationSchema.post('remove', async function() {
  const Job = mongoose.model('Job');
  await Job.findByIdAndUpdate(this.job, { 
    $inc: { applicationCount: -1 } 
  });
});

module.exports = mongoose.model('Application', applicationSchema);