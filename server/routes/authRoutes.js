const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  login,
  getMe,
  getTeachers,
  enrollTeacher,
  deleteTeacher,
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/auth');

router.post('/register', registerAdmin);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/teachers', protect, getTeachers);
router.post('/enroll-teacher', protect, admin, enrollTeacher);
router.delete('/teachers/:id', protect, admin, deleteTeacher);

module.exports = router;
