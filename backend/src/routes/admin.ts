import express, { Router } from 'express';
import { authenticate, requireAdmin, requireSeller } from '../middleware/auth';
import prisma from '../config/prisma';
import {
  createAdmin,
  createUser,
  getAllUsers,
  updateUserStatus,
  getDashboardStats,
  getRealtimeAnalytics,
  getSystemHealth,
  getUserDashboard,
  getAdminDashboard,
  getAllCustomers,
  getCustomers,
  getCustomerById,
  updateCustomer,
  updateCustomerStatus
} from '../controllers/adminController';
import dataIntegrityRoutes from './data-integrity';

// Import all CMS controllers for admin management
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} from '../controllers/blogController';

import {
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
} from '../controllers/testimonialsController';

const router: Router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: |
 *       Retrieve a list of all users in the system.
 *
 *       **Access Control:** Admin only
 *
 *       Use admin credentials: `admin@test.com` / `admin123`
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users', authenticate, requireAdmin, getAllUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user with role selection (Admin or Customer)
 * @access  Admin only
 */
router.post('/users', authenticate, requireAdmin, createUser);

/**
 * @swagger
 * /admin/customers:
 *   get:
 *     summary: Get all customers with order statistics (Admin only)
 *     description: |
 *       Retrieve a list of all customers with their order history statistics.
 *       Includes order count and total quantity purchased.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of customers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, inactive]
 *         description: Filter by account status
 *       - in: query
 *         name: orderBehavior
 *         schema:
 *           type: string
 *           enum: [all, frequent, recent, inactive]
 *         description: Filter by order behavior
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, orderCount, totalQuantity, createdAt]
 *         description: Sort by column
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/customers', authenticate, requireAdmin, getCustomers);

/**
 * @swagger
 * /admin/customers/{id}:
 *   get:
 *     summary: Get customer by ID with orders and reservations (Admin only)
 *     description: |
 *       Retrieve detailed customer information including order history and reservations.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/customers/:id', authenticate, requireAdmin, getCustomerById);

/**
 * @swagger
 * /admin/customers/{id}:
 *   put:
 *     summary: Update customer details (Admin only)
 *     description: |
 *       Update customer information such as name, phone, address, and email verification status.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *               emailVerified:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.put('/customers/:id', authenticate, requireAdmin, updateCustomer);

/**
 * @swagger
 * /admin/customers/{id}/status:
 *   patch:
 *     summary: Update customer status (activate/deactivate) (Admin only)
 *     description: |
 *       Activate or deactivate a customer account.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Whether the customer account should be active
 *                 example: true
 *     responses:
 *       200:
 *         description: Customer status updated successfully
 *       404:
 *         description: Customer not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.patch('/customers/:id/status', authenticate, requireAdmin, updateCustomerStatus);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     description: |
 *       Activate or deactivate a user account.
 *
 *       **Access Control:** Admin only
 *
 *       Use admin credentials: `admin@test.com` / `admin123`
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: Whether the user account should be active
 *                 example: true
 *     responses:
 *       200:
 *         description: User status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/status', authenticate, requireAdmin, updateUserStatus);

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     description: |
 *       Retrieve system statistics and metrics.
 *
 *       **Access Control:** Admin only
 *
 *       Use admin credentials: `admin@test.com` / `admin123`
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                     activeUsers:
 *                       type: integer
 *                       example: 142
 *                     totalAdmins:
 *                       type: integer
 *                       example: 3
 *                     totalSellers:
 *                       type: integer
 *                       example: 12
 *                     totalCustomers:
 *                       type: integer
 *                       example: 135
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard', authenticate, requireAdmin, getDashboardStats);

/**
 * @swagger
 * /admin/analytics:
 *   get:
 *     summary: Get real-time analytics data (Admin only)
 *     description: |
 *       Retrieve real-time analytics and business intelligence data.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get('/analytics', authenticate, requireAdmin, getRealtimeAnalytics);

/**
 * @swagger
 * /admin/system/health:
 *   get:
 *     summary: Get system health and performance metrics (Admin only)
 *     description: |
 *       Retrieve comprehensive system health metrics and performance data.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health data retrieved successfully
 */
router.get('/system/health', authenticate, requireAdmin, getSystemHealth);

/**
 * @swagger
 * /admin/users/{userId}/dashboard:
 *   get:
 *     summary: Get user dashboard data using stored procedure (Admin only)
 *     description: |
 *       Retrieve comprehensive user dashboard data using MySQL stored procedures.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User dashboard data retrieved successfully
 */
router.get('/users/:userId/dashboard', authenticate, requireAdmin, getUserDashboard);

/**
 * @swagger
 * /admin/bookings/{bookingId}/confirm:
 *   post:
 *     summary: Confirm booking using stored procedure (Admin only)
 *     description: |
 *       Confirm a booking and update related data using MySQL stored procedures.
 *
 *       **Access Control:** Admin only
 *     tags: [Admin - Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Booking ID to confirm
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
 */

// ===== BLOG MANAGEMENT =====
/**
 * @swagger
 * /admin/blogs:
 *   get:
 *     summary: Get all blogs (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Blogs retrieved successfully
 */
router.get('/blogs', authenticate, requireAdmin, getAllBlogs);

/**
 * @swagger
 * /admin/blogs/{id}:
 *   get:
 *     summary: Get blog by ID (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Blog retrieved successfully
 */
router.get('/blogs/:id', authenticate, requireAdmin, getBlogById);

/**
 * @swagger
 * /admin/blogs:
 *   post:
 *     summary: Create blog (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title: { type: string }
 *               slug: { type: string }
 *               content: { type: string }
 *               featured_image: { type: string }
 *               tags: { type: string }
 *               published_status: { type: boolean }
 *               meta_title: { type: string }
 *               meta_description: { type: string }
 *     responses:
 *       201:
 *         description: Blog created successfully
 */
router.post('/blogs', authenticate, requireAdmin, createBlog);

/**
 * @swagger
 * /admin/blogs/{id}:
 *   put:
 *     summary: Update blog (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               published_status: { type: boolean }
 *     responses:
 *       200:
 *         description: Blog updated successfully
 */
router.put('/blogs/:id', authenticate, requireAdmin, updateBlog);

/**
 * @swagger
 * /admin/blogs/{id}:
 *   delete:
 *     summary: Delete blog (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Blog deleted successfully
 */
router.delete('/blogs/:id', authenticate, requireAdmin, deleteBlog);

/**
 * @swagger
 * /admin/blogs/{id}/publish:
 *   patch:
 *     summary: Publish/unpublish blog (Admin only)
 *     tags: [Admin - Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Blog publish status updated
 */
// ===== TESTIMONIALS MANAGEMENT =====
router.get('/testimonials', authenticate, requireAdmin, getAllTestimonials);
router.get('/testimonials/:id', authenticate, requireAdmin, getTestimonialById);
router.post('/testimonials', authenticate, requireAdmin, createTestimonial);
router.put('/testimonials/:id', authenticate, requireAdmin, updateTestimonial);
router.delete('/testimonials/:id', authenticate, requireAdmin, deleteTestimonial);

// ===== SYSTEM MANAGEMENT =====
/**
 * @swagger
 * /admin/system/stats:
 *   get:
 *     summary: Get comprehensive system statistics (Admin only)
 *     tags: [Admin - System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 */
router.get('/system/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalBlogs,
      totalTestimonials,
      totalTeam,
      totalContacts,
      totalSubscribers,
      totalServices
    ] = await Promise.all([
      (prisma as any).blog.count(),
      (prisma as any).testimonial.count(),
      (prisma as any).team.count(),
      (prisma as any).contact.count(),
      (prisma as any).subscriber.count(),
      (prisma as any).service.count()
    ]);

    res.json({
      success: true,
      data: {
        cms: {
          blogs: { total: totalBlogs },
          testimonials: { total: totalTestimonials },
          team: { total: totalTeam },
          contacts: { total: totalContacts },
          subscribers: { total: totalSubscribers },
          services: { total: totalServices }
        }
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    });
  }
});

// ===== DATA INTEGRITY MANAGEMENT =====
router.use('/data-integrity', dataIntegrityRoutes);

// ===== ORDER MANAGEMENT =====
/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     description: |
 *       Retrieve all orders in the system with filtering options.
 *
 *       **Access Control:** Admin and Seller only
 *
 *       Supports filtering by status, customer, and date range.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *         description: Filter by order status
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 20
 *         description: Number of orders per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
 *         description: Number of orders to skip
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
import { getAdminOrders } from '../controllers/ordersController';
router.get('/orders', authenticate, requireSeller, getAdminOrders);

// ===== RESERVATION MANAGEMENT =====
/**
 * @swagger
 * /admin/reservations:
 *   get:
 *     summary: Get all reservations (Admin only)
 *     description: |
 *       Retrieve all reservations in the system with filtering options.
 *
 *       **Access Control:** Admin and Seller only
 *
 *       Supports filtering by status, date range, and sorting.
 *     tags: [Admin - Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [reservationDate, createdAt, guestName]
 *           default: reservationDate
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Reservations retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
import { getAllReservations, adminCreateReservation } from '../controllers/reservationsController';
router.get('/reservations', authenticate, requireSeller, getAllReservations);
router.post('/reservations', authenticate, requireSeller, adminCreateReservation);

export default router;