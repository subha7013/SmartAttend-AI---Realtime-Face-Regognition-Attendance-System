const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  recognizeAndMark,
  getAttendanceLogs,
  getStats,
  emailLowAttendance,
  getLowAttendance,
  getTeacherAbsentStudents,
} = require('../controllers/attendanceController');
const {
  exportExcel,
  exportPDF,
} = require('../controllers/reportController');
const { protect, admin, teacherOrAdmin } = require('../middleware/auth');

// Multer memory storage configuration for single frame capture upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image snapshots are allowed!'), false);
    }
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for snapshots
  },
});

router.use(protect);

router.post('/recognize', teacherOrAdmin, upload.single('file'), recognizeAndMark);
router.get('/logs', teacherOrAdmin, getAttendanceLogs);
router.get('/stats', teacherOrAdmin, getStats);
router.get('/export/excel', teacherOrAdmin, exportExcel);
router.get('/export/pdf', teacherOrAdmin, exportPDF);
router.post('/email-low-attendance', admin, emailLowAttendance);
router.get('/low-attendance', admin, getLowAttendance);
router.get('/absent-today', teacherOrAdmin, getTeacherAbsentStudents);

module.exports = router;
