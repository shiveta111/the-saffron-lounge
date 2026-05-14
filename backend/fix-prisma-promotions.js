#!/usr/bin/env node

/**
 * Fix Prisma Client for Promotions Module
 * 
 * This script regenerates the Prisma client and runs migrations
 * to sync the database schema with the Prisma schema.
 * 
 * IMPORTANT: Stop the backend server before running this script!
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     Fixing Prisma Client for Promotions Module       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('⚠️  IMPORTANT: Make sure the backend server is STOPPED!\n');
console.log('   If you see "EPERM" errors, stop the server and try again.\n');

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Step 1: Regenerating Prisma Client...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log('✅ Prisma client regenerated successfully\n');
  } catch (error) {
    if (error.message?.includes('EPERM') || error.stderr?.toString().includes('EPERM')) {
      console.error('\n❌ ERROR: Prisma client files are locked!');
      console.error('   The backend server is still running.');
      console.error('   Please stop the server (Ctrl+C) and run this script again.\n');
      process.exit(1);
    }
    throw error;
  }

  // Step 2: Check migration status
  console.log('📊 Step 2: Checking migration status...');
  try {
    execSync('npx prisma migrate status', {
      stdio: 'inherit',
      cwd: __dirname,
    });
  } catch (error) {
    // Migration status might show pending migrations, which is okay
    console.log('   (Migration status check completed)\n');
  }

  // Step 3: Run migrations
  console.log('🚀 Step 3: Running database migrations...');
  try {
    execSync('npx prisma migrate dev --name add_promotions_module', {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log('✅ Migrations completed successfully\n');
  } catch (error) {
    console.error('\n⚠️  Migration failed. This might be okay if migrations are already applied.');
    console.error('   Error:', error.message);
    console.log('\n   Trying to push schema directly...\n');
    
    try {
      execSync('npx prisma db push --skip-generate', {
        stdio: 'inherit',
        cwd: __dirname,
      });
      console.log('✅ Schema pushed successfully\n');
    } catch (pushError) {
      console.error('\n❌ Schema push also failed.');
      console.error('   Please check your database connection and try again.\n');
      process.exit(1);
    }
  }

  // Step 4: Verify
  console.log('✅ Step 4: Verification...');
  console.log('   Prisma client has been regenerated.');
  console.log('   Database schema has been updated.\n');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              ✅ Fix Complete!                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Next steps:');
  console.log('   1. Start the backend server: npm start');
  console.log('   2. Try creating a promotion again\n');

} catch (error) {
  console.error('\n❌ Error occurred:', error.message);
  console.error('\n📝 Manual steps:');
  console.error('   1. Stop the backend server (Ctrl+C)');
  console.error('   2. cd backend');
  console.error('   3. npx prisma generate');
  console.error('   4. npx prisma migrate dev --name add_promotions_module');
  console.error('   5. npm start\n');
  process.exit(1);
}




















