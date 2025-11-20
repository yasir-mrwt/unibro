const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    console.log('📧 Attempting to send email via Resend to:', options.email);
    console.log('📧 Subject:', options.subject);
    
    const { data, error } = await resend.emails.send({
      from: 'Unibro <onboarding@resend.dev>', // You can customize this later
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent successfully via Resend! ID:', data.id);
    return { success: true, messageId: data.id };
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
