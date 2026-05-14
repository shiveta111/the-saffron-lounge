import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env-main if it exists, otherwise fall back to .env
const envMainPath = path.join(process.cwd(), '.env-main');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envMainPath)) {
  dotenv.config({ path: envMainPath });
  console.log('✅ Loaded environment variables from .env-main');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Loaded environment variables from .env');
} else {
  console.warn('⚠️  Warning: Neither .env-main nor .env file found. Environment variables may not be loaded.');
}

// Validate environment variables immediately after loading .env
import { env, validateEnv } from './config/env';
validateEnv(); // Fail fast if any required env vars are missing

import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { wsManager } from './utils/websocket';
import { isOriginAllowed, getAllowedOrigins } from './utils/corsHelper';

// Swagger definitions are now included in route files

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import adminProductsRoutes from './routes/admin-products';
import dataIntegrityRoutes from './routes/data-integrity';
import customerRoutes from './routes/customer';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import menuRoutes from './routes/menu';
import menusRoutes from './routes/menus';
import categoryRoutes from './routes/categories';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import promotionRoutes from './routes/promotions';
import inventoryRoutes from './routes/inventory';
import paymentRoutes from './routes/payments';
import blogRoutes from './routes/blog';
import blogCategoriesRoutes from './routes/blog-categories';
import teamRoutes from './routes/team';
import testimonialsRoutes from './routes/testimonials';
import contactRoutes from './routes/contact';
import servicesRoutes from './routes/services';
import categoriesRoutes from './routes/categories';
import newsletterRoutes from './routes/newsletter';
import faqRoutes from './routes/faq';
import eventsRoutes from './routes/events';
import timeslotsRoutes from './routes/timeslots';
import notificationsRoutes from './routes/notifications';
import reviewRoutes from './routes/reviews';
import securityRoutes from './routes/security';
import settingsRoutes from './routes/settings';
import tablesRoutes from './routes/tables';
import reservationsRoutes from './routes/reservations';
import whatsappRoutes from './routes/whatsapp';
import deliveryRoutes from './routes/delivery';
import uploadRoutes from './routes/upload';
import mediaRoutes from './routes/media';
import imagesRoutes from './routes/images';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { startupChecker } from './utils/startupChecker';

const app: Application = express();

// Enable trust proxy for rate limiting behind reverse proxy (Apache/Nginx)
app.set('trust proxy', 1); // Trust first proxy (Apache/Nginx)
const server = createServer(app);
const PORT = parseInt(process.env.PORT || '8000', 10);

// Handle port conflicts gracefully
const startServer = (port: number) => {
  // Check if server is already listening
  if (server.listening) {
    console.log(`🚀 Server is already running on http://localhost:${port}`);
    return;
  }

  server.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/v1/api-docs`);
    console.log(`💚 Health Check: http://localhost:${port}/api/v1/health`);
    console.log(`🔌 WebSocket server initialized with ${wsManager.getConnectedClientsCount()} clients`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server failed to start:', err);
      process.exit(1);
    }
  });
};

// Initialize WebSocket server
wsManager.initialize(server);

// Security middleware - Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:*", "http://127.0.0.1:*"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
  crossOriginResourcePolicy: {
    policy: "cross-origin" // Allow cross-origin requests for static assets
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced CORS configuration

const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Normalize origin for comparison (handle IPv6-mapped IPv4 addresses)
    const normalizedOrigin = origin.toLowerCase().replace(/^http:\/\/\[::ffff:/, 'http://').replace(/\]/, '');

    // In development, allow localhost variations (including IPv6-mapped)
    if (env.server.nodeEnv !== 'production') {
      if (
        normalizedOrigin.startsWith('http://localhost:') || 
        normalizedOrigin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
    }

    // Check if origin is allowed using shared helper (check both original and normalized)
    if (isOriginAllowed(origin) || isOriginAllowed(normalizedOrigin)) {
      return callback(null, true);
    }

    // Log rejected origin for debugging
    const allowedOrigins = getAllowedOrigins();
    console.warn(`⚠️  CORS blocked origin: ${origin} (normalized: ${normalizedOrigin}). Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// SECURITY FIX: Enable rate limiting to prevent brute force and DDoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and internal requests
    return req.path === '/api/v1/health' || req.ip === '127.0.0.1' || req.ip === '::1';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: 'Too many upload requests from this IP, please try again later.',
});

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// Apply upload rate limiting to upload routes
app.use('/api/v1/upload', uploadLimiter);
app.use('/api/v1/media', uploadLimiter);

// SECURITY: Cookie parser middleware (required for CSRF protection)
app.use(cookieParser());

// Body parsing middleware with error handling
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res: any, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({
        success: false,
        error: 'Invalid JSON payload',
        message: 'Request body contains invalid JSON'
      });
      return;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger configuration - Restored dynamic parsing with error handling
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description: 'Comprehensive e-commerce API with authentication and product management',
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
        description: 'Development server (v1)',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'SELLER', 'CUSTOMER'],
              description: 'User role'
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                accessToken: {
                  type: 'string',
                  description: 'JWT access token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                },
                refreshToken: {
                  type: 'string',
                  description: 'JWT refresh token',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            error: {
              type: 'string',
              example: 'Detailed error information'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/auth.ts',
    './src/routes/products.ts',
    './src/routes/menu.ts',
    './src/routes/orders.ts',
    './src/routes/admin.ts',
    './src/routes/blog.ts',
    './src/routes/cart.ts',
    './src/routes/categories.ts',
    './src/routes/contact.ts',
    './src/routes/customer.ts',
    './src/routes/events.ts',
    './src/routes/faq.ts',
    './src/routes/inventory.ts',
    './src/routes/newsletter.ts',
    './src/routes/notifications.ts',
    './src/routes/payments.ts',
    './src/routes/promotions.ts',
    './src/routes/reviews.ts',
    './src/routes/services.ts',
    './src/routes/team.ts',
    './src/routes/security.ts',
    './src/routes/settings.ts',
    './src/routes/tables.ts',
    './src/routes/reservations.ts',
    './src/routes/whatsapp.ts',
    './src/routes/delivery.ts',
    './src/routes/media.ts'
  ],
};

// Generate swagger spec with comprehensive error handling
let swaggerSpec: any;
try {
  swaggerSpec = swaggerJsdoc(swaggerOptions);
  
  // Post-process: Transform paths to use /api/v1 prefix
  if (swaggerSpec.paths) {
    const transformedPaths: any = {};
    for (const [path, pathItem] of Object.entries(swaggerSpec.paths)) {
      // Remove /api prefix if present, then add /api/v1
      let newPath = path.startsWith('/api/') ? path.replace(/^\/api/, '/api/v1') : `/api/v1${path}`;
      // Handle root paths
      if (path === '/' || path === '') {
        newPath = '/api/v1';
      }
      transformedPaths[newPath] = pathItem;
    }
    swaggerSpec.paths = transformedPaths;
  }
  
  // Update fallback server URL to include /api/v1
  if (swaggerSpec.servers && swaggerSpec.servers.length > 0) {
    swaggerSpec.servers[0].url = swaggerSpec.servers[0].url.replace(/\/api\/v1$/, '') + '/api/v1';
  }
  
  console.log(`📚 Swagger documentation generated successfully with ${Object.keys(swaggerSpec.paths || {}).length} endpoints`);
} catch (error) {
  console.error('❌ Swagger generation failed:', (error as Error).message);
  console.error('📝 Falling back to minimal specification');

  // Fallback minimal spec
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description: 'API Documentation (Limited - check server logs for parsing errors)',
    },
    servers: [
      {
        url: `${env.urls.api}/api/v1`,
        description: env.server.nodeEnv === 'production' ? 'Production server (v1)' : 'Development server (v1)',
      },
    ],
    paths: {
      '/api/v1/health': {
        get: {
          summary: 'Health check endpoint',
          description: 'Check if the API is running',
          tags: ['System'],
          responses: {
            200: {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'OK' },
                      timestamp: { type: 'string', format: 'date-time' },
                      environment: { type: 'string', example: 'development' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
app.get('/api/v1/api-docs/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
// Legacy route for backward compatibility with frontend
app.get('/api/api-docs/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Legacy Swagger UI route
app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Add CORS headers for static assets
app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Determine if origin is allowed
  let isAllowed = false;
  if (!origin) {
    // Allow requests with no origin (direct access, mobile apps, etc.)
    isAllowed = true;
  } else if (isOriginAllowed(origin)) {
    isAllowed = true;
  } else if (env.server.nodeEnv !== 'production' && 
             (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    isAllowed = true;
  }
  
  if (isAllowed) {
    // Set CORS headers - use specific origin, not '*' when credentials are allowed
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (origin) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from public directory
app.use('/assets', express.static('public/assets'));

// Serve assets-main from frontend public directory
// This allows the frontend to access static assets like coming-soon.png
app.use('/assets-main', express.static(path.join(process.cwd(), '..', 'frontend', 'public', 'assets-main')));

// Versioned API routes (/api/v1) - canonical API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/admin/products', adminProductsRoutes);
app.use('/api/v1/admin/data-integrity', dataIntegrityRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/menus', menusRoutes);
app.use('/api/menus', menusRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/promotions', promotionRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/blog', blogRoutes);
app.use('/api/v1/blog-categories', blogCategoriesRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/images', imagesRoutes);
app.use('/api/v1/testimonials', testimonialsRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/faqs', faqRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/timeslots', timeslotsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/tables', tablesRoutes);
app.use('/api/v1/reservations', reservationsRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/media', mediaRoutes);

// Health check (versioned only)
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.server.nodeEnv,
    version: 'v1',
  });
});

/**
 * @swagger
 * /api/v1/info/dashboard:
 *   get:
 *     summary: Get application dashboard information
 *     description: |
 *       Retrieve basic application statistics and status information.
 *
 *       This endpoint demonstrates a working API that returns dynamic data
 *       and can be used to test UI integration.
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Dashboard information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     appName:
 *                       type: string
 *                       example: "The Saffron Lounge"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     environment:
 *                       type: string
 *                       example: "development"
 *                     uptime:
 *                       type: number
 *                       description: Server uptime in seconds
 *                       example: 3600
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["authentication", "user management", "product catalog"]
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve dashboard information"
 */
// Versioned dashboard info
app.get('/api/v1/info/dashboard', async (req: Request, res: Response) => {
  try {
    // Get basic system information
    const uptime = process.uptime();
    const features = [
      'authentication',
      'user management',
      'product catalog',
      'shopping cart',
      'order management',
      'review system',
      'admin dashboard'
    ];

    // In a real application, you might fetch dynamic stats from database
    const dashboardData = {
      appName: 'The Saffron Lounge',
      version: '1.0.0',
      environment: env.server.nodeEnv,
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      features,
      serverInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      }
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('Dashboard info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard information',
    });
  }
});

// Root route (legacy)
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'E-commerce API is running!',
    version: '1.0.0',
    docs: `/api-docs`,
    health: '/api/v1/health'
  });
});

// Versioned root route
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    message: 'E-commerce API v1 is running!',
    version: '1.0.0',
    docs: '/api/v1/api-docs',
    health: '/api/v1/health'
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Perform startup checks before starting server
async function initializeServer() {
  try {
    // Only run startup checks in production or when explicitly enabled
    const runStartupChecks = env.server.runStartupChecks ||
                            env.server.nodeEnv === 'production' ||
                            process.argv.includes('--startup-checks');

    if (runStartupChecks) {
      console.log('🔍 Running automated startup checks...');
      const checkResult = await startupChecker.performStartupChecks();

      if (!checkResult.overall.success) {
        console.error('❌ Startup checks failed. Server will not start.');
        console.error('Error:', checkResult.overall.message);
        process.exit(1);
      }
    } else {
      console.log('ℹ️ Startup checks skipped. Use RUN_STARTUP_CHECKS=true or --startup-checks to enable.');
    }

    // Start server after successful checks
    startServer(PORT);

  } catch (error: any) {
    console.error('❌ Failed to initialize server:', error.message);
    process.exit(1);
  }
}

// Start server with startup checks
initializeServer();

export default app;