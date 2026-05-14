import * as nodemailer from 'nodemailer';
import { env } from '../config/env';

class EmailError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'EmailError';
  }
}

let transporter: any = null;

/**
 * Secure SMTP Configuration
 * 
 * Environment Variables Required:
 * - EMAIL_HOST: SMTP server hostname (e.g., mail.diamondraja.com)
 * - EMAIL_PORT: SMTP server port (e.g., 587 for TLS, 465 for SSL)
 * - EMAIL_SECURE: 'true' for SSL (port 465), 'false' for TLS (port 587)
 * - EMAIL_USER: SMTP username/email address
 * - EMAIL_PASS: SMTP password
 * - EMAIL_FROM: From email address
 * - EMAIL_FROM_NAME: From name (optional, defaults to "The Saffron Lounge")
 * 
 * Example .env configuration:
 * EMAIL_HOST="mail.diamondraja.com"
 * EMAIL_PORT=587
 * EMAIL_SECURE="false"
 * EMAIL_USER="saffron_dev@diamondraja.com"
 * EMAIL_PASS="your_secure_password_here"
 * EMAIL_FROM="saffron_dev@diamondraja.com"
 * EMAIL_FROM_NAME="The Saffron Lounge"
 */
const getSMTPConfig = () => {
  // Get password and handle special characters
  let emailPass = env.email.password;
  // Remove any surrounding quotes if present
  emailPass = emailPass.replace(/^["']|["']$/g, '');
  
  const config = {
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure, // true for SSL (465), false for TLS (587)
    auth: {
      user: env.email.user.replace(/^["']|["']$/g, ''), // Remove quotes
      pass: emailPass, // Password with special characters preserved
    },
    tls: {
      // Do not fail on invalid certs (for development)
      // Set to true in production for better security
      rejectUnauthorized: env.server.nodeEnv === 'production',
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Additional options for better compatibility
    requireTLS: true,
    debug: env.server.nodeEnv === 'development',
    logger: env.server.nodeEnv === 'development',
  };

  return config;
};

// Function to get or create transporter
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  // Check if email is configured
  const config = getSMTPConfig();
  if (!config.host || !config.auth.user || !config.auth.pass) {
    console.log('📧 Email not configured. Missing:', {
      EMAIL_HOST: !!config.host,
      EMAIL_USER: !!config.auth.user,
      EMAIL_PASS: !!config.auth.pass
    });
    console.log('📧 Please configure SMTP settings in your .env file');
    return null;
  }

  // Create transporter with secure configuration
  transporter = nodemailer.createTransport(config);

  console.log('📧 Email transporter created:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    from: env.email.from,
    fromName: env.email.fromName
  });

  // Verify connection on creation (non-blocking, don't fail if verification fails)
  // Verification will happen on first email send attempt
  transporter.verify((error: any, success: any) => {
    if (error) {
      console.warn('📧 SMTP Connection Warning:', error.message);
      console.warn('📧 Connection will be verified on first email send attempt');
      console.warn('📧 If emails fail, check your email configuration in .env file');
    } else {
      console.log('📧 ✅ SMTP Connection Verified - Ready to send emails');
    }
  });

  return transporter;
};

/**
 * Send email with retry logic
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email HTML content
 * @param retries - Number of retry attempts (default: 2)
 * @throws EmailError if email sending fails after all retries
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  retries: number = 2
): Promise<void> => {
  // Get or create transporter
  const emailTransporter = getTransporter();
  
  // Skip email sending if not configured
  if (!emailTransporter) {
    const errorMsg = 'Email sending skipped - email not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your .env file';
    console.log(`📧 ${errorMsg}`);
    
    // In development, log but don't throw error
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Development mode: Email sending skipped');
      return;
    }
    
    // In production, throw error
    throw new EmailError(errorMsg, 500);
  }

  const mailOptions = {
    from: `"${env.email.fromName}" <${env.email.from}>`,
    to,
    subject,
    html,
  };

  let lastError: any = null;
  
  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`📧 Retry attempt ${attempt}/${retries} for email to ${to}...`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        console.log(`📧 Attempting to send email to ${to}...`);
        console.log(`📧 Subject: ${subject}`);
      }
      
      const info = await emailTransporter.sendMail(mailOptions);
      
      console.log(`📧 ✅ Email sent successfully to ${to}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      if (info.response) {
        console.log(`📧 Response: ${info.response}`);
      }
      
      return; // Success, exit function
    } catch (error: any) {
      lastError = error;
      console.error(`📧 ❌ Email sending failed (attempt ${attempt + 1}/${retries + 1}):`, error.message);
      
      // Don't retry on authentication errors - but log helpful message
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('📧 Authentication failed. Check your EMAIL_USER and EMAIL_PASS in .env file.');
        console.error('📧 Error details:', {
          code: error.code,
          responseCode: error.responseCode,
          response: error.response,
          command: error.command
        });
        
        // In development, don't throw error - allow fallback to console logging
        if (process.env.NODE_ENV === 'development') {
          console.warn('📧 Development mode: Email sending failed but continuing...');
          console.warn('📧 Check server logs for OTP if email is not configured correctly');
          return; // Don't throw, allow registration to continue
        }
        
        throw new EmailError(`Email authentication failed: ${error.message}`, 401);
      }
      
      // Log error details
      if (error.code) {
        console.error('📧 Error code:', error.code);
      }
      if (error.response) {
        console.error('📧 SMTP response:', error.response);
      }
      if (error.responseCode) {
        console.error('📧 Response code:', error.responseCode);
      }
      
      // Provide helpful error messages
      if (error.code === 'ECONNREFUSED') {
        console.error('📧 Cannot connect to SMTP server. Check if the server is running and accessible.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('📧 Connection timed out. Check your network connection and firewall settings.');
      } else if (error.code === 'ESOCKET') {
        console.error('📧 Socket error. Check your network connection and SMTP server settings.');
      }
      
      // If this was the last attempt, throw error
      if (attempt === retries) {
        const errorMessage = `Failed to send email after ${retries + 1} attempts: ${error.message}`;
        throw new EmailError(errorMessage, 500);
      }
    }
  }
  
  // Should never reach here, but just in case
  throw new EmailError(`Failed to send email: ${lastError?.message || 'Unknown error'}`, 500);
};

export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetUrl = `${env.urls.frontend}/auth/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>For security reasons, do not share this link with anyone.</p>
    </div>
  `;

  await sendEmail(email, 'Password Reset Request', html);
};

export const sendEmailVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
  const verificationUrl = `${process.env.API_BASE_URL}/auth/verify-email?token=${verificationToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'Verify Your Email', html);
};

/**
 * Send OTP email with improved template
 */
export const sendOTPEmail = async (email: string, otp: string, purpose: 'registration' | 'login' = 'registration'): Promise<void> => {
  const purposeText = purpose === 'login' ? 'login verification' : 'email verification';
  const actionText = purpose === 'login' ? 'complete your login' : 'verify your email address';
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification OTP</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: 700;">
                    🌿 The Saffron Lounge
                  </h1>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 22px; font-weight: 600;">
                    Email Verification Code
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #555; font-size: 15px; line-height: 1.6;">
                    Hello,
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #555; font-size: 15px; line-height: 1.6;">
                    Use the verification code below to ${actionText}:
                  </p>

                  <!-- OTP Box -->
                  <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #2196F3; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #1565c0; text-transform: uppercase; letter-spacing: 1px;">
                      Your Verification Code
                    </p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; color: #2c3e50; font-family: 'Courier New', monospace; letter-spacing: 8px;">
                      ${otp}
                    </p>
                  </div>

                  <!-- Important Notice -->
                  <div style="background-color: #fff5e6; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 30px 0; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0; font-weight: 700; color: #e65100; font-size: 14px;">
                      ⚠️ Important
                    </p>
                    <p style="margin: 0; color: #ef6c00; font-size: 13px; line-height: 1.5;">
                      This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
                    </p>
                  </div>

                  <p style="margin: 30px 0 0 0; color: #777; font-size: 14px; line-height: 1.6;">
                    If you didn't request this ${purposeText} code, please ignore this email or contact our support team if you have concerns.
                  </p>

                  <p style="margin: 20px 0 0 0; color: #777; font-size: 14px;">
                    Best regards,<br>
                    <strong>The Saffron Lounge Team</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0; color: #777; font-size: 12px;">
                    © ${new Date().getFullYear()} The Saffron Lounge. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail(email, 'Email Verification Code - The Saffron Lounge', html);
};

/**
 * Generate a secure 6-digit OTP
 * Returns a string of exactly 6 digits (100000-999999)
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP (100000-999999)
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
  const loginUrl = `${process.env.API_BASE_URL}/api/auth/login`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Welcome to The Saffron Lounge! 🌿</h1>
        </div>

        <div style="color: #55; line-height: 1.6;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>

          <p style="margin-bottom: 20px;">Thank you for joining <strong>The Saffron Lounge</strong>! We're excited to have you as part of our community.</p>

          <p style="margin-bottom: 20px;">Your account has been successfully created and you can now:</p>

          <ul style="margin-bottom: 20px; padding-left: 20px;">
            <li>Browse our premium spice collection</li>
            <li>Place orders for fresh, authentic spices</li>
            <li>Access exclusive member discounts</li>
            <li>Track your order history</li>
            <li>Receive personalized recommendations</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #d4af37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Start Shopping Now</a>
          </div>

          <p style="margin-bottom: 20px;"><strong>Account Details:</strong></p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
            Email: ${email}<br>
            Registration Date: ${new Date().toLocaleDateString()}
          </p>

          <p style="margin-bottom: 20px;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

          <p style="margin-bottom: 10px;">Best regards,</p>
          <p style="margin-bottom: 5px;"><strong>The Saffron Lounge Team</strong></p>
          <p style="color: #777; font-size: 14px;">Premium Spices & Culinary Excellence</p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <div style="text-align: center; color: #777; font-size: 12px;">
          <p>This email was sent to ${email}. If you didn't create this account, please ignore this email.</p>
          <p>© ${new Date().getFullYear()} The Saffron Lounge. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(email, 'Welcome to The Saffron Lounge! 🌿', html);
};

export const sendCredentialsEmail = async (email: string, name: string, password: string): Promise<void> => {
  const loginUrl = `${env.urls.frontend}/auth/login`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Your Account Credentials</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f7fa;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 40px 30px; text-align: center;">
                  <div style="background-color: rgba(255, 255, 255, 0.95); display: inline-block; padding: 16px 24px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);">
                    <h1 style="margin: 0; color: #2c3e50; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      🌿 The Saffron Lounge
                    </h1>
                    <p style="margin: 4px 0 0 0; color: #7f8c8d; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">
                      PREMIUM SPICES & CULINARY EXCELLENCE
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Welcome Message -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);">
                      <span style="font-size: 32px;">🔐</span>
                    </div>
                    <h2 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 26px; font-weight: 700; line-height: 1.3;">
                      Your Account is Ready!
                    </h2>
                    <p style="margin: 0; color: #7f8c8d; font-size: 15px; line-height: 1.5;">
                      Welcome to The Saffron Lounge, ${name}
                    </p>
                  </div>

                  <!-- Introduction Text -->
                  <p style="margin: 0 0 24px 0; color: #555; font-size: 15px; line-height: 1.7; text-align: center;">
                    Your account has been successfully created by our administrator.<br>
                    Below are your secure login credentials to access your account.
                  </p>

                  <!-- Security Notice -->
                  <div style="background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%); border-left: 4px solid #ff9800; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                          <span style="font-size: 20px;">⚠️</span>
                        </td>
                        <td>
                          <p style="margin: 0 0 6px 0; font-weight: 700; color: #e65100; font-size: 14px;">
                            Important Security Notice
                          </p>
                          <p style="margin: 0; color: #ef6c00; font-size: 13px; line-height: 1.5;">
                            Keep these credentials secure and private. We strongly recommend changing your password after your first login.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Credentials Box -->
                  <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border: 2px solid #2196F3; border-radius: 12px; padding: 24px; margin: 28px 0; box-shadow: 0 2px 12px rgba(33, 150, 243, 0.15);">
                    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #1565c0; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                      🔑 Your Login Credentials
                    </p>
                    
                    <!-- Email Credential -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);">
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px;">
                        Email Address
                      </p>
                      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #2c3e50; font-family: 'Courier New', monospace; word-break: break-all;">
                        ${email}
                      </p>
                    </div>

                    <!-- Password Credential -->
                    <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);">
                      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px;">
                        Temporary Password
                      </p>
                      <p style="margin: 0; font-size: 15px; font-weight: 600; color: #2c3e50; font-family: 'Courier New', monospace; word-break: break-all;">
                        ${password}
                      </p>
                    </div>
                  </div>

                  <!-- Login Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${loginUrl}" style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4); transition: all 0.3s ease;">
                      ✨ Login to Your Account
                    </a>
                  </div>

                  <!-- Next Steps -->
                  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 20px 24px; margin: 28px 0;">
                    <p style="margin: 0 0 12px 0; font-weight: 700; color: #2c3e50; font-size: 15px;">
                      📋 Quick Start Guide
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">1</span>
                          <span style="color: #555; font-size: 14px; line-height: 1.6;">Click the "Login to Your Account" button above</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">2</span>
                          <span style="color: #555; font-size: 14px; line-height: 1.6;">Enter your email and temporary password</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">3</span>
                          <span style="color: #555; font-size: 14px; line-height: 1.6;">Update your password in account settings</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 10px;">4</span>
                          <span style="color: #555; font-size: 14px; line-height: 1.6;">Start exploring premium spices and features</span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Support Section -->
                  <div style="text-align: center; margin: 28px 0 0 0; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 8px 0; color: #7f8c8d; font-size: 14px;">
                      Need help? Our support team is here for you.
                    </p>
                    <p style="margin: 0; color: #2c3e50; font-size: 14px; font-weight: 600;">
                      📧 support@saffronlounge.com
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #2c3e50; padding: 32px 30px; text-align: center;">
                  <p style="margin: 0 0 12px 0; color: #ecf0f1; font-size: 15px; font-weight: 600;">
                    The Saffron Lounge
                  </p>
                  <p style="margin: 0 0 16px 0; color: #95a5a6; font-size: 13px; line-height: 1.6;">
                    Premium Spices & Culinary Excellence<br>
                    Bringing authentic flavors to your kitchen
                  </p>
                  <div style="margin: 16px 0;">
                    <a href="#" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 12px;">Website</a>
                    <span style="color: #7f8c8d;">•</span>
                    <a href="#" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 12px;">Shop</a>
                    <span style="color: #7f8c8d;">•</span>
                    <a href="#" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 12px;">Support</a>
                  </div>
                  <p style="margin: 16px 0 0 0; color: #7f8c8d; font-size: 11px;">
                    This email contains sensitive information. Please keep it secure.<br>
                    © ${new Date().getFullYear()} The Saffron Lounge. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail(email, '🔐 Your Account Credentials - The Saffron Lounge', html);
};

export const sendTestEmail = async (to: string, subject: string = 'Test Email', message: string = 'This is a test email from your application.'): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">Test Email</h1>
        </div>

        <div style="color: #55; line-height: 1.6;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hello,</p>

          <p style="margin-bottom: 20px;">${message}</p>

          <p style="margin-bottom: 20px;"><strong>Test Details:</strong></p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
            Sent to: ${to}<br>
            Timestamp: ${new Date().toLocaleString()}<br>
            Server: ${env.email.host}
          </p>

          <p style="margin-bottom: 20px;">If you received this email, your email configuration is working correctly!</p>

          <p style="margin-bottom: 10px;">Best regards,</p>
          <p style="margin-bottom: 5px;"><strong>The Saffron Lounge Team</strong></p>
          <p style="color: #777; font-size: 14px;">Email Testing Service</p>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <div style="text-align: center; color: #777; font-size: 12px;">
          <p>This is an automated test email from your application.</p>
          <p>© ${new Date().getFullYear()} The Saffron Lounge. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(to, subject, html);
};