import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Log levels for database operations
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log categories for different database components
 */
export enum LogCategory {
  CONNECTION = 'connection',
  STARTUP = 'startup',
  RECOVERY = 'recovery',
  INTEGRITY = 'integrity',
  QUERY = 'query',
  MIGRATION = 'migration',
  SEED = 'seed',
  BACKUP = 'backup'
}

/**
 * Configuration for the database logger
 */
export interface DatabaseLoggerConfig {
  logDir?: string;
  logLevel?: LogLevel;
  maxFileSize?: number;
  maxFiles?: number;
  enableConsole?: boolean;
  enableFile?: boolean;
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

/**
 * Comprehensive logging system for database operations
 * Implements structured logging with rotation and retention policies
 */
export class DatabaseLogger {
  private loggers: Map<LogCategory, winston.Logger> = new Map();
  private config: Required<DatabaseLoggerConfig>;
  private logDir: string;

  constructor(config: DatabaseLoggerConfig = {}) {
    // Set default configuration
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'logs'),
      logLevel: config.logLevel || LogLevel.INFO,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles || 14, // 14 days of logs
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false
    };

    this.logDir = this.config.logDir;

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Initialize loggers for each category
    this.initializeLoggers();
  }

  /**
   * Ensure the log directory exists
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Initialize Winston loggers for each category
   */
  private initializeLoggers(): void {
    const categories = Object.values(LogCategory);

    for (const category of categories) {
      this.loggers.set(category, this.createLogger(category));
    }
  }

  /**
   * Create a Winston logger for a specific category
   */
  private createLogger(category: LogCategory): winston.Logger {
    const transports: winston.transport[] = [];

    // File transport with rotation
    if (this.config.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, `database-${category}.log`),
          level: this.config.logLevel,
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );

      // Separate error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, `database-${category}-error.log`),
          level: 'error',
          maxsize: this.config.maxFileSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
      );
    }

    // Console transport
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.logLevel,
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, category: cat, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${cat || category}] ${level}: ${message}${metaStr}`;
            })
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.logLevel,
      transports,
      exitOnError: false
    });
  }

  /**
   * Log a message with structured data
   */
  private log(entry: LogEntry): void {
    const logger = this.loggers.get(entry.category);
    if (!logger) {
      console.error(`Logger not found for category: ${entry.category}`);
      return;
    }

    const logData: any = {
      category: entry.category,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...entry.metadata
    };

    if (entry.error) {
      logData.error = {
        message: entry.error.message,
        stack: entry.error.stack,
        name: entry.error.name
      };
    }

    logger.log(entry.level, entry.message, logData);
  }

  // Connection logging methods
  connectionAttempt(url: string, attempt: number, maxRetries: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.CONNECTION,
      message: `Connection attempt ${attempt}/${maxRetries}`,
      metadata: { url: this.sanitizeUrl(url), attempt, maxRetries }
    });
  }

  connectionSuccess(url: string, duration: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.CONNECTION,
      message: 'Database connection established',
      metadata: { url: this.sanitizeUrl(url), duration }
    });
  }

  connectionFailure(url: string, error: Error, attempt: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.CONNECTION,
      message: 'Database connection failed',
      metadata: { url: this.sanitizeUrl(url), attempt },
      error
    });
  }

  connectionLost(reason?: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category: LogCategory.CONNECTION,
      message: 'Database connection lost',
      metadata: { reason }
    });
  }

  connectionRestored(duration: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.CONNECTION,
      message: 'Database connection restored',
      metadata: { duration }
    });
  }

  connectionPoolStatus(active: number, idle: number, total: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.CONNECTION,
      message: 'Connection pool status',
      metadata: { active, idle, total, utilization: `${((active / total) * 100).toFixed(1)}%` }
    });
  }

  // Startup logging methods
  startupCheckBegin(): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.STARTUP,
      message: 'Starting database startup checks'
    });
  }

  startupCheckComplete(success: boolean, duration: number, checks: Record<string, boolean>): void {
    this.log({
      timestamp: new Date(),
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      category: LogCategory.STARTUP,
      message: `Startup checks ${success ? 'completed successfully' : 'failed'}`,
      metadata: { success, duration, checks }
    });
  }

  startupCheckFailed(checkName: string, error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.STARTUP,
      message: `Startup check failed: ${checkName}`,
      error
    });
  }

  dockerContainerStatus(running: boolean, containerName?: string): void {
    this.log({
      timestamp: new Date(),
      level: running ? LogLevel.INFO : LogLevel.WARN,
      category: LogCategory.STARTUP,
      message: `Docker container ${running ? 'running' : 'not running'}`,
      metadata: { containerName, running }
    });
  }

  dockerVolumeStatus(exists: boolean, mounted: boolean, volumeName?: string): void {
    this.log({
      timestamp: new Date(),
      level: exists && mounted ? LogLevel.INFO : LogLevel.WARN,
      category: LogCategory.STARTUP,
      message: 'Docker volume status',
      metadata: { volumeName, exists, mounted }
    });
  }

  // Recovery logging methods
  recoveryTriggered(reason: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category: LogCategory.RECOVERY,
      message: 'Database recovery triggered',
      metadata: { reason }
    });
  }

  recoveryComplete(success: boolean, duration: number, actions: string[]): void {
    this.log({
      timestamp: new Date(),
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      category: LogCategory.RECOVERY,
      message: `Database recovery ${success ? 'completed' : 'failed'}`,
      metadata: { success, duration, actions }
    });
  }

  recoveryAction(action: string, details?: Record<string, any>): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.RECOVERY,
      message: `Recovery action: ${action}`,
      ...(details && { metadata: details })
    });
  }

  recoveryError(action: string, error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.RECOVERY,
      message: `Recovery action failed: ${action}`,
      error
    });
  }

  // Seed logging methods
  seedStart(scriptName: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.SEED,
      message: `Starting seed script: ${scriptName}`
    });
  }

  seedComplete(scriptName: string, duration: number, stats: Record<string, number>): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.SEED,
      message: `Seed script completed: ${scriptName}`,
      metadata: { duration, stats }
    });
  }

  seedRecordCreated(table: string, count: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.SEED,
      message: `Created ${count} record(s) in ${table}`,
      metadata: { table, count }
    });
  }

  seedRecordSkipped(table: string, count: number, reason: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.SEED,
      message: `Skipped ${count} record(s) in ${table}`,
      metadata: { table, count, reason }
    });
  }

  seedRecordUpdated(table: string, count: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.SEED,
      message: `Updated ${count} record(s) in ${table}`,
      metadata: { table, count }
    });
  }

  seedError(table: string, error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.SEED,
      message: `Seed error in ${table}`,
      error
    });
  }

  // Integrity monitoring methods
  integrityCheckStart(): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.INTEGRITY,
      message: 'Starting integrity check'
    });
  }

  integrityCheckComplete(duration: number, tables: Record<string, { count: number; change: number }>): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.INTEGRITY,
      message: 'Integrity check completed',
      metadata: { duration, tables }
    });
  }

  integrityAlert(table: string, previousCount: number, currentCount: number, changePercent: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category: LogCategory.INTEGRITY,
      message: `Data integrity alert: ${table}`,
      metadata: { table, previousCount, currentCount, changePercent, lost: previousCount - currentCount }
    });
  }

  integrityRecoveryTriggered(table: string, reason: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category: LogCategory.INTEGRITY,
      message: `Integrity recovery triggered for ${table}`,
      metadata: { table, reason }
    });
  }

  // Query logging methods
  queryExecuted(query: string, duration: number, rowCount?: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      category: LogCategory.QUERY,
      message: 'Query executed',
      metadata: { query: this.sanitizeQuery(query), duration, rowCount }
    });
  }

  queryError(query: string, error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.QUERY,
      message: 'Query failed',
      metadata: { query: this.sanitizeQuery(query) },
      error
    });
  }

  slowQuery(query: string, duration: number, threshold: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.WARN,
      category: LogCategory.QUERY,
      message: 'Slow query detected',
      metadata: { query: this.sanitizeQuery(query), duration, threshold }
    });
  }

  // Migration logging methods
  migrationStart(name: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.MIGRATION,
      message: `Starting migration: ${name}`
    });
  }

  migrationComplete(name: string, duration: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.MIGRATION,
      message: `Migration completed: ${name}`,
      metadata: { duration }
    });
  }

  migrationError(name: string, error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.MIGRATION,
      message: `Migration failed: ${name}`,
      error
    });
  }

  // Backup logging methods
  backupStart(type: 'database' | 'volume', destination: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.BACKUP,
      message: `Starting ${type} backup`,
      metadata: { type, destination }
    });
  }

  backupComplete(type: 'database' | 'volume', destination: string, duration: number, size?: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.BACKUP,
      message: `Backup completed: ${type}`,
      metadata: { type, destination, duration, size }
    });
  }

  backupError(type: 'database' | 'volume', error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.BACKUP,
      message: `Backup failed: ${type}`,
      error
    });
  }

  restoreStart(type: 'database' | 'volume', source: string): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.BACKUP,
      message: `Starting ${type} restore`,
      metadata: { type, source }
    });
  }

  restoreComplete(type: 'database' | 'volume', source: string, duration: number): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.INFO,
      category: LogCategory.BACKUP,
      message: `Restore completed: ${type}`,
      metadata: { type, source, duration }
    });
  }

  restoreError(type: 'database' | 'volume', error: Error): void {
    this.log({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      category: LogCategory.BACKUP,
      message: `Restore failed: ${type}`,
      error
    });
  }

  // Utility methods
  private sanitizeUrl(url: string): string {
    // Remove password from connection string
    return url.replace(/:[^:@]+@/, ':****@');
  }

  private sanitizeQuery(query: string): string {
    // Truncate long queries
    const maxLength = 200;
    if (query.length > maxLength) {
      return query.substring(0, maxLength) + '...';
    }
    return query;
  }

  /**
   * Get logger for a specific category (for advanced usage)
   */
  getLogger(category: LogCategory): winston.Logger | undefined {
    return this.loggers.get(category);
  }

  /**
   * Update log level dynamically
   */
  setLogLevel(level: LogLevel): void {
    this.config.logLevel = level;
    this.loggers.forEach(logger => {
      logger.level = level;
    });
  }

  /**
   * Close all loggers and cleanup
   */
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    
    this.loggers.forEach(logger => {
      closePromises.push(
        new Promise((resolve) => {
          logger.close();
          resolve();
        })
      );
    });

    await Promise.all(closePromises);
  }
}

// Singleton instance
let loggerInstance: DatabaseLogger | null = null;

/**
 * Get or create the singleton database logger instance
 */
export function getDatabaseLogger(config?: DatabaseLoggerConfig): DatabaseLogger {
  if (!loggerInstance) {
    loggerInstance = new DatabaseLogger(config);
  }
  return loggerInstance;
}

/**
 * Reset the logger instance (useful for testing)
 */
export function resetDatabaseLogger(): void {
  if (loggerInstance) {
    loggerInstance.close();
    loggerInstance = null;
  }
}

// Export singleton instance for convenience
export const dbLogger = getDatabaseLogger();
