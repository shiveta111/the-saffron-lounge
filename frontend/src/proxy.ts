import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { env } from './lib/env';

// JWT_SECRET is server-side only - validate it here
const JWT_SECRET = (env.jwtSecret || process.env.JWT_SECRET) as string;
if (!JWT_SECRET || JWT_SECRET === '') {
  throw new Error('JWT_SECRET is required but not found in environment variables. This should only be used server-side.');
}

interface AuthUser {
  userId: number;
  email: string;
  role: string;
}

class AuthUtils {
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

  static hasRole(user: AuthUser | null, requiredRoles: string[]): boolean {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }

  static isAuthenticated(user: AuthUser | null): boolean {
    return user !== null;
  }

  static getLoginRedirect(pathname: string): string {
    return `/auth/login?redirect=${encodeURIComponent(pathname)}`;
  }

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

  static validateRouteAccess(
    pathname: string,
    user: AuthUser | null,
    requiredRoles?: string[]
  ): {
    hasAccess: boolean;
    redirectTo?: string;
    reason?: string;
  } {
    const isProtectedRoute = this.isProtectedRoute(pathname);
    if (isProtectedRoute && !this.isAuthenticated(user)) {
      return {
        hasAccess: false,
        redirectTo: this.getLoginRedirect(pathname),
        reason: 'Authentication required'
      };
    }

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

  static isAdminRoute(pathname: string): boolean {
    return pathname.startsWith('/admin');
  }

  static isSellerRoute(pathname: string): boolean {
    return pathname.startsWith('/seller');
  }

  static isCustomerRoute(pathname: string): boolean {
    return pathname.startsWith('/dashboard') && !this.isAdminRoute(pathname) && !this.isSellerRoute(pathname);
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // SECURITY FIX: Block non-GET requests to root path to prevent POST exploitation
  if (pathname === '/') {
    if (method !== 'GET' && method !== 'HEAD') {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      console.warn(`⚠️ Blocked ${method} request to root path from IP: ${ip}`);
      return new NextResponse(JSON.stringify({ 
        success: false, 
        error: 'Method Not Allowed',
        message: `${method} requests are not allowed on this path`
      }), { 
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'GET, HEAD'
        }
      });
    }
    return NextResponse.next();
  }

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/assets-main') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if the path is public
  if (!AuthUtils.isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // For now, let client-side handle authentication since proxy can't access localStorage
  // and we need to maintain compatibility with existing auth flow
  // The client-side ProtectedRoute component will handle redirects

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
