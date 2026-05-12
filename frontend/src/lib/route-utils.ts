// Route utilities for handling dynamic routing and validation

export interface RouteConfig {
  path: string;
  roles: string[];
  requiresAuth: boolean;
  redirectTo?: string;
}

export const routeConfigs: Record<string, RouteConfig> = {
  // Public routes
  '/': { path: '/', roles: [], requiresAuth: false },
  '/auth/login': { path: '/auth/login', roles: [], requiresAuth: false },
  '/auth/register': { path: '/auth/register', roles: [], requiresAuth: false },
  '/auth/forgot-password': { path: '/auth/forgot-password', roles: [], requiresAuth: false },

  // Customer routes
  '/dashboard': { path: '/dashboard', roles: ['CUSTOMER', 'SELLER', 'ADMIN'], requiresAuth: true },

  // Seller routes
  '/seller': { path: '/seller', roles: ['SELLER'], requiresAuth: true, redirectTo: '/dashboard' },

  // Admin routes
  '/admin': { path: '/admin', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/dashboard': { path: '/admin/dashboard', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/users': { path: '/admin/users', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/bookings': { path: '/admin/bookings', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/customers': { path: '/admin/customers', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/orders': { path: '/admin/orders', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/menu': { path: '/admin/menu', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/promotions': { path: '/admin/promotions', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/notifications': { path: '/admin/notifications', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/blog': { path: '/admin/blog', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/team': { path: '/admin/team', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },
  '/admin/testimonials': { path: '/admin/testimonials', roles: ['ADMIN'], requiresAuth: true, redirectTo: '/dashboard' },

  // Utility routes
  '/status': { path: '/status', roles: [], requiresAuth: false },
};

export class RouteValidator {
  static isPublicRoute(pathname: string): boolean {
    const config = this.getRouteConfig(pathname);
    return config ? !config.requiresAuth : false;
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

  static getRouteConfig(pathname: string): RouteConfig | null {
    // Check for exact matches first
    if (routeConfigs[pathname]) {
      return routeConfigs[pathname];
    }

    // Check for dynamic routes
    if (pathname.startsWith('/admin/dynamic/')) {
      return {
        path: pathname,
        roles: ['ADMIN'],
        requiresAuth: true,
        redirectTo: '/admin/dashboard'
      };
    }

    // Check for pattern matches
    for (const [pattern, config] of Object.entries(routeConfigs)) {
      if (pathname.startsWith(pattern)) {
        return config;
      }
    }

    return null;
  }

  static getRequiredRoles(pathname: string): string[] {
    const config = this.getRouteConfig(pathname);
    return config?.roles || [];
  }

  static getRedirectPath(pathname: string, userRole?: string): string {
    const config = this.getRouteConfig(pathname);

    if (config?.redirectTo) {
      return config.redirectTo;
    }

    // Default redirects based on user role
    if (userRole) {
      switch (userRole) {
        case 'ADMIN':
          return '/admin/dashboard';
        case 'SELLER':
          return '/seller';
        case 'CUSTOMER':
          return '/dashboard';
        default:
          return '/dashboard';
      }
    }

    return '/login';
  }

  static validateRouteAccess(pathname: string, userRole?: string, isAuthenticated?: boolean): {
    hasAccess: boolean;
    redirectTo?: string;
    reason?: string;
  } {
    const config = this.getRouteConfig(pathname);

    if (!config) {
      return {
        hasAccess: false,
        redirectTo: '/404',
        reason: 'Route not found'
      };
    }

    if (config.requiresAuth && !isAuthenticated) {
      return {
        hasAccess: false,
        redirectTo: '/login',
        reason: 'Authentication required'
      };
    }

    if (config.roles.length > 0 && userRole && !config.roles.includes(userRole)) {
      return {
        hasAccess: false,
        redirectTo: this.getRedirectPath(pathname, userRole),
        reason: `Access denied for role: ${userRole}`
      };
    }

    return { hasAccess: true };
  }

  static getBreadcrumbs(pathname: string): Array<{ label: string; path: string }> {
    const breadcrumbs: Array<{ label: string; path: string }> = [];
    const parts = pathname.split('/').filter(Boolean);

    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      currentPath += `/${parts[i]}`;
      const config = this.getRouteConfig(currentPath);

      if (config) {
        let label = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);

        // Special handling for dynamic routes
        if (parts[i] === 'dynamic' && i + 1 < parts.length) {
          label = `${parts[i + 1].charAt(0).toUpperCase() + parts[i + 1].slice(1)} Management`;
          i++; // Skip the next part as it's included in the label
        }

        breadcrumbs.push({
          label,
          path: currentPath
        });
      }
    }

    return breadcrumbs;
  }

  static isDynamicRoute(pathname: string): boolean {
    return pathname.startsWith('/admin/dynamic/');
  }

  static extractDynamicParams(pathname: string): Record<string, string> {
    const params: Record<string, string> = {};

    if (this.isDynamicRoute(pathname)) {
      const parts = pathname.split('/');
      if (parts.length >= 4) {
        params.resource = parts[3];
        if (parts.length >= 5) {
          params.id = parts[4];
        }
      }
    }

    return params;
  }

  static buildDynamicRoute(resource: string, id?: string): string {
    let path = `/admin/dynamic/${resource}`;
    if (id) {
      path += `/${id}`;
    }
    return path;
  }
}

// Utility functions for route navigation
export const getHomeRoute = (userRole?: string): string => {
  if (!userRole) return '/login';

  switch (userRole) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'SELLER':
      return '/seller';
    case 'CUSTOMER':
      return '/dashboard';
    default:
      return '/dashboard';
  }
};

export const getLoginRedirect = (userRole?: string): string => {
  return getHomeRoute(userRole);
};

export const isValidRoute = (pathname: string): boolean => {
  return RouteValidator.getRouteConfig(pathname) !== null;
};