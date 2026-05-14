/**
 * Quick Setup Script for SQLite Database
 * 
 * This script sets up a SQLite database for immediate testing
 * without requiring MySQL or Docker installation.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(80));
  log(message, 'bright');
  console.log('='.repeat(80) + '\n');
}

async function main() {
  header('🚀 Quick Setup - SQLite Database');
  
  log('This script will set up a SQLite database for immediate testing.', 'cyan');
  log('SQLite requires no installation and stores data in a local file.\n', 'cyan');
  
  try {
    // Step 1: Generate Prisma Client
    header('Step 1: Generating Prisma Client');
    log('Running: npx prisma generate', 'cyan');
    execSync('npx prisma generate', { stdio: 'inherit' });
    log('✅ Prisma client generated successfully', 'green');
    
    // Step 2: Push Schema to Database
    header('Step 2: Creating Database Schema');
    log('Running: npx prisma db push', 'cyan');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    log('✅ Database schema created successfully', 'green');
    
    // Step 3: Seed Database
    header('Step 3: Seeding Database with Test Data');
    log('Running: node prisma/seed.js', 'cyan');
    execSync('node prisma/seed.js', { stdio: 'inherit' });
    log('✅ Database seeded successfully', 'green');
    
    // Success Summary
    header('✅ Setup Complete!');
    log('Your SQLite database is ready to use.\n', 'green');
    
    log('📝 Next Steps:', 'cyan');
    log('   1. Start the backend server: npm run dev', 'cyan');
    log('   2. Test login with:', 'cyan');
    log('      Email: admin@saffronlounge.com', 'cyan');
    log('      Password: admin123', 'cyan');
    log('   3. Access API docs: http://localhost:8000/api-docs\n', 'cyan');
    
    log('⚠️  Note: SQLite is for development only', 'yellow');
    log('   For production, install MySQL (see INSTALL_MYSQL_WINDOWS.md)', 'yellow');
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    log('\n❌ Setup failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('\n📝 Troubleshooting:', 'yellow');
    log('   1. Make sure you are in the backend directory', 'cyan');
    log('   2. Run: npm install', 'cyan');
    log('   3. Try running the commands manually:', 'cyan');
    log('      npx prisma generate', 'cyan');
    log('      npx prisma db push', 'cyan');
    log('      node prisma/seed.js', 'cyan');
    process.exit(1);
  }
}

main().catch(console.error);
