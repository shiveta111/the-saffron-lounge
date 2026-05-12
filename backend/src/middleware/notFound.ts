import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';
import { addCorsHeaders } from '../utils/corsHelper';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;

  // Log the 404 request for monitoring
  console.log(`[${new Date().toISOString()}] 404 - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  // Add CORS headers for 404 responses
  addCorsHeaders(req, res);

  const error: CustomError = new Error(message);
  error.statusCode = 404;
  next(error);
};