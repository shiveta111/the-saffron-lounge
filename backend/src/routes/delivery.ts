import express, { Router } from 'express';
import {
  getDeliveryZones,
  getDeliveryZoneById,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  validateDeliveryAddress,
  calculateDeliveryFee,
} from '../controllers/deliveryController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/delivery/zones:
 *   get:
 *     summary: Get all delivery zones
 *     description: |
 *       Retrieve all delivery zones with optional filtering.
 *       
 *       **Access Control:** Public for active zones, Admin for all
 *     tags: [Delivery]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Delivery zones retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/zones', getDeliveryZones);

/**
 * @swagger
 * /api/delivery/zones/{id}:
 *   get:
 *     summary: Get delivery zone by ID
 *     description: Get detailed information about a specific delivery zone
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zone retrieved successfully
 *       400:
 *         description: Invalid zone ID
 *       404:
 *         description: Zone not found
 *       500:
 *         description: Server error
 */
router.get('/zones/:id', getDeliveryZoneById);

/**
 * @swagger
 * /api/delivery/zones:
 *   post:
 *     summary: Create delivery zone
 *     description: |
 *       Create a new delivery zone.
 *       
 *       **Access Control:** Admin only
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - postcodes
 *               - deliveryFee
 *               - estimatedTime
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Central London"
 *               postcodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["SW1", "SW2", "SW3"]
 *               deliveryFee:
 *                 type: number
 *                 example: 3.99
 *               minOrderValue:
 *                 type: number
 *                 example: 20.00
 *               estimatedTime:
 *                 type: integer
 *                 example: 45
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Zone created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/zones', authenticate, createDeliveryZone);

/**
 * @swagger
 * /api/delivery/zones/{id}:
 *   put:
 *     summary: Update delivery zone
 *     description: |
 *       Update delivery zone details.
 *       
 *       **Access Control:** Admin only
 *     tags: [Delivery]
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
 *             properties:
 *               name:
 *                 type: string
 *               postcodes:
 *                 type: array
 *                 items:
 *                   type: string
 *               deliveryFee:
 *                 type: number
 *               minOrderValue:
 *                 type: number
 *               estimatedTime:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Zone updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Zone not found
 *       500:
 *         description: Server error
 */
router.put('/zones/:id', authenticate, updateDeliveryZone);

/**
 * @swagger
 * /api/delivery/zones/{id}:
 *   delete:
 *     summary: Delete delivery zone
 *     description: |
 *       Delete a delivery zone.
 *       
 *       **Access Control:** Admin only
 *     tags: [Delivery]
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
 *         description: Zone deleted successfully
 *       400:
 *         description: Invalid zone ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Zone not found
 *       500:
 *         description: Server error
 */
router.delete('/zones/:id', authenticate, deleteDeliveryZone);

/**
 * @swagger
 * /api/delivery/validate-address:
 *   post:
 *     summary: Validate delivery address
 *     description: |
 *       Validate if an address is within delivery zones.
 *       
 *       **Access Control:** Public
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - postcode
 *             properties:
 *               address:
 *                 type: string
 *                 example: "123 Main Street, London"
 *               postcode:
 *                 type: string
 *                 example: "SW1A 1AA"
 *     responses:
 *       200:
 *         description: Address validated successfully
 *       400:
 *         description: Invalid address or not in delivery zone
 *       500:
 *         description: Server error
 */
router.post('/validate-address', validateDeliveryAddress);

/**
 * @swagger
 * /api/delivery/calculate-fee:
 *   post:
 *     summary: Calculate delivery fee
 *     description: |
 *       Calculate delivery fee based on postcode and order total.
 *       
 *       **Access Control:** Public
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postcode
 *               - orderTotal
 *             properties:
 *               postcode:
 *                 type: string
 *                 example: "SW1A 1AA"
 *               orderTotal:
 *                 type: number
 *                 example: 25.50
 *     responses:
 *       200:
 *         description: Fee calculated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: No delivery zone for postcode
 *       500:
 *         description: Server error
 */
router.post('/calculate-fee', calculateDeliveryFee);

export default router;