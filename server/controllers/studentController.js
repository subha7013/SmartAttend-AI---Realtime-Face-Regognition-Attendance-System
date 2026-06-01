const User = require('../models/User');
const axios = require('axios');

// @desc    Register a new student
// @route   POST /api/students
// @access  Private/Admin
exports.createStudent = async (req, res) => {
  const { name, email, rollNo, department } = req.body;
  const files = req.files; // Uploaded via multer

  try {
    if (!name || !email || !rollNo || !department) {
      return res.status(400).json({ success: false, message: 'All student details are required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one face photo is required for registration' });
    }

    // Check if student or email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const rollExists = await User.findOne({ rollNo, role: 'student' });
    if (rollExists) {
      return res.status(400).json({ success: false, message: 'Roll number is already registered' });
    }

    const faceEmbeddings = [];

    // Loop through uploaded photos and extract embeddings via Python AI Service
    for (const file of files) {
      try {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('file', blob, file.originalname);

        const response = await axios.post(
          `${process.env.AI_SERVICE_URL}/extract-embeddings`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        const result = response.data;
        if (result.faces_count === 0) {
          return res.status(400).json({
            success: false,
            message: `No face detected in photo: ${file.originalname}. Please upload clear face images.`,
          });
        }
        if (result.faces_count > 1) {
          return res.status(400).json({
            success: false,
            message: `Multiple faces detected in photo: ${file.originalname}. Please upload photos with exactly one face.`,
          });
        }

        // Push the 128-D face embedding vector
        faceEmbeddings.push(result.embeddings[0]);
      } catch (err) {
        console.error(`AI Extraction Error for ${file.originalname}:`, err.message || err.code || err);
        if (err.cause) {
          console.error('Error cause:', err.cause);
        }
        return res.status(500).json({
          success: false,
          message: `AI service embedding extraction failed for ${file.originalname}. Ensure the AI service is running.`,
        });
      }
    }

    // Create Student User
    const student = await User.create({
      name,
      email,
      rollNo,
      department,
      role: 'student',
      faceEmbeddings,
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        department: student.department,
        embeddingsCount: student.faceEmbeddings.length,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin
exports.getStudents = async (req, res) => {
  const { search, department } = req.query;

  try {
    let query = { role: 'student' };

    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(query)
      .select('-password')
      .sort({ name: 1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private/Admin
exports.getStudentById = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password');
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student details
// @route   PUT /api/students/:id
// @access  Private/Admin
exports.updateStudent = async (req, res) => {
  const { name, email, rollNo, department } = req.body;
  const files = req.files;

  try {
    let student = await User.findOne({ _id: req.params.id, role: 'student' });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check unique rollNo if updated
    if (rollNo && rollNo !== student.rollNo) {
      const rollExists = await User.findOne({ rollNo, role: 'student' });
      if (rollExists) {
        return res.status(400).json({ success: false, message: 'Roll number is already registered' });
      }
      student.rollNo = rollNo;
    }

    // Check unique email if updated
    if (email && email !== student.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }
      student.email = email;
    }

    if (name) student.name = name;
    if (department) student.department = department;

    // If new face photos are uploaded, extract and replace embeddings
    if (files && files.length > 0) {
      const faceEmbeddings = [];
      for (const file of files) {
        try {
          const formData = new FormData();
          const blob = new Blob([file.buffer], { type: file.mimetype });
          formData.append('file', blob, file.originalname);

          const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/extract-embeddings`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          const result = response.data;
          if (result.faces_count !== 1) {
            return res.status(400).json({
              success: false,
              message: `Invalid number of faces (${result.faces_count}) detected in photo: ${file.originalname}. Must have exactly 1 face.`,
            });
          }
          faceEmbeddings.push(result.embeddings[0]);
        } catch (err) {
          console.error(`AI Extraction Error for ${file.originalname}:`, err.message || err.code || err);
          if (err.cause) {
            console.error('Error cause:', err.cause);
          }
          return res.status(500).json({
            success: false,
            message: `AI service embedding extraction failed for ${file.originalname}. Ensure the AI service is running.`,
          });
        }
      }
      student.faceEmbeddings = faceEmbeddings;
    }

    await student.save();
    res.json({ success: true, message: 'Student profile updated successfully', data: student });
  } catch (error) {
    console.error('Update student error:', error.message || error.code || error);
    res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

// @desc    Delete student profile
// @route   DELETE /api/students/:id
// @access  Private/Admin
exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Clean up student's attendance records too
    const Attendance = require('../models/Attendance');
    await Attendance.deleteMany({ student: student._id });

    res.json({ success: true, message: 'Student and attendance history deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
