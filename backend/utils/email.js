const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>You requested a password reset for your Video Conferencing account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>Video Conferencing Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send meeting invitation email
const sendMeetingInvitation = async (email, username, meetingTitle, meetingLink, hostName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Meeting Invitation: ${meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Meeting Invitation</h2>
          <p>Hello ${username},</p>
          <p>You have been invited to join a meeting by ${hostName}.</p>
          <h3>Meeting Details:</h3>
          <p><strong>Title:</strong> ${meetingTitle}</p>
          <p>Click the button below to join the meeting:</p>
          <a href="${meetingLink}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Join Meeting</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${meetingLink}</p>
          <p>Best regards,<br>Video Conferencing Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Meeting invitation sent to ${email}`);
  } catch (error) {
    console.error('Error sending meeting invitation:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendMeetingInvitation
}; 