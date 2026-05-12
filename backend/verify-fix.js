/**
 * Quick Verification Script for Data Persistence Fix
 * 
 * This script verifies that the critical fixes have been applied correctly.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('\n' + '='.repeat(80));
log('🔍 VERIFYING DATA PERSISTENCE FIX', 'cyan');
console.log('='.repeat(80) + '\n');

let allPassed = true;

// Test 1: Check startupChecker.ts has safe function
log('TEST 1: Checking startupChecker.ts for safe code...', 'cyan');
try {
  const startupCheckerPath = path.join(__dirname, 'src', 'utils', 'startupChecker.ts');
  const content = fs.readFileSync(startupCheckerPath, 'utf8');
  
  // Check for safe patterns
  const hasCheckAndSeed = content.includes('checkAndSeedIfEmpty');
  const hasUserCountCheck = content.includes('userCount > 0');
  const hasPreserveMessage = content.includes('skipping seeding to preserve existing data');
  const hasSkipGenerate = content.includes('--skip-generate');
  
  // Check for dangerous patterns in actual code (not comments)
  const codeLines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('//') && !trimmed.startsWith('*');
  }).join('\n');
  
  const hasDeleteMany = codeLines.includes('.deleteMany()');
  const hasForceReset = codeLines.includes('--force-reset');
  const hasForceReseed = codeLines.includes('forceReseedDummyData');
  
  if (hasCheckAndSeed) {
    log('  ✅ Found checkAndSeedIfEmpty function', 'green');
  } else {
    log('  ❌ Missing checkAndSeedIfEmpty function', 'red');
    allPassed = false;
  }
  
  if (hasUserCountCheck) {
    log('  ✅ Found user count check', 'green');
  } else {
    log('  ❌ Missing user count check', 'red');
    allPassed = false;
  }
  
  if (hasPreserveMessage) {
    log('  ✅ Found data preservation message', 'green');
  } else {
    log('  ❌ Missing data preservation message', 'red');
    allPassed = false;
  }
  
  if (hasSkipGenerate) {
    log('  ✅ Using --skip-generate (safe)', 'green');
  } else {
    log('  ⚠️  Not using --skip-generate', 'yellow');
  }
  
  if (hasDeleteMany) {
    log('  ❌ DANGER: Found .deleteMany() in code!', 'red');
    allPassed = false;
  } else {
    log('  ✅ No .deleteMany() found in code', 'green');
  }
  
  if (hasForceReset) {
    log('  ❌ DANGER: Found --force-reset in code!', 'red');
    allPassed = false;
  } else {
    log('  ✅ No --force-reset found in code', 'green');
  }
  
  if (hasForceReseed) {
    log('  ❌ DANGER: Found forceReseedDummyData in code!', 'red');
    allPassed = false;
  } else {
    log('  ✅ No forceReseedDummyData found in code', 'green');
  }
  
} catch (error) {
  log(`  ❌ Error reading startupChecker.ts: ${error.message}`, 'red');
  allPassed = false;
}

// Test 2: Check .env configuration
log('\nTEST 2: Checking .env configuration...', 'cyan');
try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const hasDatabaseUrl = envContent.includes('DATABASE_URL=');
  const hasPassword = envContent.includes('root:password@');
  const hasStartupChecks = envContent.includes('RUN_STARTUP_CHECKS=');
  const startupChecksDisabled = envContent.includes('RUN_STARTUP_CHECKS="false"');
  const hasAutoSeed = envContent.includes('AUTO_SEED_ON_EMPTY=');
  
  if (hasDatabaseUrl) {
    log('  ✅ DATABASE_URL is configured', 'green');
  } else {
    log('  ❌ DATABASE_URL is missing', 'red');
    allPassed = false;
  }
  
  if (hasPassword) {
    log('  ✅ DATABASE_URL has password for Docker', 'green');
  } else {
    log('  ⚠️  DATABASE_URL may be using local MySQL (no password)', 'yellow');
  }
  
  if (startupChecksDisabled) {
    log('  ✅ RUN_STARTUP_CHECKS is disabled (safe)', 'green');
  } else if (hasStartupChecks) {
    log('  ⚠️  RUN_STARTUP_CHECKS is enabled', 'yellow');
  } else {
    log('  ⚠️  RUN_STARTUP_CHECKS not set (will default to false)', 'yellow');
  }
  
  if (hasAutoSeed) {
    log('  ✅ AUTO_SEED_ON_EMPTY is configured', 'green');
  } else {
    log('  ⚠️  AUTO_SEED_ON_EMPTY not set', 'yellow');
  }
  
} catch (error) {
  log(`  ❌ Error reading .env: ${error.message}`, 'red');
  allPassed = false;
}

// Test 3: Check docker-compose.yml
log('\nTEST 3: Checking docker-compose.yml...', 'cyan');
try {
  const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
  const dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  const hasNamedVolume = dockerContent.includes('saffron_mysql_data');
  const hasHealthCheck = dockerContent.includes('healthcheck:');
  const hasVolumeConfig = dockerContent.includes('volumes:') && dockerContent.includes('mysql_data:');
  
  if (hasNamedVolume) {
    log('  ✅ Named volume "saffron_mysql_data" configured', 'green');
  } else {
    log('  ❌ Named volume not configured', 'red');
    allPassed = false;
  }
  
  if (hasHealthCheck) {
    log('  ✅ Health check configured', 'green');
  } else {
    log('  ⚠️  Health check not configured', 'yellow');
  }
  
  if (hasVolumeConfig) {
    log('  ✅ Volume configuration present', 'green');
  } else {
    log('  ❌ Volume configuration missing', 'red');
    allPassed = false;
  }
  
} catch (error) {
  log(`  ❌ Error reading docker-compose.yml: ${error.message}`, 'red');
  allPassed = false;
}

// Summary
console.log('\n' + '='.repeat(80));
if (allPassed) {
  log('✅ ALL CHECKS PASSED!', 'green');
  log('✅ Data persistence fix has been correctly applied.', 'green');
  log('✅ Your data is safe and will persist across restarts.', 'green');
} else {
  log('❌ SOME CHECKS FAILED!', 'red');
  log('⚠️  Please review the issues above before proceeding.', 'yellow');
}
console.log('='.repeat(80) + '\n');

// Recommendations
log('📋 NEXT STEPS:', 'cyan');
log('1. If MySQL is running, test with: node test-data-persistence.js', 'yellow');
log('2. Start Docker: docker-compose up -d', 'yellow');
log('3. Seed database: npm run db:seed', 'yellow');
log('4. Start server: npm run dev', 'yellow');
log('5. Test login: admin@saffronlounge.com / admin123', 'yellow');
console.log('');

process.exit(allPassed ? 0 : 1);
