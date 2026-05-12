require('./load-env-helper');
const nodemailer = require('nodemailer');

// Direct SMTP Configuration
const SMTP_CONFIG = {
  host: 'mail.diamondraja.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: 'saffron_dev@diamondraja.com',
    pass: 'ofJMt(PMY.YovFd'
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true,
  logger: true
};

async function sendTestEmail() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Direct Email Test - Sending to lovely.webdev@gmail.com');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('SMTP Configuration:');
    console.log('   Host:', SMTP_CONFIG.host);
    console.log('   Port:', SMTP_CONFIG.port);
    console.log('   Secure:', SMTP_CONFIG.secure);
    console.log('   User:', SMTP_CONFIG.auth.user);
    console.log('   Password:', '*'.repeat(SMTP_CONFIG.auth.pass.length));
    console.log('');

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    console.log('📤 Attempting to send email (skipping verification)...');
    console.log('');

    // Send test email directly without verification
    const testEmail = {
      from: `"The Saffron Lounge" <${SMTP_CONFIG.auth.user}>`,
      to: 'lovely.webdev@gmail.com',
      subject: '✅ Test Email - Saffron Authentication System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .success { color: #28a745; font-weight: bold; font-size: 18px; }
            .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #2c3e50;">🌿 The Saffron Lounge</h1>
              <p style="margin: 10px 0 0 0; color: #2c3e50;">Email System Test</p>
            </div>
            <div class="content">
              <p class="success">✅ Email Configuration Successful!</p>
              
              <p>Hello,</p>
              
              <p>This is a test email to verify that your SMTP configuration is working correctly.</p>
              
              <div class="info">
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li><strong>Sent From:</strong> ${SMTP_CONFIG.auth.user}</li>
                  <li><strong>Sent To:</strong> lovely.webdev@gmail.com</li>
                  <li><strong>SMTP Host:</strong> ${SMTP_CONFIG.host}</li>
                  <li><strong>SMTP Port:</strong> ${SMTP_CONFIG.port}</li>
                  <li><strong>Secure:</strong> ${SMTP_CONFIG.secure ? 'SSL' : 'TLS'}</li>
                  <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
                  <li><strong>Status:</strong> ✅ Working</li>
                </ul>
              </div>
              
              <p><strong>What this means:</strong></p>
              <ul>
                <li>✅ SMTP server connection is successful</li>
                <li>✅ Authentication credentials are correct</li>
                <li>✅ Email sending functionality is operational</li>
                <li>✅ OTP emails, welcome emails, and other notifications will work</li>
              </ul>
              
              <p>Your authentication system is now ready to send emails for:</p>
              <ul>
                <li>📧 OTP verification emails</li>
                <li>📧 Welcome emails</li>
                <li>📧 Password reset emails</li>
                <li>📧 Account credentials emails</li>
              </ul>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>The Saffron Lounge Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated test email from your Saffron authentication system.</p>
              <p>© ${new Date().getFullYear()} The Saffron Lounge. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(testEmail);

    console.log('');
    console.log('✅ Test email sent successfully!');
    console.log('');
    console.log('📧 Email Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   To: lovely.webdev@gmail.com');
    console.log('   From:', testEmail.from);
    console.log('   Subject:', testEmail.subject);
    if (info.response) {
      console.log('   Response:', info.response);
    }
    console.log('');
    console.log('🎉 Email system is working correctly!');
    console.log('   Check your inbox at: lovely.webdev@gmail.com');
    console.log('   (Also check spam/junk folder if not in inbox)');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Email sending failed!');
    console.error('');
    console.error('Error Details:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    if (error.responseCode) {
      console.error('   Response Code:', error.responseCode);
    }
    console.error('');
    console.error('🔧 Troubleshooting:');
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('   • Authentication failed (535 error)');
      console.error('   • Please verify:');
      console.error('     1. Password is correct: ofJMt(PMY.YovFd');
      console.error('     2. Email account is active in cPanel');
      console.error('     3. SMTP is enabled for this account');
      console.error('     4. Try logging into webmail manually');
      console.error('   • Contact hosting provider if issue persists');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   • Cannot connect to SMTP server');
      console.error('   • Check firewall/network settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   • Connection timed out');
      console.error('   • Check network connection');
    }
    
    process.exit(1);
  }
}

sendTestEmail();

