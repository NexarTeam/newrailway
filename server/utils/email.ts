import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function sendVerificationEmail(toEmail: string, username: string, verificationToken: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const verificationLink = `${baseUrl}/verify?token=${verificationToken}`;
    
    await client.emails.send({
      from: fromEmail || 'NexarOS <noreply@resend.dev>',
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
    
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(toEmail: string, username: string, resetToken: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    await client.emails.send({
      from: fromEmail || 'NexarOS <noreply@resend.dev>',
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
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
