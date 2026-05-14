// Validate and provide type-safe access to environment variables

// Check if we're on the server (this works at runtime, not build time)
const isServer = typeof window === 'undefined';

interface EnvConfig {
  apiUrl: string;
  wsUrl: string;
  adminUrl: string;
  nodeEnv: string;
  jwtSecret: string; // Only available server-side, will be empty string on client
}

function validateEnv(): EnvConfig {
  // Required variables (available client-side via NEXT_PUBLIC_ prefix)
  let apiUrl = process.env.NEXT_PUBLIC_API_URL;
  let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  let adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  const forceRemoteOnLocalhost = process.env.NEXT_PUBLIC_FORCE_REMOTE_API_ON_LOCALHOST === 'true';
  
  // JWT_SECRET is server-side only (not NEXT_PUBLIC_)
  // On client-side, this will be undefined, which is fine - we'll use empty string
  // Server-side code that needs it will validate separately
  const jwtSecret = (typeof window === 'undefined' ? process.env.JWT_SECRET : '') || '';

  // Validation - only check client-accessible variables
  // JWT_SECRET is NOT validated here because it's not available on client
  const missing: string[] = [];
  if (!apiUrl) missing.push('NEXT_PUBLIC_API_URL');
  if (!wsUrl) missing.push('NEXT_PUBLIC_WS_URL');
  if (!adminUrl) missing.push('NEXT_PUBLIC_ADMIN_URL');
  
  // DO NOT validate JWT_SECRET here - it's server-only
  // Server-side code (middleware, auth-utils) will validate it separately

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env.local and configure the values.'
    );
  }

  // Safety guard: when app is running on localhost, default to local services.
  // This prevents accidental calls to staging/production from local dev.
  if (!isServer && !forceRemoteOnLocalhost) {
    const isFrontendLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isFrontendLocalhost) {
      const apiHost = apiUrl ? new URL(apiUrl).hostname : '';
      const wsHost = wsUrl ? new URL(wsUrl.replace(/^ws/, 'http')).hostname : '';
      const adminHost = adminUrl ? new URL(adminUrl).hostname : '';

      const isApiLocal = apiHost === 'localhost' || apiHost === '127.0.0.1';
      const isWsLocal = wsHost === 'localhost' || wsHost === '127.0.0.1';
      const isAdminLocal = adminHost === 'localhost' || adminHost === '127.0.0.1';

      if (!isApiLocal) apiUrl = 'http://localhost:8000/api/v1';
      if (!isWsLocal) wsUrl = 'ws://localhost:8000';
      if (!isAdminLocal) adminUrl = 'http://localhost:3000';
    }
  }

  // At this point, TypeScript knows these are defined because we've checked above
  return {
    apiUrl: apiUrl!,
    wsUrl: wsUrl!,
    adminUrl: adminUrl!,
    jwtSecret: jwtSecret, // Empty string on client-side (won't be used)
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

export const env = validateEnv();
export default env;






