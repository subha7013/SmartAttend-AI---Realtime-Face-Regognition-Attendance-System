const nodemailer = require('nodemailer');

/**
 * Utility to send email via SMTP configuration
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Text body
 * @param {string} [options.html] - Optional HTML body
 */
const sendEmail = async (options) => {
  // Create transporter using environment config
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587 etc.
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Optional: add timeout to prevent hanging connections
    connectionTimeout: 10000, // 10 seconds
  });

  const mailOptions = {
    from: `"SmartAttend System" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP EMAIL SENT] MessageID: ${info.messageId} to ${options.email}`);
    return info;
  } catch (error) {
    console.error(`[SMTP EMAIL ERROR] Failed sending to ${options.email}:`, error.message || error);
    throw error;
  }
};

module.exports = sendEmail;
