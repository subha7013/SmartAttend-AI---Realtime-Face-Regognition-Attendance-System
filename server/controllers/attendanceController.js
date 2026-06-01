const User = require('../models/User');
const Attendance = require('../models/Attendance');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');

// Helper to get local date and time strings
const getLocalDateTimeStrings = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(now - offset).toISOString();
  return {
    dateStr: localISOTime.split('T')[0], // YYYY-MM-DD
    timeStr: localISOTime.split('T')[1].substring(0, 5), // HH:MM
  };
};

// @desc    Receive webcam frame, run face recognition, mark attendance
// @route   POST /api/attendance/recognize
// @access  Private/Admin
exports.recognizeAndMark = async (req, res) => {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ success: false, message: 'Webcam snapshot file is required' });
    }

    // 1. Get all students with registered embeddings from DB
    const students = await User.find({
      role: 'student',
      faceEmbeddings: { $exists: true, $not: { $size: 0 } },
    }).select('_id name rollNo department faceEmbeddings');

    if (students.length === 0) {
      return res.status(200).json({
        success: true,
        faces_count: 0,
        matches: [],
        message: 'No students enrolled with face templates yet.',
      });
    }

    // 2. Prepare payload for AI service
    const knownStudentsPayload = students.map((s) => ({
      studentId: s._id.toString(),
      embeddings: s.faceEmbeddings,
    }));

    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('file', blob, 'frame.jpg');
    formData.append('known_students_json', JSON.stringify(knownStudentsPayload));

    // 3. Post to AI Service
    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/recognize`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const { matches, faces_count } = aiResponse.data;
    const processedMatches = [];
    const { dateStr, timeStr } = getLocalDateTimeStrings();

    // 4. Map results and mark attendance
    for (const match of matches) {
      const matchData = {
        box: match.box,
        confidence: match.confidence,
        studentId: match.studentId,
        name: 'Unknown',
        rollNo: '',
        department: '',
        status: 'Unknown',
      };

      if (match.studentId && match.studentId !== 'unknown') {
        // Find student details
        const student = students.find((s) => s._id.toString() === match.studentId);
        if (student) {
          matchData.name = student.name;
          matchData.rollNo = student.rollNo;
          matchData.department = student.department;

          // Check if attendance already marked for today by this teacher
          const alreadyMarked = await Attendance.findOne({
            student: student._id,
            date: dateStr,
            markedBy: req.user._id,
          });

          if (alreadyMarked) {
            matchData.status = 'Already Marked';
          } else {
            // Log as present
            await Attendance.create({
              student: student._id,
              date: dateStr,
              time: timeStr,
              status: 'Present',
              markedBy: req.user._id,
            });
            matchData.status = 'Marked Present';
          }
        }
      } else {
        matchData.status = 'Not Enrolled';
      }

      processedMatches.push(matchData);
    }

    res.json({
      success: true,
      faces_count,
      matches: processedMatches,
    });
  } catch (error) {
    console.error('Attendance recognition error:', error.message || error.code || error);
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    res.status(500).json({
      success: false,
      message: 'Face recognition or DB operation failed. Ensure AI service is online.',
    });
  }
};

// @desc    Get all attendance logs with filters
// @route   GET /api/attendance/logs
// @access  Private/Admin
exports.getAttendanceLogs = async (req, res) => {
  const { date, department, search } = req.query;
  // Admin can view logs for all teachers; teachers only see their own logs
  const teacherId = req.user.role === 'teacher' ? req.user._id : undefined;

  try {
    let studentMatchQuery = { role: 'student' };
    if (department) {
      studentMatchQuery.department = department;
    }
    if (search) {
      studentMatchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
      ];
    }

    const studentIds = await User.find(studentMatchQuery).distinct('_id');

    let query = { student: { $in: studentIds } };
    if (date) {
      query.date = date;
    }
    if (teacherId) {
      query.markedBy = teacherId;
    }

    const logs = await Attendance.find(query)
      .populate('student', 'name rollNo department email')
      .populate('markedBy', 'name email')
      .sort({ date: -1, time: -1 });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Stats for Dashboard analytics
// @route   GET /api/attendance/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    const { dateStr } = getLocalDateTimeStrings();

    // 1. Total Enrolled Students
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Find the count of unique sessions held today (grouped by date and markedBy)
    const uniqueTeachersToday = await Attendance.distinct('markedBy', { date: dateStr });
    const totalClassesToday = uniqueTeachersToday.length;

    let presentToday = 0;
    let absentToday = 0;
    let attendanceRate = 100; // default to 100 if no classes held today

    if (totalClassesToday > 0) {
      // Count distinct students present today across all sessions
      const presentStudentIds = await Attendance.distinct('student', { date: dateStr, status: 'Present' });
      presentToday = presentStudentIds.length;
      // Simple absent calculation based on total enrolled students
      absentToday = totalStudents - presentToday;
      // Attendance rate based on total students
      attendanceRate = (presentToday / totalStudents) * 100;
    }

    // 3. Department-wise stats for today
    const departments = await User.distinct('department', { role: 'student' });
    const deptStats = [];

    for (const dept of departments) {
      const deptStudents = await User.find({ role: 'student', department: dept }).distinct('_id');
      const deptTotal = deptStudents.length;

      let deptPresent = 0;
      let deptAbsent = 0;
      let deptTotalCount = 0;

      if (totalClassesToday > 0) {
        const deptPresentStudentIds = await Attendance.distinct('student', {
        date: dateStr,
        status: 'Present',
        student: { $in: deptStudents },
      });
      deptPresent = deptPresentStudentIds.length;
      deptTotalCount = deptTotal;
        deptAbsent = deptTotal - deptPresent;
      }

      deptStats.push({
        department: dept,
        total: deptTotalCount,
        present: deptPresent,
        absent: deptAbsent,
        rate: deptTotalCount > 0 ? (deptPresent / deptTotalCount) * 100 : 0,
      });
    }

    // 4. Last 7 days attendance trend
    const trendStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const formattedDate = new Date(d - tzOffset).toISOString().split('T')[0];

      const uniqueTeachersOnDay = await Attendance.distinct('markedBy', { date: formattedDate });
      const totalClassesOnDay = uniqueTeachersOnDay.length;

      let presentCount = 0;
      let absentCount = 0;

      if (totalClassesOnDay > 0) {
        presentCount = await Attendance.countDocuments({
          date: formattedDate,
          status: 'Present',
        });
        absentCount = (totalStudents * totalClassesOnDay) - presentCount;
      }

      trendStats.push({
        date: formattedDate,
        present: presentCount,
        absent: absentCount,
      });
    }

    // 5. Get list of absent students today (students who missed at least one class session held today)
    const allStudents = await User.find({ role: 'student' }).select('_id name rollNo department email');
    const absentStudents = [];

    if (totalClassesToday > 0) {
      for (const student of allStudents) {
        const attendedCount = await Attendance.countDocuments({
          student: student._id,
          date: dateStr,
          status: 'Present',
        });
        // Include student only if they have zero present records today
        if (attendedCount === 0) {
          absentStudents.push({
            _id: student._id,
            name: student.name,
            rollNo: student.rollNo,
            department: student.department,
            email: student.email,
            missedCount: totalClassesToday, // they missed all sessions
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalStudents,
          presentToday,
          absentToday,
          attendanceRate: round(attendanceRate, 2),
        },
        absentStudentsToday: absentStudents,
        departmentStats: deptStats,
        weeklyTrend: trendStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Email warning notifications to students with low attendance
// @route   POST /api/attendance/email-low-attendance
// @access  Private/Admin
// @desc    Get absent students for the logged‑in teacher today
// @route   GET /api/attendance/absent-today
// @access  Private/Teacher
// @desc    Get total attendance for all students
// @route   GET /api/attendance/total-attendance
// @access  Private/Admin
exports.getTeacherAbsentStudents = async (req, res) => {
  try {
    const { dateStr } = getLocalDateTimeStrings(); // today
    const teacherId = req.user._id;

    // Students marked present for this teacher today
    const presentStudentIds = await Attendance.find({
      date: dateStr,
      markedBy: teacherId,
      status: 'Present',
    }).distinct('student');

    const allStudents = await User.find({ role: 'student' })
      .select('_id name rollNo department email');

    const absentStudents = allStudents.filter(
      (s) => !presentStudentIds.includes(s._id.toString())
    );

    res.json({ success: true, date: dateStr, absentStudents });
  } catch (error) {
    console.error('Teacher absent fetch error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.emailLowAttendance = async (req, res) => {
  const { threshold = 75 } = req.body;

  try {
    // 1. Get all students
    const students = await User.find({ role: 'student' }).select('_id name email rollNo department');

    // 2. Get all unique class sessions to know total class sessions held
    const uniqueSessions = await Attendance.aggregate([
      {
        $group: {
          _id: { date: "$date", markedBy: "$markedBy" }
        }
      }
    ]);
    const totalDays = uniqueSessions.length;

    if (totalDays === 0) {
      return res.json({
        success: true,
        message: 'No classes have been logged yet. Attendance is clean.',
        emailedCount: 0,
        emailedStudents: [],
      });
    }

    const lowAttendanceStudents = [];

    // 3. Evaluate each student's attendance rate
    for (const student of students) {
      const presentCount = await Attendance.countDocuments({
        student: student._id,
        status: 'Present',
      });

      const attendanceRate = (presentCount / totalDays) * 100;

      if (attendanceRate < threshold) {
        // Send SMTP warning email
        const subject = 'WARNING: Low Attendance Warning Alert';
        const message = `Dear ${student.name} (${student.rollNo}),\n\n` +
          `Your current attendance in the ${student.department} department is ${attendanceRate.toFixed(2)}%.\n` +
          `This is below the minimum required class attendance of ${threshold}%.\n\n` +
          `Please contact your professor or department head immediately.\n\n` +
          `Best regards,\nSmartAttend System`;

        const html = `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
    
    <div style="background-color: #070a13; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 25px;">
      <h1 style="margin: 0; font-size: 26px; font-weight: 800; tracking-tight;">
        <span style="color: #ffffff;">Smart</span><span style="color: #dfff0cff;">Attend AI</span>
      </h1>
      <span style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">AI Attendance System</span>
    </div>

    <h2 style="color: #d9534f; margin-bottom: 15px; font-size: 20px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px;">
      Low Attendance Alert
    </h2>

    <p style="font-size: 15px; margin-bottom: 15px;">
      Dear <strong>${student.name}</strong> (${student.rollNo}),
    </p>

    <p style="font-size: 15px; margin-bottom: 15px;">
      Your current attendance in the <strong>${student.department}</strong> department is 
      <span style="color: #d9534f; font-weight: bold; font-size: 16px;">
        ${attendanceRate.toFixed(2)}%
      </span>.
    </p>
    <p style="font-size: 15px; margin-bottom: 15px;">
      This is below the minimum required class attendance of <strong>${threshold}%</strong>.
    </p>
    <p style="font-size: 15px; margin-bottom: 25px;">
      Please contact your department head immediately to address this issue.
    </p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #777; text-align: center; margin: 0;">
      This is an automated notification from the SmartAttend System.
    </p>
  </div>
`;

        try {
          await sendEmail({
            email: student.email,
            subject,
            message,
            html,
          });
        } catch (mailError) {
          console.error(`Failed to send warning email to ${student.email}:`, mailError.message || mailError);
        }

        lowAttendanceStudents.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNo: student.rollNo,
          department: student.department,
          attendanceRate: Number(attendanceRate.toFixed(2)),
          presentCount,
          totalDays,
        });
      }
    }

    res.json({
      success: true,
      message: `Warning emails sent successfully to ${lowAttendanceStudents.length} students below ${threshold}% attendance.`,
      emailedCount: lowAttendanceStudents.length,
      emailedStudents: lowAttendanceStudents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get list of students with low attendance below a threshold
// @route   GET /api/attendance/low-attendance
// @access  Private/Admin
exports.getLowAttendance = async (req, res) => {
  const threshold = Number(req.query.threshold) || 75;

  try {
    const students = await User.find({ role: 'student' }).select('_id name email rollNo department');
    // 2. Get all unique class sessions to know total class sessions held
    const uniqueSessions = await Attendance.aggregate([
      {
        $group: {
          _id: { date: "$date", markedBy: "$markedBy" }
        }
      }
    ]);
    const totalDays = uniqueSessions.length;

    if (totalDays === 0) {
      return res.json({ success: true, count: 0, students: [] });
    }

    const lowAttendanceStudents = [];
    const allStudents = [];

    for (const student of students) {
      const presentCount = await Attendance.countDocuments({
        student: student._id,
        status: 'Present',
      });

      const attendanceRate = (presentCount / totalDays) * 100;

      const studentInfo = {
        _id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        department: student.department,
        attendanceRate: Number(attendanceRate.toFixed(2)),
        presentCount,
        totalDays,
      };

      allStudents.push(studentInfo);
      if (attendanceRate < threshold) {
        lowAttendanceStudents.push(studentInfo);
      }
    }

    res.json({ success: true, count: lowAttendanceStudents.length, students: lowAttendanceStudents, all: allStudents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const round = (value, decimals) => {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
};
