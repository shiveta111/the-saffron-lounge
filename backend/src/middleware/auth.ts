import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload, UserRole } from '../utils/jwt';
import { CustomError } from './errorHandler';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      const error: CustomError = new Error('Access token is required');
      error.statusCode = 401;
      return next(error);
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const err: CustomError = new Error('Invalid or expired token');
    err.statusCode = 401;
    next(err);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: CustomError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error: CustomError = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

// Specific role-based middleware
export const requireAdmin = authorize(UserRole.ADMIN);
export const requireSeller = authorize(UserRole.SELLER, UserRole.ADMIN);
export const requireCustomer = authorize(UserRole.CUSTOMER, UserRole.SELLER, UserRole.ADMIN);

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch (error) {
        // Token invalid, but continue as guest
        delete req.user;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Alias for authenticate (for consistency with existing code)
export const authenticateToken = authenticate;