import { Request, Response } from 'express';
import { env } from '../config/env';

/**
 * Parse frontend URLs from environment variable
 * Handles quotes and comma-separated values
 */
function parseFrontendUrls(frontendUrl: string): string[] {
  return frontendUrl
    .split(',')
    .map(url => url.trim().replace(/^["']|["']$/g, ''))
    .filter(url => url.length > 0);
}

/**
 * Get list of allowed origins
 */
export function getAllowedOrigins(): string[] {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
  ];

  if (env.urls.frontend) {
    const frontendUrls = parseFrontendUrls(env.urls.frontend);
    allowedOrigins.push(...frontendUrls);
  }

  return allowedOrigins;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = origin.toLowerCase();
  const normalizedAllowed = allowedOrigins.map(o => o.toLowerCase());
  
  return normalizedAllowed.includes(normalizedOrigin) || allowedOrigins.includes(origin);
}

/**
 * Add CORS headers to response if origin is allowed
 */
export function addCorsHeaders(req: Request, res: Response): void {
  const origin = req.headers.origin;
  
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Rate-Limit-Remaining');
  }
}



