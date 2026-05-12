/**
 * Database Setup Verification Script
 * 
 * This script verifies that your database configuration is correct
 * and provides guidance on fixing any issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function checkDockerInstalled() {
  header('1. Checking Docker Installation');
  
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf-8' });
    log(`✅ Docker is installed: ${dockerVersion.trim()}`, 'green');
    return true;
  } catch (error) {
    log('❌ Docker is NOT installed', 'red');
    log('\n📝 To fix this:', 'yellow');
    log('   1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop', 'cyan');
    log('   2. Install Docker Desktop', 'cyan');
    log('   3. Start Docker Desktop', 'cyan');
    log('   4. Run this script again', 'cyan');
    return false;
  }
}

function checkDockerRunning() {
  header('2. Checking Docker Status');
  
  try {
    execSync('docker ps', { encoding: 'utf-8', stdio: 'pipe' });
    log('✅ Docker is running', 'green');
    return true;
  } catch (error) {
    log('❌ Docker is NOT running', 'red');
    log('\n📝 To fix this:', 'yellow');
    log('   1. Start Docker Desktop application', 'cyan');
    log('   2. Wait for Docker to fully start (check system tray icon)', 'cyan');
    log('   3. Run this script again', 'cyan');
    return false;
  }
}

function checkMySQLContainer() {
  header('3. Checking MySQL Container');
  
  try {
    const containers = execSync('docker ps -a --filter "name=mysql-saffron" --format "{{.Names}}\t{{.Status}}"', 
      { encoding: 'utf-8' });
    
    if (!containers.trim()) {
      log('⚠️  MySQL container does NOT exist', 'yellow');
      log('\n📝 To fix this:', 'yellow');
      log('   1. Run: docker-compose up -d', 'cyan');
      log('   2. Wait 30 seconds for MySQL to initialize', 'cyan');
      log('   3. Run this script again', 'cyan');
      return false;
    }
    
    const [name, status] = containers.trim().split('\t');
    
    if (status.includes('Up')) {
      log(`✅ MySQL container is running: ${status}`, 'green');
      return true;
    } else {
      log(`⚠️  MySQL container exists but is not running: ${status}`, 'yellow');
      log('\n📝 To fix this:', 'yellow');
      log('   1. Run: docker-compose start', 'cyan');
      log('   2. Wait 30 seconds for MySQL to start', 'cyan');
      log('   3. Run this script again', 'cyan');
      return false;
    }
  } catch (error) {
    log('❌ Failed to check MySQL container', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

function checkDockerVolume() {
  header('4. Checking Docker Volume');
  
  try {
    const volumes = execSync('docker volume ls --filter "name=saffron_mysql_data" --format "{{.Name}}"', 
      { encoding: 'utf-8' });
    
    if (!volumes.trim()) {
      log('⚠️  Docker volume does NOT exist', 'yellow');
      log('\n📝 To fix this:', 'yellow');
      log('   1. Run: docker-compose up -d', 'cyan');
      log('   2. This will create the volume automatically', 'cyan');
      return false;
    }
    
    log('✅ Docker volume exists: saffron_mysql_data', 'green');
    
    // Check volume details
    const volumeInfo = execSync('docker volume inspect saffron_mysql_data', 
      { encoding: 'utf-8' });
    const volumeData = JSON.parse(volumeInfo)[0];
    log(`   Mountpoint: ${volumeData.Mountpoint}`, 'cyan');
    
    return true;
  } catch (error) {
    log('❌ Failed to check Docker volume', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvFile() {
  header('5. Checking .env Configuration');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env file does NOT exist', 'red');
    log('\n📝 To fix this:', 'yellow');
    log('   1. Copy .env.example to .env', 'cyan');
    log('   2. Update the configuration as needed', 'cyan');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Check DATABASE_URL
  const databaseUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
  
  if (!databaseUrlMatch) {
    log('❌ DATABASE_URL not found in .env', 'red');
    return false;
  }
  
  const databaseUrl = databaseUrlMatch[1];
  log(`   DATABASE_URL: ${databaseUrl}`, 'cyan');
  
  // Check if using Docker MySQL
  if (databaseUrl.includes('root:password@localhost:3306')) {
    log('✅ DATABASE_URL is configured for Docker MySQL', 'green');
  } else if (databaseUrl.includes('root:@localhost:3306')) {
    log('⚠️  DATABASE_URL is configured for local MySQL (not Docker)', 'yellow');
    log('\n📝 To use Docker MySQL:', 'yellow');
    log('   Update DATABASE_URL in .env to:', 'cyan');
    log('   DATABASE_URL="mysql://root:password@localhost:3306/saffron_db"', 'cyan');
  } else {
    log('⚠️  DATABASE_URL has custom configuration', 'yellow');
  }
  
  // Check other important settings
  const autoSeed = envContent.match(/AUTO_SEED_ON_EMPTY=(\w+)/);
  if (autoSeed) {
    log(`   AUTO_SEED_ON_EMPTY: ${autoSeed[1]}`, 'cyan');
    if (autoSeed[1] === 'true') {
      log('   ✅ Automatic seeding is enabled', 'green');
    }
  }
  
  return true;
}

function checkDatabaseConnection() {
  header('6. Testing Database Connection');
  
  try {
    // Try to connect using Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    log('   Attempting to connect to database...', 'cyan');
    
    prisma.$connect()
      .then(async () => {
        log('✅ Successfully connected to database', 'green');
        
        // Check if database has data
        const userCount = await prisma.user.count();
        log(`   Users in database: ${userCount}`, 'cyan');
        
        if (userCount === 0) {
          log('⚠️  Database is empty', 'yellow');
          log('\n📝 To seed the database:', 'yellow');
          log('   Run: npm run db:seed', 'cyan');
        } else {
          log('✅ Database has data', 'green');
        }
        
        await prisma.$disconnect();
        
        printSummary(true);
      })
      .catch((error) => {
        log('❌ Failed to connect to database', 'red');
        log(`   Error: ${error.message}`, 'red');
        
        if (error.message.includes('Can\'t connect')) {
          log('\n📝 Possible fixes:', 'yellow');
          log('   1. Ensure Docker container is running: docker ps', 'cyan');
          log('   2. Check DATABASE_URL in .env matches docker-compose.yml', 'cyan');
          log('   3. Wait 30 seconds after starting Docker for MySQL to initialize', 'cyan');
        }
        
        printSummary(false);
      });
  } catch (error) {
    log('❌ Failed to test database connection', 'red');
    log(`   Error: ${error.message}`, 'red');
    
    if (error.message.includes('Cannot find module')) {
      log('\n📝 To fix this:', 'yellow');
      log('   1. Run: npm install', 'cyan');
      log('   2. Run: npm run db:generate', 'cyan');
    }
    
    printSummary(false);
  }
}

function printSummary(connectionSuccess) {
  header('Summary');
  
  if (connectionSuccess) {
    log('🎉 All checks passed! Your database is configured correctly.', 'green');
    log('\n📝 Next steps:', 'cyan');
    log('   1. Start the backend server: npm run dev', 'cyan');
    log('   2. The server will automatically seed the database if empty', 'cyan');
    log('   3. Test login with: admin@saffronlounge.com / admin123', 'cyan');
  } else {
    log('⚠️  Some checks failed. Please review the errors above.', 'yellow');
    log('\n📝 Quick troubleshooting:', 'cyan');
    log('   1. Ensure Docker Desktop is installed and running', 'cyan');
    log('   2. Run: docker-compose up -d', 'cyan');
    log('   3. Wait 30 seconds for MySQL to initialize', 'cyan');
    log('   4. Run this script again: node scripts/verify-database-setup.js', 'cyan');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Main execution
async function main() {
  log('\n🔍 Saffron Lounge - Database Setup Verification', 'bright');
  log('This script will check your database configuration and provide guidance.\n', 'cyan');
  
  const dockerInstalled = checkDockerInstalled();
  
  if (!dockerInstalled) {
    printSummary(false);
    return;
  }
  
  const dockerRunning = checkDockerRunning();
  
  if (!dockerRunning) {
    printSummary(false);
    return;
  }
  
  const containerRunning = checkMySQLContainer();
  const volumeExists = checkDockerVolume();
  const envConfigured = checkEnvFile();
  
  if (!containerRunning || !volumeExists || !envConfigured) {
    printSummary(false);
    return;
  }
  
  // Test database connection (async)
  checkDatabaseConnection();
}

main().catch(console.error);
