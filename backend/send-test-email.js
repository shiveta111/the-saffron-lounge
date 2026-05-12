require('./load-env-helper');
const nodemailer = require('nodemailer');

// SMTP Configuration from user
// Try different configurations
const SMTP_CONFIGS = [
  {
    name: 'TLS (Port 587)',
    host: 'mail.diamondraja.com',
    port: 587,
    secure: false,
    auth: {
      user: 'saffron_dev@diamondraja.com',
      pass: 'ofJMt(PMY.YovFd'
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  {
    name: 'SSL (Port 465)',
    host: 'mail.diamondraja.com',
    port: 465,
    secure: true,
    auth: {
      user: 'saffron_dev@diamondraja.com',
      pass: 'ofJMt(PMY.YovFd'
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  {
    name: 'Alternative Host Format',
    host: 'smtp.diamondraja.com',
    port: 587,
    secure: false,
    auth: {
      user: 'saffron_dev@diamondraja.com',
      pass: 'ofJMt(PMY.YovFd'
    },
    tls: {
      rejectUnauthorized: false
    }
  }
];

async function sendTestEmail() {
  let lastError = null;
  
  // Try each configuration
  for (const config of SMTP_CONFIGS) {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📧 Testing Configuration: ${config.name}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('Host:', config.host);
      console.log('Port:', config.port);
      console.log('Secure:', config.secure);
      console.log('User:', config.auth.user);
      console.log('Password length:', config.auth.pass.length);
      console.log('');

      // Create transporter
      const transporter = nodemailer.createTransport(config);

      console.log('🔍 Verifying SMTP connection...');
      
      // Verify connection
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully!');
      console.log('');

      // Send test email
      console.log('📤 Sending test email...');
      const testEmail = {
        from: `"The Saffron Lounge" <${config.auth.user}>`,
        to: 'lovely.webdev@gmail.com', // Send to test email address
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
                  <li><strong>Sent From:</strong> ${config.auth.user}</li>
                  <li><strong>SMTP Host:</strong> ${config.host}</li>
                  <li><strong>SMTP Port:</strong> ${config.port}</li>
                  <li><strong>Secure:</strong> ${config.secure ? 'SSL' : 'TLS'}</li>
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

    console.log('✅ Test email sent successfully!');
    console.log('');
    console.log('📧 Email Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', testEmail.to);
    console.log('   From:', testEmail.from);
    console.log('   Subject:', testEmail.subject);
    if (info.response) {
      console.log('   Response:', info.response);
    }
    console.log('');
    console.log('🎉 Email system is working correctly!');
    console.log('   Check your inbox at:', config.auth.user);
    console.log('');
    console.log('✅ Successfully used configuration:', config.name);
    process.exit(0);
    return; // Exit successfully

    } catch (error) {
      lastError = error;
      console.log('');
      console.log(`❌ Configuration "${config.name}" failed:`);
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      if (error.response) {
        console.log('   Response:', error.response);
      }
      console.log('');
      console.log('Trying next configuration...');
      continue; // Try next configuration
    }
  }
  
  // If we get here, all configurations failed
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('❌ All SMTP configurations failed!');
  console.log('═══════════════════════════════════════════════════════');
  
  if (lastError) {
    console.error('');
    console.error('❌ Email test failed!');
    console.error('');
    console.error('Error Details:');
    console.error('   Message:', lastError.message);
    console.error('   Code:', lastError.code);
    if (lastError.response) {
      console.error('   Response:', lastError.response);
    }
    if (lastError.responseCode) {
      console.error('   Response Code:', lastError.responseCode);
    }
    console.error('');
    console.error('🔧 Troubleshooting Tips:');
    
    if (lastError.code === 'EAUTH') {
      console.error('   • Authentication failed - check username and password');
      console.error('   • Verify the password is correct: ofJMt(PMY.YovFd');
      console.error('   • Try logging into webmail at https://diamondraja.com/');
      console.error('   • Check if 2FA is enabled (may need app-specific password)');
      console.error('   • For cPanel emails, sometimes you need to use the full email as username');
      console.error('   • Verify password doesn\'t have extra spaces or special characters');
      console.error('   • Try logging into webmail manually to verify credentials');
    } else if (lastError.code === 'ECONNREFUSED') {
      console.error('   • Cannot connect to SMTP server');
      console.error('   • Verify host: mail.diamondraja.com or smtp.diamondraja.com');
      console.error('   • Try ports: 587 (TLS) or 465 (SSL)');
      console.error('   • Check firewall settings');
    } else if (lastError.code === 'ETIMEDOUT') {
      console.error('   • Connection timed out');
      console.error('   • Check network connection');
      console.error('   • Verify SMTP server is accessible');
    } else if (lastError.code === 'ESOCKET') {
      console.error('   • Socket error');
      console.error('   • Check network connection');
      console.error('   • Verify SMTP server settings');
    } else if (lastError.code === 'EDNS') {
      console.error('   • DNS resolution failed');
      console.error('   • Verify the SMTP hostname is correct');
      console.error('   • Try using mail.diamondraja.com instead');
    }
    
    console.error('');
    console.error('💡 Additional Suggestions:');
    console.error('   1. Contact your hosting provider (diamondraja.com) for correct SMTP settings');
    console.error('   2. Check cPanel email account settings');
    console.error('   3. Verify the email account is active and not suspended');
    console.error('   4. Some hosts require specific SMTP hostnames (check cPanel documentation)');
    
    process.exit(1);
  }
}

sendTestEmail();

