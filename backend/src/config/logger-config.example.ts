/**
 * Example configuration for the database logger
 * 
 * This file demonstrates how to configure the database logger
 * with different settings for different environments.
 */

import { getDatabaseLogger, LogLevel, DatabaseLoggerConfig } from '../utils/database-logger';

/**
 * Development configuration
 * - Verbose logging (DEBUG level)
 * - Console and file logging enabled
 * - Shorter retention period
 */
export const developmentConfig: DatabaseLoggerConfig = {
  logDir: './logs',
  logLevel: LogLevel.DEBUG,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 7, // 7 days
  enableConsole: true,
  enableFile: true
};

/**
 * Production configuration
 * - Less verbose (INFO level)
 * - File logging only
 * - Longer retention period
 */
export const productionConfig: DatabaseLoggerConfig = {
  logDir: '/var/log/saffron',
  logLevel: LogLevel.INFO,
  maxFileSize: 20 * 1024 * 1024, // 20MB
  maxFiles: 30, // 30 days
  enableConsole: false,
  enableFile: true
};

/**
 * Test configuration
 * - Minimal logging (ERROR only)
 * - Console only, no file logging
 */
export const testConfig: DatabaseLoggerConfig = {
  logDir: './logs/test',
  logLevel: LogLevel.ERROR,
  maxFileSize: 1 * 1024 * 1024, // 1MB
  maxFiles: 3,
  enableConsole: true,
  enableFile: false
};

/**
 * Get logger configuration based on environment
 */
export function getLoggerConfig(): DatabaseLoggerConfig {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

/**
 * Initialize logger with environment-specific configuration
 */
export function initializeLogger() {
  const config = getLoggerConfig();
  return getDatabaseLogger(config);
}

/**
 * Example: Custom configuration from environment variables
 */
export function getLoggerConfigFromEnv(): DatabaseLoggerConfig {
  return {
    logDir: process.env.LOG_DIR || './logs',
    logLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14'),
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE !== 'false'
  };
}
