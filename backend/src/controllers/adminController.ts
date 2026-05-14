import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../utils/database';
import { cacheManager, cacheKeys } from '../utils/cache';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/User';
import { UserRole } from '../utils/jwt';
import * as customerService from '../services/customerService';
import { wsManager } from '../utils/websocket';
import { env } from '../config/env';

/**
 * Create a new admin user (Super Admin only)
 * Requires admin token for security
 */
export const createAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, adminToken } = req.body;

    // Validate admin creation token
    const expectedToken = env.optional.adminCreationToken;
    if (adminToken !== expectedToken) {
      res.status(403).json({
        success: false,
        error: 'Invalid admin creation token',
      });
      return;
    }

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Validate password strength for admin accounts
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Admin password must be at least 8 characters long',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      email,
      password: hashedPassword,
      name,
      role: UserRole.ADMIN,
    });

    // Auto-verify admin accounts
    await UserModel.verifyEmail(user.id);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create admin user',
    });
  }
};

/**
 * Get all users with pagination and filtering (Admin only)
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build where clause for filtering
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role && role !== 'all') {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      whereClause += ' AND isActive = ?';
      params.push(status === 'active' ? 1 : 0);
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE 1=1 ${whereClause}
    `;
    const countResult = await dbManager.get(countQuery, params);
    const total = countResult.total;

    // Get paginated results
    const offset = (page - 1) * limit;
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate sortBy to prevent SQL injection
    const allowedSortColumns = ['id', 'email', 'name', 'role', 'isActive', 'emailVerified', 'createdAt', 'updatedAt'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';

    const dataQuery = `
      SELECT id, email, name, role, isActive, emailVerified, createdAt, updatedAt
      FROM users
      WHERE 1=1 ${whereClause}
      ORDER BY ${validSortBy} ${orderDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const users = await dbManager.query(dataQuery, params);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          search,
          role,
          status,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
    });
  }
};

/**
 * Update user status (Admin only)
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
      return;
    }

    const user = await UserModel.update(parseInt(id), { isActive });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
    });
  }
};

/**
 * Get admin dashboard statistics with real-time data and caching
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = cacheKeys.dashboardStats;
    const cachedData = cacheManager.get(cacheKey);

    if (cachedData) {
      res.json({
        success: true,
        data: { ...cachedData, cached: true },
      });
      return;
    }

    // Get real-time statistics using raw SQL queries with optimized queries
    const [
      userStats,
      orderStats,
      inventoryStats,
      bookingStats,
      recentOrders,
      lowStockItems,
      recentUsers
    ] = await Promise.all([
      // User statistics - optimized with single query
      dbManager.get(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN emailVerified = 1 THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admin_count,
          SUM(CASE WHEN role = 'SELLER' THEN 1 ELSE 0 END) as seller_count,
          SUM(CASE WHEN role = 'CUSTOMER' THEN 1 ELSE 0 END) as customer_count
        FROM users
      `),

      // Order statistics - optimized
      dbManager.get(`
        SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(AVG(total), 0) as avg_order_value,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders
        FROM orders
      `),

      // Inventory statistics - optimized
      dbManager.get(`
        SELECT
          SUM(CASE WHEN quantity <= minThreshold THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
          COUNT(*) as total_products
        FROM inventory i
        JOIN products p ON i.productId = p.id
      `),

      // Booking statistics - optimized
      dbManager.get(`
        SELECT
          COUNT(*) as total_bookings,
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_bookings,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_bookings,
          SUM(CASE WHEN bookingType = 'PICKUP' THEN 1 ELSE 0 END) as pickup_bookings,
          SUM(CASE WHEN bookingType = 'DELIVERY' THEN 1 ELSE 0 END) as delivery_bookings
        FROM bookings
      `),

      // Recent orders (last 5) - optimized with LIMIT
      dbManager.query(`
        SELECT o.id, o.total, o.status, o.createdAt,
               u.name as customer_name, u.email as customer_email,
               GROUP_CONCAT(p.name) as product_names
        FROM orders o
        JOIN users u ON o.customerId = u.id
        LEFT JOIN order_items oi ON o.id = oi.orderId
        LEFT JOIN products p ON oi.productId = p.id
        GROUP BY o.id, o.total, o.status, o.createdAt, u.name, u.email
        ORDER BY o.createdAt DESC
        LIMIT 5
      `),

      // Low stock alerts - optimized with index usage
      dbManager.query(`
        SELECT p.name, i.quantity as current_stock, i.minThreshold, i.supplier
        FROM inventory i
        JOIN products p ON i.productId = p.id
        WHERE i.quantity <= i.minThreshold
        ORDER BY i.quantity ASC
        LIMIT 10
      `),

      // Recent user registrations (last 5) - optimized
      dbManager.query(`
        SELECT id, name, email, role, createdAt
        FROM users
        ORDER BY createdAt DESC
        LIMIT 5
      `)
    ]);

    // Get system health metrics
    const systemHealth = {
      databaseStatus: 'healthy',
      lastBackup: new Date().toISOString(), // In production, get from actual backup logs
      activeConnections: Math.floor(Math.random() * 10) + 1, // Mock data
      uptime: process.uptime(),
      cacheStats: cacheManager.getStats()
    };

    const dashboardData = {
      userStats: userStats || {},
      orderStats: orderStats || {},
      inventoryStats: inventoryStats || {},
      bookingStats: bookingStats || {},
      recentOrders: recentOrders || [],
      lowStockItems: lowStockItems || [],
      recentUsers: recentUsers || [],
      systemHealth,
      timestamp: new Date().toISOString()
    };

    // Cache the result for 5 minutes
    cacheManager.set(cacheKey, dashboardData, 300);

    res.json({
      success: true,
      data: { ...dashboardData, cached: false },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard statistics',
    });
  }
};

/**
 * Get real-time analytics data
 */
export const getRealtimeAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const timeframe = req.query.timeframe as string || '30';

    // Get analytics based on timeframe
    const analytics = await dbManager.query(`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as orders,
        SUM(total) as revenue
      FROM orders
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${timeframe} DAY)
        AND status = 'DELIVERED'
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
      LIMIT 30
    `);

    // Get popular products
    const popularProducts = await dbManager.query(`
      SELECT
        p.name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.productId
      JOIN orders o ON oi.orderId = o.id
      WHERE o.createdAt >= DATE_SUB(NOW(), INTERVAL ${timeframe} DAY)
        AND o.status = 'DELIVERED'
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Get customer metrics
    const customerMetrics = await dbManager.get(`
      SELECT
        COUNT(DISTINCT customerId) as active_customers,
        COALESCE(AVG(order_count), 0) as avg_orders_per_customer,
        COALESCE(AVG(order_value), 0) as avg_customer_value
      FROM (
        SELECT
          customerId,
          COUNT(*) as order_count,
          SUM(total) as order_value
        FROM orders
        WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${timeframe} DAY)
          AND status = 'DELIVERED'
        GROUP BY customerId
      ) customer_orders
    `);

    res.json({
      success: true,
      data: {
        timeframe,
        analytics: analytics || [],
        popularProducts: popularProducts || [],
        customerMetrics: customerMetrics || {},
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time analytics'
    });
  }
};

/**
 * Get comprehensive CMS dashboard with real-time data
 */
export const getCMSDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get real-time CMS statistics
    const [
      cmsStats,
      recentBlogs,
      recentTestimonials,
      recentContacts,
      recentEvents,
      systemHealth,
      contentAnalytics
    ] = await Promise.all([
      // CMS Statistics
      dbManager.query(`
        SELECT
          (SELECT COUNT(*) FROM blogs WHERE published_status = 1) as published_blogs,
          (SELECT COUNT(*) FROM blogs WHERE published_status = 0) as draft_blogs,
          (SELECT COUNT(*) FROM testimonials) as total_testimonials,
          (SELECT COUNT(*) FROM services) as total_services,
          (SELECT COUNT(*) FROM faqs) as total_faqs,
          (SELECT COUNT(*) FROM galleries) as total_gallery_items,
          (SELECT COUNT(*) FROM events WHERE date >= CURDATE()) as upcoming_events,
          (SELECT COUNT(*) FROM contacts WHERE status = 'unread') as unread_contacts,
          (SELECT COUNT(*) FROM subscribers WHERE status = 'active') as active_subscribers,
          (SELECT COUNT(*) FROM teams) as team_members
      `),

      // Recent blogs
      dbManager.query(`
        SELECT id, title, published_status, created_at, author_id
        FROM blogs
        ORDER BY created_at DESC
        LIMIT 5
      `),

      // Recent testimonials
      dbManager.query(`
        SELECT id, client_name, rating, created_at
        FROM testimonials
        ORDER BY created_at DESC
        LIMIT 5
      `),

      // Recent contacts
      dbManager.query(`
        SELECT id, name, email, subject, status, created_at
        FROM contacts
        ORDER BY created_at DESC
        LIMIT 5
      `),

      // Upcoming events
      dbManager.query(`
        SELECT id, title, date, location, capacity
        FROM events
        WHERE date >= CURDATE()
        ORDER BY date ASC
        LIMIT 5
      `),

      // System health
      dbManager.get(`SELECT 1 as db_status, NOW() as current_time`),

      // Content analytics
      dbManager.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(CASE WHEN table_name = 'blogs' THEN 1 END) as blogs_created,
          COUNT(CASE WHEN table_name = 'testimonials' THEN 1 END) as testimonials_added,
          COUNT(CASE WHEN table_name = 'contacts' THEN 1 END) as contacts_received
        FROM data_change_log
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 7
      `)
    ]);

    const dashboardData = {
      cms: {
        blogs: {
          published: cmsStats[0]?.published_blogs || 0,
          drafts: cmsStats[0]?.draft_blogs || 0,
          total: (cmsStats[0]?.published_blogs || 0) + (cmsStats[0]?.draft_blogs || 0)
        },
        testimonials: cmsStats[0]?.total_testimonials || 0,
        services: cmsStats[0]?.total_services || 0,
        faqs: cmsStats[0]?.total_faqs || 0,
        gallery: cmsStats[0]?.total_gallery_items || 0,
        events: cmsStats[0]?.upcoming_events || 0,
        contacts: cmsStats[0]?.unread_contacts || 0,
        subscribers: cmsStats[0]?.active_subscribers || 0,
        team: cmsStats[0]?.team_members || 0
      },
      recent: {
        blogs: recentBlogs || [],
        testimonials: recentTestimonials || [],
        contacts: recentContacts || [],
        events: recentEvents || []
      },
      analytics: contentAnalytics || [],
      system: {
        database: {
          status: systemHealth?.db_status === 1 ? 'healthy' : 'unhealthy',
          lastChecked: new Date().toISOString()
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('CMS Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve CMS dashboard data'
    });
  }
};

/**
 * Get system health and performance metrics
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Database connection health
    const dbHealth = await dbManager.get(`SELECT 1 as db_status, NOW() as current_time`);

    // Get active bookings for today
    const todayBookings = await dbManager.get(`
      SELECT COUNT(*) as today_bookings
      FROM bookings
      WHERE DATE(date) = CURDATE()
        AND status IN ('PENDING', 'CONFIRMED')
    `);

    // Get low stock items count
    const lowStockCount = await dbManager.get(`
      SELECT COUNT(*) as low_stock_items
      FROM inventory i
      JOIN products p ON i.productId = p.id
      WHERE i.quantity <= i.minThreshold
    `);

    const healthData = {
      database: {
        status: dbHealth?.db_status === 1 ? 'healthy' : 'unhealthy',
        lastChecked: new Date().toISOString(),
        connectionTime: dbHealth?.current_time
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      business: {
        recentLogs: [], // Would need a logs table
        todayBookings: todayBookings?.today_bookings || 0,
        lowStockItems: lowStockCount?.low_stock_items || 0
      }
    };

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system health data'
    });
  }
};

/**
 * Execute stored procedure for user dashboard
 */
export const getUserDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId || req.user?.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }

    // Get user dashboard data using raw SQL
    const dashboardData = await dbManager.query(`
      SELECT
        u.name, u.email, u.role, u.loyaltyPoints,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_spent,
        MAX(o.createdAt) as last_order_date
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId
      WHERE u.id = ?
      GROUP BY u.id, u.name, u.email, u.role, u.loyaltyPoints
    `, [userId]);

    res.json({
      success: true,
      data: dashboardData[0] || {}
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user dashboard data'
    });
  }
};

/**
 * Confirm booking using stored procedure
 */
export const confirmBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.params;

    if (!bookingId || isNaN(parseInt(bookingId))) {
      res.status(400).json({
        success: false,
        error: 'Valid booking ID is required'
      });
      return;
    }

    // Update booking status
    await dbManager.run(`
      UPDATE bookings
      SET status = 'CONFIRMED', updatedAt = NOW()
      WHERE id = ?
    `, [parseInt(bookingId)]);

    res.json({
      success: true,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    console.error('Booking confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm booking'
    });
  }
};

/**
 * Get admin dashboard data for frontend consumption
 */
export const getAdminDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = 'admin:dashboard:frontend';
    const cachedData = cacheManager.get(cacheKey);

    if (cachedData) {
      res.json({
        success: true,
        data: { ...cachedData, cached: true },
      });
      return;
    }

    // Get comprehensive dashboard data
    const [
      userStats,
      orderStats,
      menuStats,
      categoryStats,
      bookingStats
    ] = await Promise.all([
      // User statistics
      dbManager.get(`
        SELECT
          COUNT(*) as totalUsers,
          SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeUsers,
          SUM(CASE WHEN emailVerified = 1 THEN 1 ELSE 0 END) as verifiedUsers
        FROM users
      `),

      // Order statistics
      dbManager.get(`
        SELECT
          COUNT(*) as totalOrders,
          COALESCE(SUM(total), 0) as totalRevenue,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingOrders
        FROM orders
      `),

      // Menu items count
      dbManager.get(`
        SELECT COUNT(*) as totalMenuItems
        FROM menu_items
        WHERE is_available = 1
      `),

      // Categories count
      dbManager.get(`
        SELECT COUNT(*) as totalCategories
        FROM categories
      `),

      // Booking statistics
      dbManager.get(`
        SELECT
          COUNT(*) as totalBookings,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingBookings
        FROM bookings
      `)
    ]);

    // Calculate growth rates (simplified - in production use time-based calculations)
    const dashboardData = {
      totalUsers: userStats?.totalUsers || 0,
      totalCustomers: userStats?.totalUsers || 0, // Simplified
      totalMenuItems: menuStats?.totalMenuItems || 0,
      totalCategories: categoryStats?.totalCategories || 0,
      totalBookings: bookingStats?.totalBookings || 0,
      totalOrders: orderStats?.totalOrders || 0,
      totalRevenue: orderStats?.totalRevenue || 0,
      activeUsers: userStats?.activeUsers || 0,
      pendingBookings: bookingStats?.pendingBookings || 0,
      pendingOrders: orderStats?.pendingOrders || 0,
      userGrowth: 12.5, // Mock growth rates
      orderGrowth: 8.3,
      revenueGrowth: 15.7,
      bookingGrowth: 5.2,
      recentActivity: [
        {
          id: '1',
          type: 'order',
          message: 'New order placed',
          time: '2 minutes ago',
          status: 'success'
        },
        {
          id: '2',
          type: 'user',
          message: 'New user registered',
          time: '5 minutes ago',
          status: 'success'
        }
      ]
    };

    // Cache for 2 minutes
    cacheManager.set(cacheKey, dashboardData, 120);

    res.json({
      success: true,
      data: { ...dashboardData, cached: false },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin dashboard data',
    });
  }
};
/*
*
 * Get all customers with order statistics (Admin only)
 * Includes order count and total quantity purchased
 */
export const getAllCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const orderBehavior = req.query.orderBehavior as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    console.log('[GET CUSTOMERS] Request params:', { page, limit, search, role, status, orderBehavior, sortBy, sortOrder });

    // Build where clause for filtering
    let whereClause = 'WHERE u.role = "CUSTOMER"';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== 'all') {
      whereClause += ' AND u.isActive = ?';
      params.push(status === 'active' ? 1 : 0);
    }

    // Build HAVING clause for order behavior filters
    let havingClause = '';
    let orderByClause = '';

    if (orderBehavior === 'frequent') {
      // Most frequent customers (5+ orders)
      havingClause = 'HAVING orderCount >= 5';
      orderByClause = 'ORDER BY orderCount DESC, u.createdAt DESC';
    } else if (orderBehavior === 'recent') {
      // Recent buyers (orders in last 30 days)
      havingClause = 'HAVING lastOrderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      orderByClause = 'ORDER BY lastOrderDate DESC';
    } else if (orderBehavior === 'inactive') {
      // Customers with no orders
      havingClause = 'HAVING orderCount = 0';
      orderByClause = 'ORDER BY u.createdAt DESC';
    } else {
      // Default sorting
      const validSortColumns = ['name', 'email', 'orderCount', 'totalQuantity', 'createdAt'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
      const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      
      if (sortColumn === 'orderCount' || sortColumn === 'totalQuantity') {
        orderByClause = `ORDER BY ${sortColumn} ${sortDirection}, u.createdAt DESC`;
      } else {
        orderByClause = `ORDER BY u.${sortColumn} ${sortDirection}`;
      }
    }

    // Main query with order statistics
    const dataQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.isActive,
        u.emailVerified,
        u.createdAt,
        u.updatedAt,
        COUNT(DISTINCT o.id) as orderCount,
        CAST(COALESCE(SUM(oi.quantity), 0) AS UNSIGNED) as totalQuantity,
        MAX(o.createdAt) as lastOrderDate
      FROM users u
      LEFT JOIN orders o ON u.id = o.customerId
      LEFT JOIN order_items oi ON o.id = oi.orderId
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.role, u.isActive, u.emailVerified, u.createdAt, u.updatedAt
      ${havingClause}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const offset = (page - 1) * limit;
    const customers = await dbManager.query(dataQuery, [...params, limit, offset]);

    console.log(`[GET CUSTOMERS] Found ${customers.length} customers`);

    // Get total count with same filters
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT 
          u.id,
          COUNT(DISTINCT o.id) as orderCount,
          MAX(o.createdAt) as lastOrderDate
        FROM users u
        LEFT JOIN orders o ON u.id = o.customerId
        ${whereClause}
        GROUP BY u.id
        ${havingClause}
      ) as filtered_customers
    `;

    const countResult = await dbManager.get(countQuery, params);
    const total = countResult.total;

    console.log(`[GET CUSTOMERS] Total customers: ${total}`);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          search,
          role,
          status,
          orderBehavior,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    console.error('[GET CUSTOMERS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers',
    });
  }
};


/**
 * Create a new user with role selection (Admin only)
 * Allows creating Admin or Customer accounts from Admin Panel
 */
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
      return;
    }

    // Validate role (Admin can create ADMIN or CUSTOMER, no SELLER)
    const validRoles = ['ADMIN', 'CUSTOMER'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role. Must be ADMIN or CUSTOMER',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Validate password strength
    const minPasswordLength = role === 'ADMIN' ? 8 : 6;
    if (password.length < minPasswordLength) {
      res.status(400).json({
        success: false,
        error: `Password must be at least ${minPasswordLength} characters long`,
      });
      return;
    }

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    // Create user with specified role
    const userRole = role === 'ADMIN' ? UserRole.ADMIN : UserRole.CUSTOMER;
    const user = await UserModel.create({
      email,
      password, // UserModel.create will hash it
      name,
      role: userRole,
      emailVerified: true, // Admin-created users are pre-verified
      isActive: true,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as any;

    res.status(201).json({
      success: true,
      message: `${role} user created successfully`,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error: any) {
    console.error('Admin user creation error:', error);
    
    if (error.message && error.message.includes('Duplicate entry')) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
};

/**
 * Get all customers with order statistics (Admin only)
 * Enhanced version using customerService
 */
export const getCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const orderBehavior = req.query.orderBehavior as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    console.log('[GET CUSTOMERS] Request params:', { page, limit, search, status, orderBehavior, sortBy, sortOrder });

    const result = await customerService.getAllCustomers(page, limit, {
      search,
      status,
      orderBehavior,
      sortBy,
      sortOrder,
    });

    console.log(`[GET CUSTOMERS] Found ${result.customers.length} customers`);

    res.json({
      success: true,
      data: {
        customers: result.customers,
        pagination: result.pagination,
        filters: {
          search,
          status,
          orderBehavior,
          sortBy,
          sortOrder,
        },
      },
    });
  } catch (error) {
    console.error('[GET CUSTOMERS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers',
    });
  }
};

/**
 * Get customer by ID with orders and reservations (Admin only)
 */
export const getCustomerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = parseInt(req.params.id as string);

    if (!customerId || isNaN(customerId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid customer ID',
      });
      return;
    }

    const customer = await customerService.getCustomerById(customerId);

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error: any) {
    console.error('[GET CUSTOMER BY ID] Error:', error);
    
    if (error.message === 'Customer not found') {
      res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer',
    });
  }
};

/**
 * Update customer details (Admin only)
 */
export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = parseInt(req.params.id as string);

    if (!customerId || isNaN(customerId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid customer ID',
      });
      return;
    }

    const { name, phone, address, emailVerified } = req.body;

    const customer = await customerService.updateCustomer(customerId, {
      name,
      phone,
      address,
      emailVerified,
    });

    // Broadcast customer update via WebSocket
    wsManager.broadcastToRoom('customers', 'CUSTOMER_UPDATED', {
      customerId: customer.id,
      customer,
      timestamp: new Date().toISOString(),
    });

    // Also invalidate cache
    cacheManager.del('customers:list');

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer },
    });
  } catch (error: any) {
    console.error('[UPDATE CUSTOMER] Error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update customer',
    });
  }
};

/**
 * Update customer status (activate/deactivate) (Admin only)
 */
export const updateCustomerStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customerId = parseInt(req.params.id as string);

    if (!customerId || isNaN(customerId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid customer ID',
      });
      return;
    }

    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'isActive must be a boolean',
      });
      return;
    }

    const customer = await customerService.updateCustomerStatus(customerId, isActive);

    // Broadcast customer status update via WebSocket
    wsManager.broadcastToRoom('customers', 'CUSTOMER_STATUS_UPDATED', {
      customerId: customer.id,
      isActive: customer.isActive,
      timestamp: new Date().toISOString(),
    });

    // Also invalidate cache
    cacheManager.del('customers:list');

    res.json({
      success: true,
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { customer },
    });
  } catch (error: any) {
    console.error('[UPDATE CUSTOMER STATUS] Error:', error);

    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update customer status',
    });
  }
};
