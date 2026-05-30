const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
  },
  time: {
    type: String, // format HH:MM
    required: true,
  },
  status: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Present',
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a student can have only one attendance record per teacher per day
AttendanceSchema.index({ student: 1, date: 1, markedBy: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
