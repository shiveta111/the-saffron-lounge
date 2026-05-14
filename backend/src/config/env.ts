/**
 * Centralized Environment Configuration
 * 
 * This module validates and exports all environment variables with NO fallbacks.
 * The application will fail fast on startup if required variables are missing.
 */

/**
 * Require an environment variable - throws if missing
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Please check your .env file and ensure ${key} is set.`
    );
  }
  return value;
}

/**
 * Get optional environment variable with no fallback
 */
function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Parse DATABASE_URL into connection components
 * Handles URL-encoded passwords and special characters
 */
function parseDatabaseUrl(url: string): {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
} {
  try {
    // Use URL class to properly handle URL encoding
    const parsed = new URL(url);
    
    if (parsed.protocol !== 'mysql:') {
      throw new Error(`Invalid protocol: ${parsed.protocol}. Expected mysql:`);
    }

    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
    const database = parsed.pathname.slice(1); // Remove leading '/'
    const user = parsed.username;
    const password = parsed.password || ''; // Handle empty passwords

    if (!host || !database || !user) {
      throw new Error('Missing required components in DATABASE_URL');
    }

    return {
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      host,
      port,
      database: decodeURIComponent(database)
    };
  } catch (error) {
    throw new Error(
      `❌ Invalid DATABASE_URL format.\n` +
      `   Expected: mysql://user:password@host:port/database\n` +
      `   Got: ${url}\n` +
      `   Error: ${(error as Error).message}`
    );
  }
}

/**
 * Parse integer environment variable
 */
function requireEnvInt(key: string): number {
  const value = requireEnv(key);
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new Error(
      `❌ Environment variable ${key} must be a valid integer.\n` +
      `   Got: ${value}`
    );
  }
  
  return parsed;
}

/**
 * Parse boolean environment variable
 */
function requireEnvBool(key: string): boolean {
  const value = requireEnv(key);
  return value.toLowerCase() === 'true';
}

// Parse DATABASE_URL into components
const databaseUrl = requireEnv('DATABASE_URL');
const dbConfig = parseDatabaseUrl(databaseUrl);

/**
 * Centralized environment configuration
 * All values are required and validated - NO fallbacks!
 */
export const env = {
  // Database Configuration
  database: {
    url: databaseUrl,
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    connectionTimeout: requireEnvInt('DB_CONNECTION_TIMEOUT'),
    maxRetries: requireEnvInt('DB_MAX_RETRIES'),
    poolSize: requireEnvInt('DB_POOL_SIZE'),
  },

  // JWT Configuration
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    expiresIn: requireEnv('JWT_EXPIRES_IN'),
    refreshExpiresIn: requireEnv('JWT_REFRESH_EXPIRES_IN'),
  },

  // Server Configuration
  server: {
    nodeEnv: requireEnv('NODE_ENV'),
    port: requireEnvInt('PORT'),
    runStartupChecks: requireEnvBool('RUN_STARTUP_CHECKS'),
  },

  // Email Configuration
  email: {
    host: requireEnv('EMAIL_HOST'),
    port: requireEnvInt('EMAIL_PORT'),
    secure: requireEnvBool('EMAIL_SECURE'),
    user: requireEnv('EMAIL_USER'),
    password: requireEnv('EMAIL_PASS'),
    from: requireEnv('EMAIL_FROM'),
    fromName: requireEnv('EMAIL_FROM_NAME'),
  },

  // Frontend & API URLs
  urls: {
    frontend: requireEnv('FRONTEND_URL'),
    api: requireEnv('API_BASE_URL'),
  },

  // WhatsApp Configuration
  whatsapp: {
    apiUrl: requireEnv('WHATSAPP_API_URL'),
    apiKey: requireEnv('WHATSAPP_API_KEY'),
    phoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID'),
    businessAccountId: requireEnv('WHATSAPP_BUSINESS_ACCOUNT_ID'),
    verifyToken: requireEnv('WHATSAPP_VERIFY_TOKEN'),
  },

  // Seeding Configuration
  seed: {
    autoSeedOnEmpty: requireEnvBool('AUTO_SEED_ON_EMPTY'),
  },

  // Optional Configuration
  optional: {
    adminCreationToken: optionalEnv('ADMIN_CREATION_TOKEN') || 'SUPER_ADMIN_TOKEN_2024',
    npmPackageVersion: optionalEnv('npm_package_version') || '1.0.0',
  },

  // Cloudinary Configuration (Optional)
  cloudinary: {
    cloudName: optionalEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: optionalEnv('CLOUDINARY_API_KEY'),
    apiSecret: optionalEnv('CLOUDINARY_API_SECRET'),
  },
};

/**
 * Validate all environment variables
 * Call this at application startup to ensure configuration is valid
 */
export function validateEnv(): void {
  try {
    // Access all env properties to trigger validation
    const requiredVars = [
      // Database
      env.database.url,
      env.database.host,
      env.database.user,
      env.database.database,
      env.database.port,
      env.database.connectionTimeout,
      env.database.maxRetries,
      env.database.poolSize,
      
      // JWT
      env.jwt.secret,
      env.jwt.refreshSecret,
      env.jwt.expiresIn,
      env.jwt.refreshExpiresIn,
      
      // Server
      env.server.nodeEnv,
      env.server.port,
      env.server.runStartupChecks,
      
      // Email
      env.email.host,
      env.email.port,
      env.email.secure,
      env.email.user,
      env.email.password,
      env.email.from,
      env.email.fromName,
      
      // URLs
      env.urls.frontend,
      env.urls.api,
      
      // WhatsApp
      env.whatsapp.apiUrl,
      env.whatsapp.apiKey,
      env.whatsapp.phoneNumberId,
      env.whatsapp.businessAccountId,
      env.whatsapp.verifyToken,
      
      // Seed
      env.seed.autoSeedOnEmpty,
    ];

    console.log('✅ Environment validation passed');
    console.log(`📊 Database: ${env.database.database} on ${env.database.host}:${env.database.port}`);
    console.log(`🔐 JWT Secret: ${env.jwt.secret.substring(0, 10)}...`);
    console.log(`📧 Email: ${env.email.from}`);
    console.log(`🌐 Frontend URL: ${env.urls.frontend}`);
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error((error as Error).message);
    console.error('\n💡 Please check your .env file in the backend directory.');
    throw error;
  }
}

export default env;
