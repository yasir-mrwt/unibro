// Welcome email template
const welcomeEmail = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Welcome to Unibro!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for joining Unibro! We're excited to have you on board.</p>
          <p>Your account has been successfully verified. You can now access all our courses and learning materials.</p>
          <p>Start exploring our courses and begin your learning journey today!</p>
          <p style="margin-top: 30px;">Happy Learning! 📚</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Verification email template
const verificationEmail = (name, verificationUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Verify Your Email</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for registering with Unibro!</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </div>
          <p>Or copy this link: <br><small>${verificationUrl}</small></p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Login notification email
const loginNotification = (name, loginTime, ipAddress) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 New Login Detected</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>We detected a new login to your Unibro account.</p>
          <div class="info-box">
            <p><strong>Login Details:</strong></p>
            <p>📅 Time: ${loginTime}</p>
            <p>🌐 IP Address: ${ipAddress}</p>
          </div>
          <p>If this was you, you can safely ignore this email.</p>
          <p><strong>If this wasn't you, please secure your account immediately by changing your password.</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password reset email template
const passwordResetEmail = (name, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #2563eb; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Reset Your Password</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>We received a request to reset your Unibro account password.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Or copy this link: <br><small>${resetUrl}</small></p>
          <div class="warning">
            <p><strong>⚠️ Important:</strong></p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password reset success email
const passwordResetSuccessEmail = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed Successfully</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <div class="success-box">
            <p><strong>Your password has been changed successfully!</strong></p>
          </div>
          <p>Your Unibro account password was changed on ${new Date().toLocaleString()}.</p>
          <p>If you made this change, you can safely ignore this email.</p>
          <p><strong>If you didn't change your password, please contact our support team immediately.</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Account locked email
const accountLockedEmail = (name, unlockTime) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Account Temporarily Locked</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <div class="warning">
            <p><strong>⚠️ Security Alert:</strong></p>
            <p>Your Unibro account has been temporarily locked due to multiple failed login attempts.</p>
          </div>
          <p>For your security, your account will be automatically unlocked at:</p>
          <p><strong>${unlockTime}</strong></p>
          <p>If this wasn't you, please reset your password immediately after your account is unlocked.</p>
          <p>If you need immediate assistance, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Resource approved email
const resourceApprovedEmail = (name, resourceTitle, courseName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Resource Approved!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <div class="success-box">
            <p><strong>Great news! Your resource has been approved and is now live!</strong></p>
          </div>
          <p><strong>Resource Details:</strong></p>
          <p>📚 <strong>Title:</strong> ${resourceTitle}</p>
          <p>📖 <strong>Course:</strong> ${courseName}</p>
          <p>Your contribution is now available for all students to access and download. Thank you for sharing your knowledge with the Unibro community!</p>
          <p>Keep contributing and helping fellow students succeed! 🌟</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Resource rejected email
const resourceRejectedEmail = (name, resourceTitle, courseName, reason) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Resource Review Update</h1>
        </div>
        <div class="content">
          <h2>Hi ${name},</h2>
          <p>Thank you for submitting your resource to Unibro. After review, we're unable to approve your submission at this time.</p>
          <p><strong>Resource Details:</strong></p>
          <p>📚 <strong>Title:</strong> ${resourceTitle}</p>
          <p>📖 <strong>Course:</strong> ${courseName}</p>
          <div class="warning-box">
            <p><strong>Reason for rejection:</strong></p>
            <p>${reason}</p>
          </div>
          <p>Please review the feedback and feel free to resubmit after making the necessary changes. We appreciate your contribution to the Unibro community!</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// New resource submission notification (for admins)
const newResourceSubmissionEmail = (
  adminName,
  uploaderName,
  resourceTitle,
  courseName,
  resourceType
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                  color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; 
                  color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Resource Awaiting Review</h1>
        </div>
        <div class="content">
          <h2>Hi ${adminName},</h2>
          <p>A new resource has been submitted and requires your review.</p>
          <div class="info-box">
            <p><strong>Submission Details:</strong></p>
            <p>👤 <strong>Uploaded by:</strong> ${uploaderName}</p>
            <p>📚 <strong>Title:</strong> ${resourceTitle}</p>
            <p>📖 <strong>Course:</strong> ${courseName}</p>
            <p>📁 <strong>Type:</strong> ${resourceType}</p>
          </div>
          <p>Please log in to your admin dashboard to review and approve/reject this submission.</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/admin/pending-resources" class="button">Review Resource</a>
          </div>
        </div>
        <div class="footer">
          <p>&copy; 2024 Unibro. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  welcomeEmail,
  verificationEmail,
  loginNotification,
  passwordResetEmail,
  passwordResetSuccessEmail,
  accountLockedEmail,
  resourceApprovedEmail,
  resourceRejectedEmail,
  newResourceSubmissionEmail,
};
