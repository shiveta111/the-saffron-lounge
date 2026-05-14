import express, { Router } from 'express';
import {
  getApplicationSettings,
  updateApplicationSettings,
  getUserPreferences,
  updateUserPreferences,
  getSystemInfo,
  resetSettings
} from '../controllers/settingsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /settings/app:
 *   get:
 *     summary: Get application settings
 *     description: Retrieve current application configuration settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/app', authenticate, requireAdmin, getApplicationSettings);

/**
 * @swagger
 * /settings/app:
 *   put:
 *     summary: Update application settings
 *     description: Update application configuration settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               settings:
 *                 type: object
 *                 properties:
 *                   general:
 *                     type: object
 *                   business:
 *                     type: object
 *                   notifications:
 *                     type: object
 *                   integrations:
 *                     type: object
 *     responses:
 *       200:
 *         description: Application settings updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/app', authenticate, requireAdmin, updateApplicationSettings);

/**
 * @swagger
 * /settings/user:
 *   get:
 *     summary: Get user preferences
 *     description: Retrieve current user's preference settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/user', authenticate, getUserPreferences);

/**
 * @swagger
 * /settings/user:
 *   put:
 *     summary: Update user preferences
 *     description: Update current user's preference settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   notifications:
 *                     type: object
 *                   privacy:
 *                     type: object
 *                   preferences:
 *                     type: object
 *     responses:
 *       200:
 *         description: User preferences updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/user', authenticate, updateUserPreferences);

/**
 * @swagger
 * /settings/system:
 *   get:
 *     summary: Get system information
 *     description: Retrieve system status and version information
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System information retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/system', authenticate, requireAdmin, getSystemInfo);

/**
 * @swagger
 * /settings/reset:
 *   post:
 *     summary: Reset settings to defaults
 *     description: Reset specified category of settings to default values
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [general, business, notifications, integrations, user-preferences]
 *     responses:
 *       200:
 *         description: Settings reset successfully
 *       400:
 *         description: Invalid category
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/reset', authenticate, resetSettings);

export default router;