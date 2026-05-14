import * as winston from 'winston';
import * as path from 'path';

/**
 * Custom log format
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  winston.format.json()
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...metadata }) => {
    let msg = `${timestamp} [${service || 'app'}] ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

/**
 * Create logger for a specific service
 */
export function createLogger(serviceName: string): winston.Logger {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // Error logs
      new winston.transports.File({
        filename: path.join('logs', `${serviceName}-error.log`),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined logs
      new winston.transports.File({
        filename: path.join('logs', `${serviceName}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join('logs', 'exceptions.log'),
        maxsize: 5242880,
        maxFiles: 3,
      }),
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join('logs', 'rejections.log'),
        maxsize: 5242880,
        maxFiles: 3,
      }),
    ],
  });

  // Add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: consoleFormat,
      })
    );
  }

  return logger;
}

/**
 * Default application logger
 */
export const logger = createLogger('app');

/**
 * Log levels:
 * - error: Error messages
 * - warn: Warning messages
 * - info: Informational messages
 * - http: HTTP request logs
 * - verbose: Verbose messages
 * - debug: Debug messages
 * - silly: Very detailed debug messages
 */

/**
 * Helper functions for structured logging
 */
export const logHelpers = {
  /**
   * Log HTTP request
   */
  logRequest: (logger: winston.Logger, req: any, duration?: number) => {
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  /**
   * Log database operation
   */
  logDbOperation: (logger: winston.Logger, operation: string, table: string, duration?: number) => {
    logger.debug('Database Operation', {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  /**
   * Log authentication event
   */
  logAuth: (logger: winston.Logger, event: string, userId?: number, success: boolean = true) => {
    logger.info('Authentication Event', {
      event,
      userId,
      success,
    });
  },

  /**
   * Log business event
   */
  logBusinessEvent: (logger: winston.Logger, event: string, data: Record<string, any>) => {
    logger.info('Business Event', {
      event,
      ...data,
    });
  },

  /**
   * Log security event
   */
  logSecurity: (logger: winston.Logger, event: string, severity: 'low' | 'medium' | 'high', data: Record<string, any>) => {
    logger.warn('Security Event', {
      event,
      severity,
      ...data,
    });
  },

  /**
   * Log performance metric
   */
  logPerformance: (logger: winston.Logger, metric: string, value: number, unit: string = 'ms') => {
    logger.info('Performance Metric', {
      metric,
      value,
      unit,
    });
  },
};

/**
 * Create request logger middleware
 */
export function createRequestLogger(serviceName: string = 'http') {
  const logger = createLogger(serviceName);
  
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Log request
    logHelpers.logRequest(logger, req);
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.http('HTTP Response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
      });
    });
    
    next();
  };
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}
