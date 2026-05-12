import express, { Router } from 'express';
// Temporarily disabled imports due to controller issues
import {
  subscribe,
  unsubscribe,
  getAllSubscribers,
  updateSubscriber,
  deleteSubscriber,
} from '../controllers/newsletterController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/newsletter/subscribe:
 *   post:
 *     summary: Subscribe to newsletter
 *     description: |
 *       Subscribe an email address to the newsletter.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Handles both new subscriptions and reactivation of unsubscribed emails.
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Successfully subscribed to newsletter
 *       200:
 *         description: Subscription reactivated
 *       400:
 *         description: Invalid email address
 *       409:
 *         description: Email already subscribed
 *       500:
 *         description: Server error
 */
// router.post('/subscribe', subscribe);
router.post('/subscribe', subscribe);

/**
 * @swagger
 * /api/newsletter/unsubscribe:
 *   post:
 *     summary: Unsubscribe from newsletter
 *     description: |
 *       Unsubscribe an email address from the newsletter.
 *
 *       **Access Control:** Public (no authentication required)
 *     tags: [Newsletter]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Successfully unsubscribed from newsletter
 *       400:
 *         description: Invalid email address
 *       404:
 *         description: Email not found in subscriber list
 *       500:
 *         description: Server error
 */
// router.post('/unsubscribe', unsubscribe);

/**
 * @swagger
 * /api/newsletter/subscribers:
 *   get:
 *     summary: Get all newsletter subscribers
 *     description: |
 *       Retrieve a paginated list of all newsletter subscribers.
 *
 *       **Access Control:** Admin users only
 *
 *       Supports filtering by status and customizable sorting.
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of subscribers per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, unsubscribed]
 *         description: Filter by subscription status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, email]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Subscribers retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
// router.get('/subscribers', authenticate, requireAdmin, getAllSubscribers);
router.get('/subscribers', authenticate, requireAdmin, getAllSubscribers);

/**
 * @swagger
 * /api/newsletter/subscribers/{id}:
 *   put:
 *     summary: Update subscriber status
 *     description: |
 *       Update the status of a newsletter subscriber.
 *
 *       **Access Control:** Admin users only
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscriber ID
 *         example: 1
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
 *                 enum: [active, unsubscribed]
 *                 example: "unsubscribed"
 *     responses:
 *       200:
 *         description: Subscriber status updated successfully
 *       400:
 *         description: Invalid data or subscriber ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Subscriber not found
 *       500:
 *         description: Server error
 */
// router.put('/subscribers/:id', authenticate, requireAdmin, updateSubscriber);

/**
 * @swagger
 * /api/newsletter/subscribers/{id}:
 *   delete:
 *     summary: Delete subscriber
 *     description: |
 *       Remove a subscriber from the newsletter list.
 *
 *       **Access Control:** Admin users only
 *     tags: [Newsletter]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscriber ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Subscriber deleted successfully
 *       400:
 *         description: Invalid subscriber ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Subscriber not found
 *       500:
 *         description: Server error
 */
// router.delete('/subscribers/:id', authenticate, requireAdmin, deleteSubscriber);

export default router;