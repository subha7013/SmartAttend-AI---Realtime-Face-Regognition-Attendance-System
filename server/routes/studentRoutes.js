const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { protect, admin, teacherOrAdmin } = require('../middleware/auth');

// Multer memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

router.use(protect);

router.post('/', admin, upload.array('photos', 10), createStudent);
router.get('/', teacherOrAdmin, getStudents);
router.get('/:id', teacherOrAdmin, getStudentById);
router.put('/:id', teacherOrAdmin, upload.array('photos', 10), updateStudent);
router.delete('/:id', admin, deleteStudent);

module.exports = router;
