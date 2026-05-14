/**
 * Tests for the database logger
 * 
 * These tests demonstrate the logger functionality and ensure
 * it works correctly in different scenarios.
 */

import { DatabaseLogger, LogLevel, LogCategory, getDatabaseLogger, resetDatabaseLogger } from '../database-logger';
import fs from 'fs';
import path from 'path';

describe('DatabaseLogger', () => {
  const testLogDir = path.join(process.cwd(), 'logs', 'test');
  let logger: DatabaseLogger;

  beforeEach(() => {
    // Reset logger before each test
    resetDatabaseLogger();
    
    // Create logger with test configuration
    logger = getDatabaseLogger({
      logDir: testLogDir,
      logLevel: LogLevel.DEBUG,
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 3,
      enableConsole: false, // Disable console for tests
      enableFile: true
    });
  });

  afterEach(async () => {
    // Cleanup
    await logger.close();
    resetDatabaseLogger();
  });

  afterAll(() => {
    // Clean up test logs
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create log directory if it does not exist', () => {
      expect(fs.existsSync(testLogDir)).toBe(true);
    });

    it('should create loggers for all categories', () => {
      const categories = Object.values(LogCategory);
      categories.forEach(category => {
        const categoryLogger = logger.getLogger(category);
        expect(categoryLogger).toBeDefined();
      });
    });
  });

  describe('Connection Logging', () => {
    it('should log connection attempts', () => {
      logger.connectionAttempt('mysql://localhost:3306/test', 1, 5);
      
      const logFile = path.join(testLogDir, 'database-connection.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });

    it('should sanitize passwords in connection URLs', () => {
      logger.connectionSuccess('mysql://root:password123@localhost:3306/test', 1000);
      
      const logFile = path.join(testLogDir, 'database-connection.log');
      const content = fs.readFileSync(logFile, 'utf-8');
      
      expect(content).not.toContain('password123');
      expect(content).toContain('****');
    });

    it('should log connection failures with error details', () => {
      const error = new Error('Connection timeout');
      logger.connectionFailure('mysql://localhost:3306/test', error, 1);
      
      const errorLogFile = path.join(testLogDir, 'database-connection-error.log');
      expect(fs.existsSync(errorLogFile)).toBe(true);
    });
  });

  describe('Startup Logging', () => {
    it('should log startup checks', () => {
      logger.startupCheckBegin();
      logger.dockerContainerStatus(true, 'mysql-test');
      logger.startupCheckComplete(true, 1500, { docker: true, connection: true });
      
      const logFile = path.join(testLogDir, 'database-startup.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Recovery Logging', () => {
    it('should log recovery operations', () => {
      logger.recoveryTriggered('Empty database');
      logger.recoveryAction('Creating admin user', { email: 'admin@test.com' });
      logger.recoveryComplete(true, 2000, ['admin created', 'data seeded']);
      
      const logFile = path.join(testLogDir, 'database-recovery.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Seed Logging', () => {
    it('should log seed operations', () => {
      logger.seedStart('test-seed.ts');
      logger.seedRecordCreated('users', 5);
      logger.seedRecordSkipped('categories', 3, 'Already exist');
      logger.seedComplete('test-seed.ts', 1000, { users: 5, categories: 3 });
      
      const logFile = path.join(testLogDir, 'database-seed.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Integrity Logging', () => {
    it('should log integrity checks', () => {
      logger.integrityCheckStart();
      logger.integrityAlert('users', 100, 95, -5.0);
      logger.integrityCheckComplete(500, { users: { count: 95, change: -5 } });
      
      const logFile = path.join(testLogDir, 'database-integrity.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Query Logging', () => {
    it('should log query execution', () => {
      logger.queryExecuted('SELECT * FROM users', 45, 100);
      
      const logFile = path.join(testLogDir, 'database-query.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });

    it('should truncate long queries', () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'x'.repeat(300);
      logger.queryExecuted(longQuery, 100);
      
      const logFile = path.join(testLogDir, 'database-query.log');
      const content = fs.readFileSync(logFile, 'utf-8');
      
      expect(content).toContain('...');
      expect(content.length).toBeLessThan(longQuery.length + 500);
    });

    it('should log slow queries', () => {
      logger.slowQuery('SELECT * FROM products', 5000, 1000);
      
      const logFile = path.join(testLogDir, 'database-query.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Migration Logging', () => {
    it('should log migrations', () => {
      logger.migrationStart('add_user_fields');
      logger.migrationComplete('add_user_fields', 1500);
      
      const logFile = path.join(testLogDir, 'database-migration.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Backup Logging', () => {
    it('should log backup operations', () => {
      logger.backupStart('database', '/tmp/backup.sql');
      logger.backupComplete('database', '/tmp/backup.sql', 3000, 1024000);
      
      const logFile = path.join(testLogDir, 'database-backup.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });

    it('should log restore operations', () => {
      logger.restoreStart('database', '/tmp/backup.sql');
      logger.restoreComplete('database', '/tmp/backup.sql', 2000);
      
      const logFile = path.join(testLogDir, 'database-backup.log');
      expect(fs.existsSync(logFile)).toBe(true);
    });
  });

  describe('Log Level Management', () => {
    it('should update log level dynamically', () => {
      logger.setLogLevel(LogLevel.ERROR);
      
      // INFO level should not be logged
      logger.connectionSuccess('mysql://localhost:3306/test', 1000);
      
      // ERROR level should be logged
      const error = new Error('Test error');
      logger.connectionFailure('mysql://localhost:3306/test', error, 1);
      
      const errorLogFile = path.join(testLogDir, 'database-connection-error.log');
      expect(fs.existsSync(errorLogFile)).toBe(true);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const logger1 = getDatabaseLogger();
      const logger2 = getDatabaseLogger();
      
      expect(logger1).toBe(logger2);
    });

    it('should reset singleton instance', () => {
      const logger1 = getDatabaseLogger();
      resetDatabaseLogger();
      const logger2 = getDatabaseLogger();
      
      expect(logger1).not.toBe(logger2);
    });
  });
});
