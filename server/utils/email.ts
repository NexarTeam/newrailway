import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  console.log('[Email] Getting Resend credentials...');
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  console.log('[Email] REPLIT_CONNECTORS_HOSTNAME:', hostname ? 'set' : 'NOT SET');
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  console.log('[Email] Token type:', process.env.REPL_IDENTITY ? 'REPL_IDENTITY' : process.env.WEB_REPL_RENEWAL ? 'WEB_REPL_RENEWAL' : 'NONE');

  if (!xReplitToken) {
    console.error('[Email] ERROR: X_REPLIT_TOKEN not found');
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  try {
    const url = 'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend';
    console.log('[Email] Fetching from connector API...');
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });
    
    console.log('[Email] Connector API response status:', response.status);
    
    const data = await response.json();
    console.log('[Email] Connector API response:', JSON.stringify(data, null, 2));
    
    connectionSettings = data.items?.[0];

    if (!connectionSettings || (!connectionSettings.settings?.api_key)) {
      console.error('[Email] ERROR: Resend not connected or missing API key');
      console.error('[Email] connectionSettings:', JSON.stringify(connectionSettings, null, 2));
      throw new Error('Resend not connected');
    }
    
    console.log('[Email] Successfully got Resend credentials');
    return {
      apiKey: connectionSettings.settings.api_key, 
      fromEmail: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error('[Email] ERROR fetching credentials:', error);
    throw error;
  }
}

const FROM_EMAIL = 'NexarOS <hello@nexargames.co.uk>';

async function getResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: FROM_EMAIL
  };
}

export async function sendVerificationEmail(toEmail: string, username: string, verificationToken: string): Promise<boolean> {
  console.log('[Email] sendVerificationEmail called for:', toEmail);
  
  try {
    console.log('[Email] Getting Resend client...');
    const { client, fromEmail } = await getResendClient();
    console.log('[Email] Got client, fromEmail:', fromEmail);
    
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    
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
    return true;
  } catch (error) {
    console.error('[Email] FAILED to send verification email:', error);
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
    
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}
