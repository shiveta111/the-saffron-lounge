import * as winston from 'winston';
import axios, { AxiosResponse } from 'axios';
import { execFileSync, execSync } from 'child_process';
import prisma from '../config/prisma';
import { env } from '../config/env';

// Configure logger for startup checks
const startupLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [STARTUP-${level.toUpperCase()}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
      }`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/startup-checks.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

// Essential tables list
const ESSENTIAL_TABLES = [
  'users',
  'categories',
  'menus',
  'products',
  'orders',
  'order_items',
  'payments',
  'timeslots',
  'bookings',
  'booking_payments',
  'promotions',
  'notifications',
  'blogs',
  'teams',
  'testimonials',
  'contacts',
  'services',
  'subscribers',
  'faqs',
  'events',
  'event_attendees',
  'data_change_log',
  'system_logs'
];

// API endpoints to test
const API_ENDPOINTS = [
  // Authentication
  { method: 'GET', path: '/api/health', description: 'Health Check', requiresAuth: false },

  // Public endpoints
  { method: 'GET', path: '/menu', description: 'Get Menu Items', requiresAuth: false },
  { method: 'GET', path: '/categories', description: 'Get Categories', requiresAuth: false },
  { method: 'GET', path: '/api/team', description: 'Get Team Members', requiresAuth: false },
  { method: 'GET', path: '/api/testimonials', description: 'Get Testimonials', requiresAuth: false },
  { method: 'GET', path: '/api/services', description: 'Get Services', requiresAuth: false },
  { method: 'GET', path: '/api/faq', description: 'Get FAQs', requiresAuth: false },

  // Protected endpoints (will test with mock auth if available)
  { method: 'GET', path: '/api/users', description: 'Get Users', requiresAuth: true },
  { method: 'GET', path: '/api/orders', description: 'Get Orders', requiresAuth: true },
  { method: 'GET', path: '/api/bookings', description: 'Get Bookings', requiresAuth: true },
  { method: 'GET', path: '/api/blog', description: 'Get Blog Posts', requiresAuth: false },
];

interface StartupCheckResult {
  database: {
    connection: boolean;
    tables: {
      total: number;
      existing: string[];
      missing: string[];
      created: string[];
    };
  };
  api: {
    total: number;
    working: Array<{ endpoint: string; method: string; status: number; responseTime: number }>;
    failed: Array<{ endpoint: string; method: string; error: string; status?: number }>;
  };
  overall: {
    success: boolean;
    message: string;
    duration: number;
  };
}

class StartupChecker {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(port: number = 8000) {
    this.baseUrl = env.urls.api;
  }

  /**
   * Main startup check function
   */
  async performStartupChecks(): Promise<StartupCheckResult> {
    const startTime = Date.now();
    const result: StartupCheckResult = {
      database: {
        connection: false,
        tables: {
          total: ESSENTIAL_TABLES.length,
          existing: [],
          missing: [],
          created: []
        }
      },
      api: {
        total: API_ENDPOINTS.length,
        working: [],
        failed: []
      },
      overall: {
        success: false,
        message: '',
        duration: 0
      }
    };

    startupLogger.info('🚀 Starting automated startup checks...');

    try {
      // 1. Database Connection Check
      startupLogger.info('🔍 Checking database connection...');
      result.database.connection = await this.checkDatabaseConnection();

      if (!result.database.connection) {
        throw new Error('Database connection failed');
      }

      // 2. Table Existence Check
      startupLogger.info('📋 Checking table existence...');
      const tableCheck = await this.checkTableExistence();
      result.database.tables.existing = tableCheck.existing;
      result.database.tables.missing = tableCheck.missing;

      // 3. Automated Table Creation
      if (tableCheck.missing.length > 0) {
        startupLogger.info(`🔧 Creating ${tableCheck.missing.length} missing tables...`);
        const createdTables = await this.createMissingTables(tableCheck.missing);
        result.database.tables.created = createdTables;
        
        // Re-check table existence after creation
        const updatedTableCheck = await this.checkTableExistence();
        result.database.tables.existing = updatedTableCheck.existing;
        result.database.tables.missing = updatedTableCheck.missing;
      }

      // 4. Check if database needs seeding (DO NOT force reseed - preserve existing data)
      startupLogger.info('🔍 Checking if database needs initial seeding...');
      await this.checkAndSeedIfEmpty();

      // 5. API Endpoint Validation (Skipped during startup)
      startupLogger.info('🔗 Skipping API endpoint tests during startup phase');
      result.api.working = [];
      result.api.failed = [];

      // 6. Overall Status
      // Allow startup even if some audit tables are missing (they're optional)
      const criticalTablesMissing = result.database.tables.missing.filter(
        table => !['data_change_log', 'system_logs'].includes(table)
      );

      result.overall.success = result.database.connection &&
                              criticalTablesMissing.length === 0;

      result.overall.duration = Date.now() - startTime;

      if (result.overall.success) {
        result.overall.message = '✅ All startup checks passed successfully!';
        startupLogger.info('✅ All startup checks completed successfully!');
      } else {
        result.overall.message = '⚠️ Some startup checks failed. Check logs for details.';
        startupLogger.warn('⚠️ Some startup checks failed');
      }

      this.displaySummary(result);

    } catch (error: any) {
      result.overall.success = false;
      result.overall.message = `❌ Startup checks failed: ${error.message}`;
      result.overall.duration = Date.now() - startTime;
      startupLogger.error('❌ Startup checks failed', { error: error.message });
    }

    return result;
  }

  /**
   * Check database connection
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await (prisma as any).$queryRaw`SELECT 1`;
      startupLogger.info('✅ Database connection successful');
      return true;
    } catch (error: any) {
      startupLogger.error('❌ Database connection failed', { error: error.message });
      return false;
    }
  }

  /**
   * Check if essential tables exist
   */
  private async checkTableExistence(): Promise<{ existing: string[]; missing: string[] }> {
    const existing: string[] = [];
    const missing: string[] = [];

    try {
      // Get all tables from database using proper Prisma syntax
      const tables = await (prisma as any).$queryRaw`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `;

      const existingTableNames = tables.map((table: any) => table.TABLE_NAME);

      for (const table of ESSENTIAL_TABLES) {
        if (existingTableNames.includes(table)) {
          existing.push(table);
        } else {
          missing.push(table);
        }
      }

      startupLogger.info(`📊 Table check complete: ${existing.length} existing, ${missing.length} missing`);

      if (missing.length > 0) {
        startupLogger.warn('Missing tables:', { missing });
      }

    } catch (error: any) {
      startupLogger.error('Failed to check table existence', { error: error.message });
      // Assume all tables are missing if we can't check
      missing.push(...ESSENTIAL_TABLES);
    }

    return { existing, missing };
  }

  /**
   * Create missing tables using SQL scripts
   */
  private async createMissingTables(missingTables: string[]): Promise<string[]> {
    const created: string[] = [];

    try {
      // Use Prisma migration instead of raw SQL execution
      startupLogger.info('Running Prisma database push to create tables...');

      // SECURITY FIX: Use child_process with safe command execution
      const { execFileSync } = require('child_process');

      try {
        // CRITICAL: Use db push WITHOUT --force-reset to preserve existing data
        // Using execFileSync instead of execSync to prevent command injection
        execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
          stdio: 'inherit',
          cwd: process.cwd(),
          shell: false // Disable shell to prevent injection
        });

        startupLogger.info('✅ Database schema pushed successfully (data preserved)');

        // Verify tables were created
        const tables = await (prisma as any).$queryRaw`
          SELECT TABLE_NAME
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
        `;

        const existingTableNames = tables.map((table: any) => table.TABLE_NAME);

        for (const table of missingTables) {
          if (existingTableNames.includes(table)) {
            created.push(table);
            startupLogger.info(`✅ Created table: ${table}`);
          }
        }

      } catch (execError: any) {
        startupLogger.error('Failed to run prisma db push', { error: execError.message });

        // Fallback: Try to run migration
        try {
          startupLogger.info('Attempting fallback with prisma migrate deploy...');
          execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
            cwd: process.cwd()
          });
          startupLogger.info('✅ Migration deployed successfully');
        } catch (migrateError: any) {
          startupLogger.error('Migration fallback also failed', { error: migrateError.message });
          throw new Error('Both prisma db push and migrate deploy failed');
        }
      }

    } catch (error: any) {
      startupLogger.error('Failed to create missing tables', { error: error.message });
    }

    return created;
  }

  /**
   * Check if database is empty and seed ONLY if needed
   * CRITICAL: This function NEVER deletes existing data
   */
  private async checkAndSeedIfEmpty(): Promise<void> {
    try {
      // Check if database has any users
      const userCount = await (prisma as any).user.count();
      
      if (userCount > 0) {
        startupLogger.info(`✅ Database already has ${userCount} users - skipping seeding to preserve existing data`);
        return;
      }

      startupLogger.info('📊 Database is empty - performing initial seeding...');

      // Create admin user
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Admin123!', 12);

      await (prisma as any).user.create({
        data: {
          email: 'lovely.webdev@gmail.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          emailVerified: true,
          isActive: true,
          phone: '+91-9876543210',
          address: '123 Admin Street, Bangalore, Karnataka 560001',
          loyaltyPoints: 0
        }
      });

      startupLogger.info('✅ Admin user created: lovely.webdev@gmail.com');

      // Seed categories
      const categories = [
        { name: 'Appetizers', description: 'Light and flavorful starters', isActive: true, sortOrder: 1 },
        { name: 'Main Course', description: 'Hearty main dishes', isActive: true, sortOrder: 2 },
        { name: 'Vegetarian', description: 'Vegetarian specialties', isActive: true, sortOrder: 3 },
        { name: 'Desserts', description: 'Sweet endings', isActive: true, sortOrder: 4 },
        { name: 'Beverages', description: 'Refreshing drinks', isActive: true, sortOrder: 5 }
      ];

      for (const category of categories) {
        await (prisma as any).category.create({ data: category });
      }
      startupLogger.info(`✅ Created ${categories.length} categories`);

      // Seed menu items
      const menuItems = [
        { name: 'Grilled Salmon', description: 'Fresh Atlantic salmon grilled to perfection with herbs', price: 450.00, category: 'Main Course', isAvailable: true },
        { name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken and spices', price: 280.00, category: 'Main Course', isAvailable: true },
        { name: 'Paneer Tikka Masala', description: 'Cottage cheese in rich, creamy tomato curry', price: 240.00, category: 'Vegetarian', isAvailable: true },
        { name: 'Masala Dosa', description: 'Crispy crepe filled with spiced potato filling', price: 120.00, category: 'Appetizers', isAvailable: true },
        { name: 'Ras Malai', description: 'Soft cheese dumplings in sweetened cardamom syrup', price: 80.00, category: 'Desserts', isAvailable: true }
      ];

      for (const item of menuItems) {
        await (prisma as any).product.create({ data: item });
      }
      startupLogger.info(`✅ Created ${menuItems.length} menu items`);

      // Seed testimonials
      const testimonials = [
        { client_name: 'Rahul Sharma', designation: 'Software Engineer', feedback: 'Exceptional dining experience! The food was authentic and the service was impeccable. Will definitely visit again.', rating: 5, company: 'TechCorp' },
        { client_name: 'Priya Patel', designation: 'Marketing Manager', feedback: 'The Saffron Lounge offers the best Indian cuisine in Bangalore. The ambiance is perfect for both family dinners and business meetings.', rating: 5, company: 'BrandSolutions' },
        { client_name: 'Amit Kumar', designation: 'Business Owner', feedback: 'Outstanding quality and authentic flavors. The chef\'s special thali was a culinary masterpiece!', rating: 4, company: 'RetailPlus' }
      ];

      for (const testimonial of testimonials) {
        await (prisma as any).testimonial.create({ data: testimonial });
      }
      startupLogger.info(`✅ Created ${testimonials.length} testimonials`);

      // Seed team members
      const teamMembers = [
        { name: 'Rajesh Kumar', role: 'Executive Chef', bio: '20+ years of culinary excellence in authentic Indian cuisine', email: 'chef@saffronlounge.com', phone: '+91-9876543211' },
        { name: 'Priya Sharma', role: 'Restaurant Manager', bio: 'Ensuring exceptional service and customer satisfaction', email: 'manager@saffronlounge.com', phone: '+91-9876543212' },
        { name: 'Amit Singh', role: 'Head Waiter', bio: 'Dedicated to providing outstanding dining experiences', email: 'waiter@saffronlounge.com', phone: '+91-9876543213' }
      ];

      for (const member of teamMembers) {
        await (prisma as any).team.create({ data: member });
      }
      startupLogger.info(`✅ Created ${teamMembers.length} team members`);

      // Seed FAQs
      const faqs = [
        { question: 'What are your opening hours?', answer: 'We are open from 11 AM to 11 PM daily, including weekends and holidays.', category: 'General', tags: 'hours,timing,open' },
        { question: 'Do you accept reservations?', answer: 'Yes, we accept reservations for parties of 6 or more. Walk-ins are also welcome for smaller groups.', category: 'Reservations', tags: 'booking,reservation,party' },
        { question: 'Do you have vegetarian options?', answer: 'Yes, we have an extensive vegetarian menu with authentic Indian vegetarian dishes.', category: 'Menu', tags: 'vegetarian,veg,dietary' },
        { question: 'Do you offer home delivery?', answer: 'Yes, we provide home delivery services within a 10km radius. Minimum order value applies.', category: 'Delivery', tags: 'delivery,home,takeout' },
        { question: 'Are there parking facilities available?', answer: 'Yes, we have dedicated parking spaces for our customers. Valet parking is also available.', category: 'Facilities', tags: 'parking,valet,transport' }
      ];

      for (const faq of faqs) {
        await (prisma as any).fAQ.create({ data: faq });
      }
      startupLogger.info(`✅ Created ${faqs.length} FAQs`);

      // Seed Services
      const services = [
        { title: 'Catering Services', description: 'Professional catering for all occasions - weddings, corporate events, parties', icon: 'utensils', features: 'Custom menus,Professional staff,Equipment rental,Setup and cleanup', price: 5000.00, category: 'Catering' },
        { title: 'Private Dining', description: 'Exclusive private dining experience for intimate gatherings', icon: 'users', features: 'Private room,Customized menu,Dedicated service,Special ambiance', price: 3000.00, category: 'Dining' },
        { title: 'Cooking Classes', description: 'Learn authentic Indian cooking from our expert chefs', icon: 'chef-hat', features: 'Hands-on training,Recipe booklet,Certificate,Tasting session', price: 1500.00, category: 'Education' }
      ];

      for (const service of services) {
        await (prisma as any).service.create({ data: service });
      }
      startupLogger.info(`✅ Created ${services.length} services`);

      // Seed Subscribers
      const subscribers = [
        { email: 'subscriber1@example.com', status: 'active' },
        { email: 'subscriber2@example.com', status: 'active' },
        { email: 'subscriber3@example.com', status: 'active' }
      ];

      for (const subscriber of subscribers) {
        await (prisma as any).subscriber.create({ data: subscriber });
      }
      startupLogger.info(`✅ Created ${subscribers.length} subscribers`);

      // Seed Events
      const events = [
        { title: 'Wine Tasting Evening', description: 'Exclusive wine tasting event with sommelier', date: new Date('2025-12-15'), location: 'Saffron Lounge Main Hall', capacity: 50, tags: 'wine,tasting,exclusive' },
        { title: 'Indian Cooking Workshop', description: 'Learn to cook authentic Indian dishes', date: new Date('2025-12-20'), location: 'Saffron Lounge Kitchen', capacity: 20, tags: 'cooking,workshop,learning' },
        { title: 'New Year Celebration', description: 'Ring in the new year with special menu and live music', date: new Date('2025-12-31'), location: 'Saffron Lounge', capacity: 200, tags: 'celebration,newyear,party' }
      ];

      for (const event of events) {
        await (prisma as any).event.create({ data: event });
      }
      startupLogger.info(`✅ Created ${events.length} events`);

      // Seed Contacts (sample inquiries)
      const contacts = [
        { name: 'John Doe', email: 'john@example.com', subject: 'Catering Inquiry', message: 'I would like to inquire about catering services for a corporate event.', status: 'unread' },
        { name: 'Jane Smith', email: 'jane@example.com', subject: 'Reservation Question', message: 'Can I make a reservation for 10 people this weekend?', status: 'unread' }
      ];

      for (const contact of contacts) {
        await (prisma as any).contact.create({ data: contact });
      }
      startupLogger.info(`✅ Created ${contacts.length} contact inquiries`);

      // Seed Blogs
      const blogs = [
        { 
          title: 'The Art of Indian Spices', 
          slug: 'art-of-indian-spices',
          content: 'Discover the rich history and flavors of Indian spices. From turmeric to cardamom, learn how these aromatic ingredients transform ordinary dishes into extraordinary culinary experiences...',
          featured_image: '/images/blog/spices.jpg',
          tags: 'spices,cooking,indian-cuisine',
          published_status: true,
          meta_title: 'The Art of Indian Spices - Saffron Lounge Blog',
          meta_description: 'Explore the world of Indian spices and their culinary significance'
        },
        { 
          title: 'Traditional vs Modern Indian Cuisine', 
          slug: 'traditional-vs-modern-indian-cuisine',
          content: 'Exploring the evolution of Indian cuisine from traditional recipes passed down through generations to modern fusion interpretations...',
          featured_image: '/images/blog/cuisine.jpg',
          tags: 'cuisine,tradition,modern',
          published_status: true,
          meta_title: 'Traditional vs Modern Indian Cuisine',
          meta_description: 'A journey through the evolution of Indian cooking'
        }
      ];

      for (const blog of blogs) {
        await (prisma as any).blog.create({ data: blog });
      }
      startupLogger.info(`✅ Created ${blogs.length} blog posts`);

      // Seed Tables for dine-in
      const tables = [
        { tableNumber: 'T1', capacity: 2, location: 'Window Side', isActive: true },
        { tableNumber: 'T2', capacity: 4, location: 'Main Hall', isActive: true },
        { tableNumber: 'T3', capacity: 4, location: 'Main Hall', isActive: true },
        { tableNumber: 'T4', capacity: 6, location: 'Private Section', isActive: true },
        { tableNumber: 'T5', capacity: 8, location: 'Private Section', isActive: true }
      ];

      for (const table of tables) {
        await (prisma as any).table.create({ data: table });
      }
      startupLogger.info(`✅ Created ${tables.length} tables`);

      // Seed Delivery Zones
      const deliveryZones = [
        { name: 'Central Bangalore', postcodes: '560001,560002,560003,560004,560005', deliveryFee: 50.00, minOrderValue: 300.00, estimatedTime: 30, isActive: true },
        { name: 'North Bangalore', postcodes: '560010,560011,560012,560013', deliveryFee: 75.00, minOrderValue: 400.00, estimatedTime: 45, isActive: true },
        { name: 'South Bangalore', postcodes: '560030,560034,560035,560036', deliveryFee: 75.00, minOrderValue: 400.00, estimatedTime: 45, isActive: true },
        { name: 'East Bangalore', postcodes: '560037,560038,560066,560067', deliveryFee: 100.00, minOrderValue: 500.00, estimatedTime: 60, isActive: true }
      ];

      for (const zone of deliveryZones) {
        await (prisma as any).deliveryZone.create({ data: zone });
      }
      startupLogger.info(`✅ Created ${deliveryZones.length} delivery zones`);

      // Seed Promotions
      const promotions = [
        { code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, validFrom: new Date(), validTo: new Date('2025-12-31'), usageLimit: 1000, minOrderValue: 500.00, firstOrderOnly: true, description: 'Welcome offer for new customers', isActive: true },
        { code: 'FLAT100', discountType: 'FIXED', discountValue: 100, validFrom: new Date(), validTo: new Date('2025-12-31'), usageLimit: 500, minOrderValue: 1000.00, description: 'Flat ₹100 off on orders above ₹1000', isActive: true },
        { code: 'WEEKEND20', discountType: 'PERCENTAGE', discountValue: 20, validFrom: new Date(), validTo: new Date('2025-12-31'), minOrderValue: 800.00, description: 'Weekend special - 20% off', isActive: true }
      ];

      for (const promo of promotions) {
        await (prisma as any).promotion.create({ data: promo });
      }
      startupLogger.info(`✅ Created ${promotions.length} promotions`);

      // Seed Timeslots for next 7 days
      const today = new Date();
      const timeSlots = ['11:00', '12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];
      let timeslotCount = 0;

      for (let day = 0; day < 7; day++) {
        const slotDate = new Date(today);
        slotDate.setDate(today.getDate() + day);

        for (let i = 0; i < timeSlots.length - 1; i++) {
          await (prisma as any).timeslot.create({
            data: {
              date: slotDate,
              startTime: timeSlots[i],
              endTime: timeSlots[i + 1],
              capacity: 10,
              bookedCount: 0,
              status: 'AVAILABLE'
            }
          });
          timeslotCount++;
        }
      }
      startupLogger.info(`✅ Created ${timeslotCount} timeslots for next 7 days`);

      startupLogger.info('✅ Initial database seeding completed successfully');

    } catch (error: any) {
      startupLogger.error('Failed to seed database', { error: error.message });
      // Don't fail startup for seeding errors
    }
  }

  /**
   * Test API endpoints
   */
  private async testApiEndpoints(): Promise<{
    working: Array<{ endpoint: string; method: string; status: number; responseTime: number }>;
    failed: Array<{ endpoint: string; method: string; error: string; status?: number }>;
  }> {
    const working: Array<{ endpoint: string; method: string; status: number; responseTime: number }> = [];
    const failed: Array<{ endpoint: string; method: string; error: string; status?: number }> = [];

    startupLogger.info('⏭️ Skipping API endpoint tests during startup - server not yet running');
    startupLogger.info('💡 API tests will be available after server starts successfully');

    // Return empty results - API testing should happen after server is running
    return { working, failed };
  }

  /**
   * Display comprehensive summary
   */
  private displaySummary(result: StartupCheckResult): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 SAFFRON LOUNGE BACKEND - STARTUP CHECK SUMMARY');
    console.log('='.repeat(80));

    // Database Status
    console.log('\n📊 DATABASE STATUS:');
    console.log(`   Connection: ${result.database.connection ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Tables: ${result.database.tables.existing.length}/${result.database.tables.total} existing`);

    if (result.database.tables.created.length > 0) {
      console.log(`   Created: ${result.database.tables.created.length} tables`);
      result.database.tables.created.forEach(table => {
        console.log(`     ✅ ${table}`);
      });
    }

    if (result.database.tables.missing.length > 0) {
      const criticalMissing = result.database.tables.missing.filter(
        table => !['data_change_log', 'system_logs'].includes(table)
      );
      const optionalMissing = result.database.tables.missing.filter(
        table => ['data_change_log', 'system_logs'].includes(table)
      );

      if (criticalMissing.length > 0) {
        console.log(`   Missing (Critical): ${criticalMissing.length} tables`);
        criticalMissing.forEach(table => {
          console.log(`     ❌ ${table}`);
        });
      }

      if (optionalMissing.length > 0) {
        console.log(`   Missing (Optional): ${optionalMissing.length} tables (audit/logging)`);
        optionalMissing.forEach(table => {
          console.log(`     ⚠️ ${table}`);
        });
      }
    }

    // API Status
    console.log('\n🔗 API ENDPOINTS STATUS:');
    console.log(`   Status: ⏭️ Skipped during startup (server not running)`);
    console.log(`   Note: API tests available after server starts successfully`);

    // Overall Status
    console.log('\n🎯 OVERALL STATUS:');
    console.log(`   Success: ${result.overall.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Duration: ${result.overall.duration}ms`);
    console.log(`   Message: ${result.overall.message}`);

    console.log('\n' + '='.repeat(80));

    if (result.overall.success) {
      console.log('🚀 Backend is ready and fully operational!');
    } else {
      console.log('⚠️ Backend has issues that need attention. Check logs for details.');
    }

    console.log('='.repeat(80) + '\n');
  }
}

// Export singleton instance
export const startupChecker = new StartupChecker();
export default startupChecker;