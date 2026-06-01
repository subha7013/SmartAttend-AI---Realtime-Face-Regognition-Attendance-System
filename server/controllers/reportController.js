const User = require('../models/User');
const Attendance = require('../models/Attendance');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Helper to query filtered attendance logs
const fetchLogs = async (date, department, search, teacherId, reqUser) => {
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

  return await Attendance.find(query)
    .populate('student', 'name rollNo department email')
    .populate('markedBy', 'name email')
    .sort({ date: -1, time: -1 });
};

// Helper to get branding configuration based on requesting user
const getAppBranding = (user) => {
  const email = user && user.email ? user.email.toLowerCase() : '';
  if (email.endsWith('@smartattend.com') || email.includes('SmartAtttend AI')) {
    return {
      name: 'SmartAtttend AI',
      title: 'SmartAtttend AI - Attendance Report',
      footer: 'SmartAtttend AI. All Rights Reserved.',
      primaryColor: '#064E3B', // Dark Forest Green
      primaryColorArgb: '064E3B',
      secondaryColor: '#10B981', // Emerald Green
      secondaryColorArgb: '10B981',
      accentColorHex: '#FBBF24', // Amber/Yellow
      logoTextPart1: 'Smart',
      logoTextPart2: 'Attend AI',
      logoSubtext: 'Real-Time Face Recognition Attendance Management System'
    };
  }
  // Default to SmartAttend AI
  return {
    name: 'SmartAttend AI',
    title: 'SmartAttend AI - Attendance Report',
    footer: 'SmartAttend AI. All Rights Reserved.',
    primaryColor: '#1E3A8A', // Slate Blue / Dark Navy
    primaryColorArgb: '1E3A8A',
    secondaryColor: '#3B82F6', // Modern primary Blue
    secondaryColorArgb: '3B82F6',
    accentColorHex: '#FBBF24', // Amber/Yellow
    logoTextPart1: 'Smart',
    logoTextPart2: 'Attend AI',
    logoSubtext: 'Real-Time Face Recognition Attendance Management System'
  };
};

// @desc    Export attendance logs to Excel
// @route   GET /api/attendance/export/excel
// @access  Private/Admin
exports.exportExcel = async (req, res) => {
  const { date, department, search } = req.query;
  // Admin can export all, teachers only their own data
  const teacherId = req.user.role === 'teacher' ? req.user._id : undefined;


  try {
    const logs = await fetchLogs(date, department, search, teacherId, req.user);
    const branding = getAppBranding(req.user);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Title Row
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${branding.name} - Attendance Report (${date || 'All Time'})`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: branding.primaryColorArgb },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 40;

    // Subtitle Row
    worksheet.mergeCells('A2:G2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Exported on: ${new Date().toLocaleString()} | Department: ${department || 'All'} | Search Query: ${search || 'None'}`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // Spacer Row
    worksheet.getRow(3).height = 10;

    // Headers
    const headers = ['S.No', 'Date', 'Time', 'Student Name', 'Roll Number', 'Department', 'Marked By'];
    worksheet.getRow(4).values = headers;
    worksheet.getRow(4).height = 25;

    // Format Headers
    worksheet.getRow(4).eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: branding.secondaryColorArgb },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add Data
    let count = 1;
    logs.forEach((log) => {
      const rowValues = [
        count++,
        log.date,
        log.time,
        log.student ? log.student.name : 'Unknown',
        log.student ? log.student.rollNo : 'N/A',
        log.student ? log.student.department : 'N/A',
        log.markedBy ? log.markedBy.name : 'N/A',
      ];
      const addedRow = worksheet.addRow(rowValues);
      addedRow.height = 20;

      // Formatting row cells
      addedRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } },
        };
        // Center-align index, date, time
        if (colNumber <= 3 || colNumber === 5 || colNumber === 6) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Auto-fit Columns
    worksheet.columns.forEach((column, i) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? cell.value.toString() : '';
        if (valStr.length > maxLength) {
          maxLength = valStr.length;
        }
      });
      column.width = Math.max(maxLength + 4, 12);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_report_${date || 'all'}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({ success: false, message: 'Could not generate Excel file' });
  }
};

// @desc    Export attendance logs to PDF
// @route   GET /api/attendance/export/pdf
// @access  Private/Admin
exports.exportPDF = async (req, res) => {
  const { date, department, search } = req.query;
  // Admin can export all, teachers only their own data
  const teacherId = req.user.role === 'teacher' ? req.user._id : undefined;


  try {
    const logs = await fetchLogs(date, department, search, teacherId, req.user);
    const branding = getAppBranding(req.user);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_report_${date || 'all'}.pdf`
    );

    doc.pipe(res);

    // Header Background Accent
    doc.rect(0, 0, 595, 100).fill(branding.primaryColor);

    // Header Title
    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(branding.logoTextPart1, 40, 30, { continued: true })
      .fillColor(branding.accentColorHex)
      .text(branding.logoTextPart2);

    doc.fontSize(10)
      .fillColor('#FFFFFF')
      .font('Helvetica-Oblique')
      .text(branding.logoSubtext, 40, 55);

    // Export Meta Info (Right aligned in header)
    doc.fillColor('#FFFFFF')
      .font('Helvetica')
      .fontSize(9)
      .text(`Date Filter: ${date || 'All Time'}`, 400, 30, { align: 'right', width: 155 })
      .text(`Department: ${department || 'All'}`, 400, 45, { align: 'right', width: 155 })
      .text(`Exported: ${new Date().toLocaleDateString()}`, 400, 60, { align: 'right', width: 155 });

    // Table Content Setup
    const startY = 130;
    const tableHeaderY = startY;
    const colWidths = {
      sNo: 35,
      date: 70,
      time: 55,
      name: 130,
      rollNo: 80,
      dept: 80,
      markedBy: 65,
    };
    const colPositions = {
      sNo: 40,
      date: 40 + colWidths.sNo,
      time: 40 + colWidths.sNo + colWidths.date,
      name: 40 + colWidths.sNo + colWidths.date + colWidths.time,
      rollNo: 40 + colWidths.sNo + colWidths.date + colWidths.time + colWidths.name,
      dept: 40 + colWidths.sNo + colWidths.date + colWidths.time + colWidths.name + colWidths.rollNo,
      markedBy: 40 + colWidths.sNo + colWidths.date + colWidths.time + colWidths.name + colWidths.rollNo + colWidths.dept,
    };

    // Draw Table Header Background
    doc.rect(40, tableHeaderY, 515, 20).fill(branding.secondaryColor);

    // Table Header Labels
    doc.fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(9);

    doc.text('S.No', colPositions.sNo + 5, tableHeaderY + 6);
    doc.text('Date', colPositions.date + 5, tableHeaderY + 6);
    doc.text('Time', colPositions.time + 5, tableHeaderY + 6);
    doc.text('Student Name', colPositions.name + 5, tableHeaderY + 6);
    doc.text('Roll Number', colPositions.rollNo + 5, tableHeaderY + 6);
    doc.text('Department', colPositions.dept + 5, tableHeaderY + 6);
    doc.text('Marked By', colPositions.markedBy + 5, tableHeaderY + 6);

    let currentY = tableHeaderY + 20;

    // Draw Rows
    doc.fillColor('#1F2937').font('Helvetica').fontSize(9);

    let count = 1;
    logs.forEach((log, index) => {
      // Create new page if table runs out of page boundaries
      if (currentY > 750) {
        doc.addPage();

        // Redraw Header on new page
        doc.rect(40, 40, 515, 20).fill(branding.secondaryColor);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('S.No', colPositions.sNo + 5, 46);
        doc.text('Date', colPositions.date + 5, 46);
        doc.text('Time', colPositions.time + 5, 46);
        doc.text('Student Name', colPositions.name + 5, 46);
        doc.text('Roll Number', colPositions.rollNo + 5, 46);
        doc.text('Department', colPositions.dept + 5, 46);
        doc.text('Marked By', colPositions.markedBy + 5, 46);

        currentY = 60;
        doc.fillColor('#1F2937').font('Helvetica').fontSize(9);
      }

      // Zebra striping backgrounds
      if (index % 2 === 1) {
        doc.rect(40, currentY, 515, 26).fill('#F3F4F6');
        doc.fillColor('#1F2937'); // reset fill
      }

      // Draw Row Borders (bottom line)
      doc.moveTo(40, currentY + 26)
        .lineTo(555, currentY + 22)
        .strokeColor('#E5E7EB')
        .lineWidth(0.5)
        .stroke();

      // Write row cells
      doc.text(count.toString(), colPositions.sNo + 5, currentY + 5);
      doc.text(log.date, colPositions.date + 5, currentY + 5);
      doc.text(log.time, colPositions.time + 5, currentY + 5);
      doc.text(log.student ? log.student.name : 'Unknown', colPositions.name + 5, currentY + 5);
      doc.text(log.student ? log.student.rollNo : 'N/A', colPositions.rollNo + 5, currentY + 5);
      doc.text(log.student ? log.student.department : 'N/A', colPositions.dept + 5, currentY + 5);
      doc.text(log.markedBy ? log.markedBy.name : 'N/A', colPositions.markedBy + 5, currentY + 5);

      currentY += 26;
      count++;
    });

    // Page numbers
const pages = doc.bufferedPageRange();
for (let i = pages.start; i < pages.start + pages.count; i++) {
  doc.switchToPage(i);
  const pageNumber = i - pages.start + 1;
  doc.fillColor('#9CA3AF')
    .fontSize(8)
    .text(
      `Page ${pageNumber} of ${pages.count} | ${branding.footer}`,
      40,
      800,
      { align: 'center', width: 515 }
    );
}

    doc.end();
  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({ success: false, message: 'Could not generate PDF file' });
  }
};
