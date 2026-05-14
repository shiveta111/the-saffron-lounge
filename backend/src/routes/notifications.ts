import express, { Router } from 'express';
import {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotificationStatus,
  deleteNotification,
  sendNotification
} from '../controllers/notificationsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications
 *     description: Retrieve a paginated list of notifications (users see their own, admins see all)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SENT, FAILED, PENDING]
 *       - in: query
 *         name: bookingId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', getAllNotifications);

/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     description: Retrieve a specific notification by its ID (users can only access their own notifications)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification retrieved successfully
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not your notification
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getNotificationById);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a new notification
 *     description: Create a new notification for a booking (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - type
 *               - message
 *             properties:
 *               bookingId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [EMAIL, WHATSAPP]
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createNotification);

/**
 * @swagger
 * /notifications/{id}/status:
 *   put:
 *     summary: Update notification status
 *     description: Update the status of a notification (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SENT, FAILED, PENDING]
 *     responses:
 *       200:
 *         description: Notification status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', authenticate, requireAdmin, updateNotificationStatus);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete an existing notification (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteNotification);

/**
 * @swagger
 * /notifications/{id}/send:
 *   post:
 *     summary: Send notification
 *     description: Send a notification via email or WhatsApp (admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid notification ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.post('/:id/send', authenticate, requireAdmin, sendNotification);

export default router;