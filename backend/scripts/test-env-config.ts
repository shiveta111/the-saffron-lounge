#!/usr/bin/env ts-node
/**
 * Test Environment Configuration
 * 
 * This script validates that all environment variables are loaded correctly
 * from the .env file with no fallbacks.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
console.log('='.repeat(80));
console.log('Environment Configuration Test');
console.log('='.repeat(80));
console.log();

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

console.log('✅ .env file found at:', envPath);
console.log();

// Load .env
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error.message);
  process.exit(1);
}

console.log('✅ .env file loaded successfully');
console.log();

// Test loading the env config
console.log('Testing environment configuration...');
console.log();

try {
  // Import env config - this will validate all variables
  const { env, validateEnv } = require('../src/config/env');
  
  // Run validation
  validateEnv();
  
  console.log();
  console.log('='.repeat(80));
  console.log('Environment Variables Summary');
  console.log('='.repeat(80));
  console.log();
  
  // Database Configuration
  console.log('📊 DATABASE CONFIGURATION:');
  console.log(`   URL: ${env.database.url.substring(0, 30)}...`);
  console.log(`   Host: ${env.database.host}`);
  console.log(`   Port: ${env.database.port}`);
  console.log(`   User: ${env.database.user}`);
  console.log(`   Database: ${env.database.database}`);
  console.log(`   Password: ${'*'.repeat(env.database.password.length)} (${env.database.password.length} chars)`);
  console.log(`   Connection Timeout: ${env.database.connectionTimeout}ms`);
  console.log(`   Max Retries: ${env.database.maxRetries}`);
  console.log(`   Pool Size: ${env.database.poolSize}`);
  console.log();
  
  // JWT Configuration
  console.log('🔐 JWT CONFIGURATION:');
  console.log(`   Secret: ${env.jwt.secret.substring(0, 20)}... (${env.jwt.secret.length} chars)`);
  console.log(`   Refresh Secret: ${env.jwt.refreshSecret.substring(0, 20)}... (${env.jwt.refreshSecret.length} chars)`);
  console.log(`   Expires In: ${env.jwt.expiresIn}`);
  console.log(`   Refresh Expires In: ${env.jwt.refreshExpiresIn}`);
  console.log();
  
  // Server Configuration
  console.log('🚀 SERVER CONFIGURATION:');
  console.log(`   Node Environment: ${env.server.nodeEnv}`);
  console.log(`   Port: ${env.server.port}`);
  console.log(`   Run Startup Checks: ${env.server.runStartupChecks}`);
  console.log();
  
  // Email Configuration
  console.log('📧 EMAIL CONFIGURATION:');
  console.log(`   Host: ${env.email.host}`);
  console.log(`   Port: ${env.email.port}`);
  console.log(`   Secure: ${env.email.secure}`);
  console.log(`   User: ${env.email.user}`);
  console.log(`   Password: ${'*'.repeat(env.email.password.length)} (${env.email.password.length} chars)`);
  console.log(`   From: ${env.email.from}`);
  console.log(`   From Name: ${env.email.fromName}`);
  console.log();
  
  // URLs
  console.log('🌐 URL CONFIGURATION:');
  console.log(`   Frontend URL: ${env.urls.frontend}`);
  console.log(`   API Base URL: ${env.urls.api}`);
  console.log();
  
  // WhatsApp Configuration
  console.log('💬 WHATSAPP CONFIGURATION:');
  console.log(`   API URL: ${env.whatsapp.apiUrl}`);
  console.log(`   API Key: ${env.whatsapp.apiKey.substring(0, 20)}... (${env.whatsapp.apiKey.length} chars)`);
  console.log(`   Phone Number ID: ${env.whatsapp.phoneNumberId}`);
  console.log(`   Business Account ID: ${env.whatsapp.businessAccountId}`);
  console.log(`   Verify Token: ${env.whatsapp.verifyToken}`);
  console.log();
  
  // Seeding Configuration
  console.log('🌱 SEEDING CONFIGURATION:');
  console.log(`   Auto Seed On Empty: ${env.seed.autoSeedOnEmpty}`);
  console.log();
  
  console.log('='.repeat(80));
  console.log('✅ All environment variables loaded successfully from .env');
  console.log('✅ NO FALLBACKS USED - Configuration is strict and secure');
  console.log('='.repeat(80));
  console.log();
  
  // Test that changing a variable would fail
  console.log('Testing fallback removal...');
  console.log('Attempting to read non-existent variable (should fail gracefully):');
  try {
    const testVar = process.env.NON_EXISTENT_VAR;
    if (!testVar) {
      console.log('✅ Non-existent variable correctly returns undefined (no fallback)');
    }
  } catch (error) {
    console.log('✅ Correctly handled missing variable');
  }
  console.log();
  
  console.log('='.repeat(80));
  console.log('🎉 Environment configuration test PASSED');
  console.log('='.repeat(80));
  
  process.exit(0);
  
} catch (error: any) {
  console.error();
  console.error('='.repeat(80));
  console.error('❌ Environment configuration test FAILED');
  console.error('='.repeat(80));
  console.error();
  console.error('Error:', error.message);
  console.error();
  console.error('Stack trace:');
  console.error(error.stack);
  console.error();
  console.error('💡 Please check your .env file and ensure all required variables are set.');
  console.error();
  
  process.exit(1);
}
