const fs = require('fs');
const path = require('path');

// Email configuration to update
const EMAIL_CONFIG = {
  EMAIL_HOST: 'mail.diamondraja.com',
  EMAIL_PORT: '587',
  EMAIL_SECURE: 'false',
  EMAIL_USER: 'saffron_dev@diamondraja.com',
  EMAIL_PASS: 'ofJMt(PMY.YovFd',
  EMAIL_FROM: 'saffron_dev@diamondraja.com',
  EMAIL_FROM_NAME: 'The Saffron Lounge'
};

const envPath = path.join(__dirname, '.env');

try {
  console.log('📝 Updating .env file with email configuration...');
  
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update each email configuration
  Object.keys(EMAIL_CONFIG).forEach(key => {
    const value = EMAIL_CONFIG[key];
    // Escape quotes in password if needed
    const escapedValue = value.includes('"') ? value.replace(/"/g, '\\"') : value;
    
    // Replace existing value or add new line
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${escapedValue}"`);
      console.log(`✅ Updated ${key}`);
    } else {
      // Add new line if not found
      envContent += `\n${key}="${escapedValue}"`;
      console.log(`✅ Added ${key}`);
    }
  });
  
  // Write back to .env file
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('');
  console.log('✅ Email configuration updated successfully!');
  console.log('');
  console.log('📧 Updated Configuration:');
  console.log(`   EMAIL_HOST: ${EMAIL_CONFIG.EMAIL_HOST}`);
  console.log(`   EMAIL_PORT: ${EMAIL_CONFIG.EMAIL_PORT}`);
  console.log(`   EMAIL_SECURE: ${EMAIL_CONFIG.EMAIL_SECURE}`);
  console.log(`   EMAIL_USER: ${EMAIL_CONFIG.EMAIL_USER}`);
  console.log(`   EMAIL_PASS: ${'*'.repeat(EMAIL_CONFIG.EMAIL_PASS.length)}`);
  console.log(`   EMAIL_FROM: ${EMAIL_CONFIG.EMAIL_FROM}`);
  console.log('');
  console.log('⚠️  Important: Restart your backend server for changes to take effect!');
  console.log('   Run: npm run dev (or your server start command)');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error.message);
  console.error('');
  console.error('Please manually update your .env file with these values:');
  console.log('');
  Object.keys(EMAIL_CONFIG).forEach(key => {
    console.log(`${key}="${EMAIL_CONFIG[key]}"`);
  });
  process.exit(1);
}

