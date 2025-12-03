import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    match: [/^(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})\b$/, 'Please enter a valid Vietnamese phone number']
  },
  userType: {
    type: String,
    enum: ['student', 'employer'],
    required: true
  },
  avatar: { type: String, default: null },
  dateOfBirth: { type: Date },
  address: { type: String, maxlength: [200, 'Address cannot be more than 200 characters'] },
  bio: { type: String, maxlength: [500, 'Bio cannot be more than 500 characters'] },
  school: { type: String, maxlength: [100, 'School name cannot be more than 100 characters'] },
  major: { type: String, maxlength: [100, 'Major cannot be more than 100 characters'] },
  year: { type: String, enum: ['1', '2', '3', '4', 'Graduate'] },
  skills: [{ type: String, maxlength: [50, 'Skill cannot be more than 50 characters'] }],
  resume: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  position: { type: String, maxlength: [100, 'Position cannot be more than 100 characters'] },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

// 🔐 Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔑 Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 🧹 Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);
