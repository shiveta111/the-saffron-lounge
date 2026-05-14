import express, { Router, Request, Response } from 'express';
import { dbManager } from '../utils/database';
// Temporarily disabled imports due to controller issues
// import {
//   register,
//   login,
//   verifyEmail,
//   getProfile,
//   updateProfile,
//   changePassword,
//   requestPasswordReset,
//   resetPassword,
//   getLoyaltyPoints,
//   exportUserData,
//   deleteAccount,
// } from '../controllers/customerController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     summary: Get customer profile
 *     description: |
 *       Retrieve the profile information of the authenticated customer.
 *
 *       **Access Control:** All authenticated users
 *
 *       Returns dynamic user data including preferences and account information.
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         email:
 *                           type: string
 *                           example: "customer@test.com"
 *                         name:
 *                           type: string
 *                           example: "Customer User"
 *                         role:
 *                           type: string
 *                           example: "CUSTOMER"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         preferences:
 *                           type: object
 *                           description: User preferences and settings
 *                           example: { "theme": "light", "notifications": true }
 *       401:
 *         description: Unauthorized - User not authenticated
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
 *                   example: "Authentication required"
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
 *                   example: "Failed to retrieve profile"
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const user = await dbManager.get(`
      SELECT id, email, name, role, isActive, createdAt, updatedAt
      FROM users
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Add dynamic preferences (this could come from a separate preferences table)
    const userWithPreferences = {
      ...user,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en',
        currency: 'USD',
      },
    };

    res.json({
      success: true,
      data: {
        user: userWithPreferences,
      },
    });
  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
    });
  }
  return;
});

/**
 * @swagger
 * /api/customers/profile:
 *   put:
 *     summary: Update customer profile
 *     description: |
 *       Update the profile information of the authenticated customer.
 *
 *       **Access Control:** All authenticated users (can only update their own profile)
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Name"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark]
 *                     example: "dark"
 *                   notifications:
 *                     type: boolean
 *                     example: false
 *                   language:
 *                     type: string
 *                     example: "es"
 *                   currency:
 *                     type: string
 *                     example: "EUR"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, preferences } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate input
    if (name && typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Name must be a string',
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name;

    if (Object.keys(updateData).length > 0) {
      await dbManager.run(`
        UPDATE users
        SET ${Object.keys(updateData).map(key => `${key} = ?`).join(', ')}, updatedAt = NOW()
        WHERE id = ?
      `, [...Object.values(updateData), userId]);
    }

    const user = await dbManager.get(`
      SELECT id, email, name, role, isActive, updatedAt
      FROM users
      WHERE id = ?
    `, [userId]);

    // Include preferences in response (would be stored separately in production)
    const userWithPreferences = {
      ...user,
      preferences: preferences || {
        theme: 'light',
        notifications: true,
        language: 'en',
        currency: 'USD',
      },
    };

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userWithPreferences,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
  return;
});

// Registration and Authentication Routes - Temporarily disabled due to controller issues
// router.post('/register', register);
// router.post('/login', login);
// router.get('/verify-email/:token', verifyEmail);

// Password Management Routes - Temporarily disabled
// router.post('/forgot-password', requestPasswordReset);
// router.post('/reset-password', resetPassword);
// router.put('/change-password', authenticate, changePassword);

// Profile Management Routes - Temporarily disabled
// router.get('/loyalty-points', authenticate, getLoyaltyPoints);

// GDPR Compliance Routes - Temporarily disabled
// router.get('/export-data', authenticate, exportUserData);
// router.delete('/delete-account', authenticate, deleteAccount);

// Enable basic customer routes
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // For now, return basic customer info - this should be expanded with proper controller
    const customers = await dbManager.getAll('users', {
      where: 'role = ?',
      params: ['CUSTOMER'],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      select: 'id, email, name, role, isActive, createdAt, updatedAt'
    });

    const total = await dbManager.get(`SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'`);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          total: total.count,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: (parseInt(offset as string) + parseInt(limit as string)) < total.count
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customers',
    });
  }
});

/**
 * @swagger
 * /api/customer/stats:
 *   get:
 *     summary: Get customer statistics
 *     description: |
 *       Retrieve statistics for the authenticated customer including total orders, total spent, active reservations, and loyalty points.
 *
 *       **Access Control:** Authenticated customers only
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     totalOrders:
 *                       type: integer
 *                       example: 5
 *                     totalSpent:
 *                       type: number
 *                       format: float
 *                       example: 125.50
 *                     activeReservations:
 *                       type: integer
 *                       example: 2
 *                     loyaltyPoints:
 *                       type: integer
 *                       example: 1255
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    console.log('[Customer Stats] Fetching stats for userId:', userId);

    // Import customerService and prisma
    const { getCustomerStatistics } = require('../services/customerService');
    const prisma = require('../config/prisma').default;

    // Get order statistics
    const orderStats = await getCustomerStatistics(userId);
    console.log('[Customer Stats] Order stats:', orderStats);

    // Get active reservations count
    const activeReservations = await prisma.reservation.count({
      where: {
        customerId: userId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'SEATED'],
        },
        reservationDate: {
          gte: new Date(),
        },
      },
    });
    console.log('[Customer Stats] Active reservations:', activeReservations);

    // Get loyalty points from user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    console.log('[Customer Stats] User loyalty points:', user?.loyaltyPoints || 0);

    const statsData = {
      totalOrders: orderStats.totalOrders,
      totalSpent: orderStats.totalSpent,
      activeReservations,
      loyaltyPoints: user?.loyaltyPoints || 0,
    };

    console.log('[Customer Stats] Returning stats:', statsData);

    res.json({
      success: true,
      data: statsData,
    });
  } catch (error: any) {
    console.error('[Customer Stats] Error:', error);
    console.error('[Customer Stats] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer statistics',
      details: error.message,
    });
  }
});

export default router;