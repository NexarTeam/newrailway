const { Resend } = require('resend');

const FROM_EMAIL = process.env.FROM_EMAIL || 'NexarOS <hello@nexargames.co.uk>';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error('[Email] ERROR: RESEND_API_KEY not set');
    throw new Error('RESEND_API_KEY not configured');
  }
  
  console.log('[Email] Using RESEND_API_KEY from environment');
  return {
    client: new Resend(apiKey),
    fromEmail: FROM_EMAIL
  };
}

async function sendVerificationEmail(toEmail, username, verificationToken) {
  console.log('[Email] sendVerificationEmail called for:', toEmail);
  
  try {
    const { client, fromEmail } = getResendClient();
    console.log('[Email] Got client, fromEmail:', fromEmail);
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const verificationLink = `${baseUrl}/verify?token=${verificationToken}`;
    console.log('[Email] Verification link:', verificationLink);
    
    console.log('[Email] Sending email via Resend...');
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Verify your NexarOS account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
          <h1 style="color: #d00024; margin-bottom: 24px;">Welcome to NexarOS, ${username}!</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Thank you for creating your NexarOS account. Please verify your email address to unlock all features.
          </p>
          <a href="${verificationLink}" style="display: inline-block; background: #d00024; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Verify Email
          </a>
          <p style="font-size: 14px; color: #888; margin-top: 32px;">
            If you didn't create this account, you can safely ignore this email.
          </p>
          <p style="font-size: 14px; color: #888;">
            Or copy this link: ${verificationLink}
          </p>
        </div>
      `
    });
    
    console.log('[Email] Resend API response:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Email] FAILED to send verification email:', error);
    return false;
  }
}

async function sendPasswordResetEmail(toEmail, username, resetToken) {
  console.log('[Email] sendPasswordResetEmail called for:', toEmail);
  
  try {
    const { client, fromEmail } = getResendClient();
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log('[Email] Sending password reset email...');
    const result = await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Reset your NexarOS password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
          <h1 style="color: #d00024; margin-bottom: 24px;">Password Reset Request</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${username}, we received a request to reset your NexarOS password.
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #d00024; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
          <p style="font-size: 14px; color: #888; margin-top: 32px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `
    });
    
    console.log('[Email] Resend API response:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('[Email] Resend returned error:', result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Email] FAILED to send password reset email:', error);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
