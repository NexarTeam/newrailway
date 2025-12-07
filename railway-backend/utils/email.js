const { Resend } = require('resend');

const FROM_EMAIL = 'NexarOS <hello@nexargames.co.uk>';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  return new Resend(apiKey);
}

async function sendVerificationEmail(toEmail, username, token) {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    console.error("❌ BASE_URL is missing in backend environment!");
    return false;
  }

  const verifyUrl = `${baseUrl}/verify?token=${token}`;
  console.log("📨 Sending verification email with URL:", verifyUrl);

  const resend = getResendClient();

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: "Verify your NexarOS account",
      html: `
        <div style="font-family: Arial; background: #111; padding: 40px; color: #fff; border-radius: 8px;">
          <h1 style="color: #ff1744;">Welcome to NexarOS, ${username}!</h1>
          <p>Please verify your email to unlock all features.</p>
          <a href="${verifyUrl}" 
            style="display:inline-block; padding:12px 24px; background:#ff1744; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Verify Email
          </a>
          <p style="color:#bbb; margin-top:20px;">Or copy this link:</p>
          <a href="${verifyUrl}" style="color:#4dabf7;">${verifyUrl}</a>
        </div>
      `,
    });

    return true;
  } catch (err) {
    console.error("❌ Email send failed:", err);
    return false;
  }
}

module.exports = { sendVerificationEmail };
