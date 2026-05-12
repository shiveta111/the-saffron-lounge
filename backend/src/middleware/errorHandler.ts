import { Request, Response, NextFunction } from 'express';
import * as winston from 'winston';
import { Prisma } from '@prisma/client';
import { addCorsHeaders } from '../utils/corsHelper';

// Configure centralized error logger
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'error-handler' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  errorLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: string;
  meta?: any;
}

/**
 * Centralized error handler middleware
 * Handles all errors, logs them appropriately, and returns user-friendly responses
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details: any = undefined;

  // Enhanced logging with full request context
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userId: (req as any).user?.id,
    userAgent: req.get('User-Agent'),
    errorName: err.name,
    errorMessage: err.message,
    errorCode: err.code,
    statusCode,
    stack: err.stack,
    body: isDevelopment ? req.body : undefined,
    query: isDevelopment ? req.query : undefined,
    params: isDevelopment ? req.params : undefined,
  };

  // Handle Prisma-specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (err.meta?.target as string[]) || [];
        const field = target.length > 0 ? target.join(', ') : 'field';
        statusCode = 409;
        message = `A record with this ${field} already exists`;
        details = { field, constraint: 'unique' };
        break;
      }
      case 'P2003': {
        // Foreign key constraint violation
        const field = err.meta?.field_name || 'reference';
        statusCode = 400;
        message = `Invalid reference: ${field} does not exist`;
        details = { field, constraint: 'foreign_key' };
        break;
      }
      case 'P2025': {
        // Record not found
        statusCode = 404;
        message = 'Resource not found';
        details = { operation: err.meta?.cause };
        break;
      }
      case 'P2014': {
        // Required relation violation
        statusCode = 400;
        message = 'Cannot delete record with dependent data';
        details = { constraint: 'relation' };
        break;
      }
      case 'P2022': {
        // Column does not exist - likely Prisma client not regenerated after schema change
        statusCode = 500;
        message = 'Database schema mismatch. Please regenerate Prisma client.';
        details = { 
          type: 'schema_mismatch',
          code: err.code,
          message: err.message 
        };
        errorLogger.warn('Prisma schema mismatch detected', { code: err.code, message: err.message });
        break;
      }
      default: {
        statusCode = 500;
        message = 'Database operation failed';
        details = { code: err.code };
      }
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    details = { type: 'validation' };
  }

  // Handle Prisma connection errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Database connection failed';
    details = { type: 'connection', recoverable: true };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Handle validation errors (from Joi or express-validator)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Input validation failed';
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  // Handle cast errors (invalid ID format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Log based on severity
  if (statusCode >= 500) {
    errorLogger.error('Server Error', logData);
  } else if (statusCode >= 400) {
    errorLogger.warn('Client Error', logData);
  } else {
    errorLogger.info('Request Error', logData);
  }

  // Create consistent error response
  const errorResponse: any = {
    success: false,
    error: message,
  };

  // Add details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace only in development for server errors
  if (isDevelopment && err.stack && statusCode >= 500) {
    errorResponse.stack = err.stack;
  }

  // Add recovery suggestions for specific errors
  if (statusCode === 503) {
    errorResponse.suggestion = 'Please try again in a few moments';
  } else if (statusCode === 401) {
    errorResponse.suggestion = 'Please log in again';
  } else if (statusCode === 409) {
    errorResponse.suggestion = 'Please use a different value';
  }

  // Add CORS headers to error responses
  addCorsHeaders(req, res);

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper to catch errors in async route handlers
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for operational errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};