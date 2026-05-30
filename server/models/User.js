const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function() {
      return this.role === 'admin' || this.role === 'teacher';
    },
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student'],
    default: 'student',
  },
  // Teacher-specific fields
  designation: {
    type: String,
    required: function() {
      return this.role === 'teacher';
    },
    trim: true,
  },
  // Student-specific fields
  rollNo: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true, // Allows multiple null/undefined values for admins
    trim: true,
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    trim: true,
  },
  faceEmbeddings: {
    type: [[Number]], // Array of 128-D vectors
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving if modified
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
