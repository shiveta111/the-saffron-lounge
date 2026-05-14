import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * 
 * Implements Double Submit Cookie pattern for CSRF protection
 * - Generates CSRF token and stores in cookie
 * - Validates token from request header/body against cookie
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// In-memory store for token validation (consider Redis for production with multiple servers)
const tokenStore = new Map<string, { token: string; expires: number }>();

// Clean expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a secure random CSRF token
 */
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware to generate and set CSRF token
 */
export const setCSRFToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip if token already exists and is valid
  const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (existingToken && tokenStore.has(existingToken)) {
    const stored = tokenStore.get(existingToken);
    if (stored && stored.expires > Date.now()) {
      // Token still valid, pass it to response
      res.locals.csrfToken = existingToken;
      return next();
    }
  }

  // Generate new token
  const token = generateCSRFToken();
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

  // Store token
  tokenStore.set(token, { token, expires });

  // Set cookie (HttpOnly to prevent XSS, Secure in production, SameSite for additional protection)
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Make token available to views/responses
  res.locals.csrfToken = token;
  next();
};

/**
 * Middleware to validate CSRF token
 */
export const validateCSRFToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (!cookieToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'CSRF token cookie not found'
    });
    return;
  }

  // Get token from header or body
  const requestToken = req.headers[CSRF_HEADER_NAME] as string || req.body?._csrf;
  if (!requestToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'CSRF token not provided in request header or body'
    });
    return;
  }

  // Validate tokens match
  if (cookieToken !== requestToken) {
    console.warn(`⚠️ CSRF token mismatch from IP: ${req.ip || 'unknown'}`);
    res.status(403).json({
      success: false,
      error: 'CSRF token invalid',
      message: 'CSRF token validation failed'
    });
    return;
  }

  // Validate token exists and is not expired
  const stored = tokenStore.get(cookieToken);
  if (!stored || stored.expires < Date.now()) {
    res.status(403).json({
      success: false,
      error: 'CSRF token expired',
      message: 'CSRF token has expired, please refresh the page'
    });
    return;
  }

  next();
};

/**
 * Combined middleware: Set and validate CSRF token
 */
export const csrfProtection = [setCSRFToken, validateCSRFToken];

/**
 * Endpoint to get CSRF token for AJAX requests
 */
export const getCSRFToken = (req: Request, res: Response): void => {
  res.json({
    success: true,
    csrfToken: res.locals.csrfToken
  });
};
