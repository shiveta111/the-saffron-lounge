/**
 * Helper script to load environment variables from .env-main or .env
 * Use this in root-level scripts: require('./load-env-helper');
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envMainPath = path.join(__dirname, '.env-main');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envMainPath)) {
  dotenv.config({ path: envMainPath });
  console.log('✅ Loaded environment variables from .env-main');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env');
} else {
  console.warn('⚠️  Warning: Neither .env-main nor .env file found.');
}
