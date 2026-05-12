import type { NextConfig } from "next";

// Check if we're using localhost backend (development or local build)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const isLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');

const nextConfig: NextConfig = {
  // Enable experimental features for admin panel
  serverExternalPackages: ['@prisma/client', 'bcrypt'],

  // REMOVED: Proxy configuration causing authentication issues
  // API routes now handle backend proxying directly to avoid conflicts

  // Environment variables - FIXED: Proper backend URL configuration
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000',
  },

  // Performance optimizations
  experimental: {
    // Ensure proper hydration
    optimizeCss: false,
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react'],
  },

  // Disable static optimization for admin routes
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Image configuration - Allow external image domains
  images: {
    // Disable optimization when using localhost to avoid private IP errors
    // This applies to both dev and build when backend is on localhost
    unoptimized: isLocalhost,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'saffron-staging.ekarigar.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ekarigar.com',
        pathname: '/**',
      },
    ],
    // Disable the private IP check in development
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Enable image optimization - Next.js will optimize images automatically
    // In development, images are optimized on-demand
    // In production, images are optimized and cached
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configure headers to prevent caching issues and enable CORS
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/assets-main/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js static files
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Add rewrites to ensure static assets are served correctly in production
  async rewrites() {
    return [
      {
        source: '/assets-main/:path*',
        destination: '/assets-main/:path*',
      },
    ];
  },

  // Disable output file tracing for public assets
  outputFileTracingRoot: process.cwd(),

};

export default nextConfig;
