import express, { Router } from 'express';
import {
  getSecuritySettings,
  updateSecuritySettings,
  getSecurityLogs,
  getAuditTrail,
  blockIPAddress,
  unblockIPAddress
} from '../controllers/securityController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /security/settings:
 *   get:
 *     summary: Get security settings
 *     description: Retrieve current security configuration settings
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/settings', authenticate, requireAdmin, getSecuritySettings);

/**
 * @swagger
 * /security/settings:
 *   put:
 *     summary: Update security settings
 *     description: Update security configuration settings
 *     tags: [Security]
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
 *     responses:
 *       200:
 *         description: Security settings updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/settings', authenticate, requireAdmin, updateSecuritySettings);

/**
 * @swagger
 * /security/logs:
 *   get:
 *     summary: Get security logs
 *     description: Retrieve security-related logs and events
 *     tags: [Security]
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Security logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/logs', authenticate, requireAdmin, getSecurityLogs);

/**
 * @swagger
 * /security/audit:
 *   get:
 *     summary: Get audit trail
 *     description: Retrieve system audit trail for compliance and monitoring
 *     tags: [Security]
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
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Audit trail retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/audit', authenticate, requireAdmin, getAuditTrail);

/**
 * @swagger
 * /security/block-ip:
 *   post:
 *     summary: Block IP address
 *     description: Block an IP address from accessing the system
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ipAddress
 *             properties:
 *               ipAddress:
 *                 type: string
 *               reason:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       200:
 *         description: IP address blocked successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/block-ip', authenticate, requireAdmin, blockIPAddress);

/**
 * @swagger
 * /security/unblock-ip/{ipAddress}:
 *   delete:
 *     summary: Unblock IP address
 *     description: Remove IP address from blocked list
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ipAddress
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: IP address unblocked successfully
 *       400:
 *         description: Invalid IP address
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: IP address not found in blocked list
 *       500:
 *         description: Server error
 */
router.delete('/unblock-ip/:ipAddress', authenticate, requireAdmin, unblockIPAddress);

export default router;