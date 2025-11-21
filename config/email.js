const Mailjet = require("node-mailjet");

const sendEmail = async (options) => {
  try {
    console.log("📧 Attempting to send email via Mailjet to:", options.email);

    const mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_SECRET_KEY
    );

    const request = mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "yasirmarwat09@gmail.com",
            Name: "Unibro",
          },
          To: [
            {
              Email: options.email,
              Name: options.name || "User",
            },
          ],
          Subject: options.subject,
          HTMLPart: options.html,
          TextPart:
            options.text || "Please view this email in an HTML-enabled client.",
        },
      ],
    });

    const result = await request;
    console.log("✅ Email sent successfully via Mailjet!");
    return {
      success: true,
      messageId: result.body.Messages[0].To[0].MessageID,
    };
  } catch (error) {
    console.error("❌ Mailjet error:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
