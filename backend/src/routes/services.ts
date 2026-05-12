import express, { Router } from 'express';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/servicesController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Get all services
 *     description: |
 *       Retrieve a paginated list of all services with optional filtering.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports filtering by category and customizable sorting.
 *     tags: [Services]
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
 *         description: Number of services per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *         example: "Catering"
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, title, price]
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
 *         description: Services retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllServices);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get service by ID
 *     description: |
 *       Retrieve a single service with full details.
 *
 *       **Access Control:** Public (no authentication required)
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *       400:
 *         description: Invalid service ID
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getServiceById);

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create service
 *     description: |
 *       Add a new service with features and pricing.
 *
 *       **Access Control:** Admin users only
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Wedding Catering"
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 example: "Complete catering service for weddings with custom menus"
 *               icon:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/wedding-icon.png"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Custom menu planning", "Professional staff", "Setup and cleanup"]
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 2500.00
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Catering"
 *     responses:
 *       201:
 *         description: Service created successfully
 *       400:
 *         description: Invalid service data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createService);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Update service
 *     description: |
 *       Update an existing service with partial data.
 *
 *       **Access Control:** Admin users only
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Premium Wedding Catering"
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 example: "Updated description with more details"
 *               icon:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/premium-wedding-icon.png"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Custom menu planning", "Professional staff", "Setup and cleanup", "Premium ingredients"]
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 3200.00
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Premium Catering"
 *     responses:
 *       200:
 *         description: Service updated successfully
 *       400:
 *         description: Invalid data or service ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete service
 *     description: |
 *       Remove a service from the system.
 *
 *       **Access Control:** Admin users only
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Service ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *       400:
 *         description: Invalid service ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteService);

export default router;