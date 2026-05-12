require('./load-env-helper');

const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendTestEmail() {
  try {
    console.log('📧 Testing email configuration...');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('User:', process.env.EMAIL_USER);
    console.log('Secure:', process.env.EMAIL_SECURE);
    console.log('Password length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');

    // Create transporter with detailed config
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      debug: true,
      logger: true
    });

    console.log('🔍 Attempting to verify connection...');

    // Verify connection
    const verifyResult = await transporter.verify();
    console.log('✅ Email server connection successful');
    console.log('Verify result:', verifyResult);

    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"Saffron Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Test Email from Saffron Backend',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from the Saffron backend server.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>If you received this, email configuration is working!</p>
      `
    });

    console.log('✅ Test email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Full error details:', error);

    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    if (error.code === 'EAUTH') {
      console.log('• Check if the email password is correct');
      console.log('• Try logging into webmail manually');
      console.log('• Check if 2FA is enabled (may need app password)');
      console.log('• Verify email account is not locked/suspended');
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('• Check if the SMTP host and port are correct');
      console.log('• Verify firewall is not blocking the connection');
    }
  }
}

sendTestEmail();