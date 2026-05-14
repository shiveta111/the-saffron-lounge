import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { env } from './env';

// JWT_SECRET is server-side only - validate it here
const JWT_SECRET = (env.jwtSecret || process.env.JWT_SECRET || '') as string;
if (!JWT_SECRET || JWT_SECRET === '') {
  throw new Error('JWT_SECRET is required but not found in environment variables. This should only be used server-side.');
}

export interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

export class AuthUtils {
  /**
   * Verify JWT token from Authorization header
   */
  static verifyToken(request: NextRequest): AuthUser | null {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthUser;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(user: AuthUser | null, requiredRoles: string[]): boolean {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(user: AuthUser | null): boolean {
    return user !== null;
  }

  /**
   * Get redirect URL for unauthenticated users
   */
  static getLoginRedirect(pathname: string): string {
    return `/auth/login?redirect=${encodeURIComponent(pathname)}`;
  }

  /**
   * Get redirect URL based on user role
   */
  static getRoleBasedRedirect(user: AuthUser): string {
    switch (user.role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SELLER':
        return '/seller/dashboard';
      case 'CUSTOMER':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  }

  /**
   * Validate route access based on authentication and roles
   */
  static validateRouteAccess(
    pathname: string,
    user: AuthUser | null,
    requiredRoles?: string[]
  ): {
    hasAccess: boolean;
    redirectTo?: string;
    reason?: string;
  } {
    // Check if authentication is required
    const isProtectedRoute = this.isProtectedRoute(pathname);
    if (isProtectedRoute && !this.isAuthenticated(user)) {
      return {
        hasAccess: false,
        redirectTo: this.getLoginRedirect(pathname),
        reason: 'Authentication required'
      };
    }

    // Check role-based access
    if (requiredRoles && requiredRoles.length > 0 && user) {
      if (!this.hasRole(user, requiredRoles)) {
        return {
          hasAccess: false,
          redirectTo: this.getRoleBasedRedirect(user),
          reason: `Access denied for role: ${user.role}`
        };
      }
    }

    return { hasAccess: true };
  }

  /**
   * Check if route requires authentication
   */
  static isProtectedRoute(pathname: string): boolean {
    const publicPaths = [
      '/',
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/reset-password',
      '/verify-otp',
      '/status',
      '/debug'
    ];

    return !publicPaths.some(path => pathname.startsWith(path));
  }

  /**
   * Check if route is admin-only
   */
  static isAdminRoute(pathname: string): boolean {
    return pathname.startsWith('/admin');
  }

  /**
   * Check if route is seller-only
   */
  static isSellerRoute(pathname: string): boolean {
    return pathname.startsWith('/seller');
  }

  /**
   * Check if route is customer-only
   */
  static isCustomerRoute(pathname: string): boolean {
    return pathname.startsWith('/dashboard') && !this.isAdminRoute(pathname) && !this.isSellerRoute(pathname);
  }
}