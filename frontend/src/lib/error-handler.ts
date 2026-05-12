/**
 * Error Handler Utility
 * 
 * Provides consistent error handling and message extraction across the application.
 * Categorizes errors and provides user-friendly messages.
 */

import { extractError } from './response-normalizer';

export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: any;
}

/**
 * Categorize error based on status code and error details
 */
export function categorizeError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // Network errors (no response)
  if (!error.response) {
    return ErrorType.NETWORK;
  }

  const statusCode = error.response?.status;

  switch (statusCode) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.AUTHENTICATION;
    case 403:
      return ErrorType.AUTHORIZATION;
    case 404:
      return ErrorType.NOT_FOUND;
    case 409:
      return ErrorType.CONFLICT;
    case 422:
      return ErrorType.VALIDATION;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(errorType: ErrorType, originalMessage?: string): string {
  const defaultMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: 'Network error. Please check your internet connection and try again.',
    [ErrorType.AUTHENTICATION]: 'Authentication failed. Please log in again.',
    [ErrorType.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
    [ErrorType.VALIDATION]: 'Invalid data. Please check your input and try again.',
    [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorType.CONFLICT]: 'A conflict occurred. This resource may already exist.',
    [ErrorType.SERVER]: 'Server error. Please try again later.',
    [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
  };

  // Use original message if available and meaningful, otherwise use default
  if (originalMessage && originalMessage.length > 0 && !originalMessage.includes('undefined')) {
    return originalMessage;
  }

  return defaultMessages[errorType];
}

/**
 * Extract detailed error information from error object
 */
export function extractErrorInfo(error: any): ErrorInfo {
  console.log('🔍 Extracting error info:', {
    hasError: !!error,
    hasResponse: !!error?.response,
    status: error?.response?.status
  });

  const errorType = categorizeError(error);
  const originalMessage = extractError(error);
  const message = getUserFriendlyMessage(errorType, originalMessage);
  const statusCode = error?.response?.status;
  const details = error?.response?.data;

  return {
    type: errorType,
    message,
    statusCode,
    details,
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return !error?.response;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return error?.response?.status === 401;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  const status = error?.response?.status;
  return status === 400 || status === 422;
}

/**
 * Extract validation errors from error response
 */
export function extractValidationErrors(error: any): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!error?.response?.data) {
    return errors;
  }

  const data = error.response.data;

  // Check for errors array
  if (Array.isArray(data.errors)) {
    data.errors.forEach((err: any) => {
      if (err.field && err.message) {
        errors[err.field] = err.message;
      } else if (err.path && err.message) {
        errors[err.path] = err.message;
      }
    });
  }

  // Check for errors object
  if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
    Object.keys(data.errors).forEach(field => {
      const fieldError = data.errors[field];
      if (typeof fieldError === 'string') {
        errors[field] = fieldError;
      } else if (Array.isArray(fieldError) && fieldError.length > 0) {
        errors[field] = fieldError[0];
      } else if (fieldError.message) {
        errors[field] = fieldError.message;
      }
    });
  }

  return errors;
}

/**
 * Log error for debugging
 */
export function logError(error: any, context?: string): void {
  const errorInfo = extractErrorInfo(error);
  
  console.error('❌ Error occurred:', {
    context,
    type: errorInfo.type,
    message: errorInfo.message,
    statusCode: errorInfo.statusCode,
    details: errorInfo.details,
    originalError: error,
  });
}

/**
 * Error handler object with all methods
 */
export const errorHandler = {
  categorizeError,
  getUserFriendlyMessage,
  extractErrorInfo,
  isNetworkError,
  isAuthError,
  isValidationError,
  extractValidationErrors,
  logError,
};

export default errorHandler;
