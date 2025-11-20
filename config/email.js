const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    // ✅ ADD THESE TIMEOUT SETTINGS
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendEmail = async (options) => {
  let transporter;
  try {
    transporter = createTransporter();
    const mailOptions = {
      from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    console.log("📧 Attempting to send email to:", options.email);
    
    const emailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email timeout after 15 seconds')), 15000);
    });
    
    const info = await Promise.race([emailPromise, timeoutPromise]);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("❌ Email error:", error.message);
    if (transporter) transporter.close();
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
