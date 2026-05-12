import express, { Router } from 'express';
import {
  verifyWebhook,
  handleWebhook,
  sendTestMessage,
  getConfigStatus,
} from '../controllers/whatsappController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/whatsapp/webhook:
 *   get:
 *     summary: Verify WhatsApp webhook
 *     description: |
 *       Webhook verification endpoint for Meta WhatsApp Business API.
 *       
 *       **Access Control:** Public (Meta verification)
 *       
 *       This endpoint is called by Meta to verify the webhook URL.
 *     tags: [WhatsApp]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         required: true
 *         schema:
 *           type: string
 *         example: "subscribe"
 *       - in: query
 *         name: hub.verify_token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hub.challenge
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook verified successfully
 *       403:
 *         description: Verification failed
 *       500:
 *         description: Server error
 */
router.get('/webhook', verifyWebhook);

/**
 * @swagger
 * /api/whatsapp/webhook:
 *   post:
 *     summary: Handle WhatsApp webhook events
 *     description: |
 *       Receive and process incoming WhatsApp messages and status updates.
 *       
 *       **Access Control:** Public (Meta webhook)
 *       
 *       This endpoint receives notifications from Meta about incoming messages.
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       500:
 *         description: Server error
 */
router.post('/webhook', handleWebhook);

/**
 * @swagger
 * /api/whatsapp/test:
 *   post:
 *     summary: Send test WhatsApp message
 *     description: |
 *       Send a test message to verify WhatsApp integration.
 *       
 *       **Access Control:** Admin only
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+447123456789"
 *     responses:
 *       200:
 *         description: Test message sent successfully
 *       400:
 *         description: Invalid phone number
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to send message
 */
router.post('/test', authenticate, sendTestMessage);

/**
 * @swagger
 * /api/whatsapp/config-status:
 *   get:
 *     summary: Get WhatsApp configuration status
 *     description: |
 *       Check if WhatsApp service is properly configured.
 *       
 *       **Access Control:** Admin only
 *     tags: [WhatsApp]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration status retrieved
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/config-status', authenticate, getConfigStatus);

export default router;