import express, { Router } from 'express';
import {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  regenerateQRCode,
  getQRCodeDataURL,
  batchGenerateQRCodes,
} from '../controllers/tablesController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/tables:
 *   get:
 *     summary: Get all tables
 *     description: |
 *       Retrieve a paginated list of tables with optional filtering.
 *       
 *       **Access Control:** Admin only
 *       
 *       Supports filtering by active status and location.
 *     tags: [Tables]
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
 *         description: Number of tables per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [tableNumber, capacity, createdAt]
 *           default: tableNumber
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Tables retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, getAllTables);

/**
 * @swagger
 * /api/tables/{id}:
 *   get:
 *     summary: Get table by ID
 *     description: |
 *       Retrieve detailed information about a specific table including recent orders and reservations.
 *       
 *       **Access Control:** Admin only
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table retrieved successfully
 *       400:
 *         description: Invalid table ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Table not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getTableById);

/**
 * @swagger
 * /api/tables:
 *   post:
 *     summary: Create a new table
 *     description: |
 *       Create a new table with automatic QR code generation.
 *       
 *       **Access Control:** Admin only
 *       
 *       The QR code will point to `/table/{tableId}` for customer ordering.
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableNumber
 *               - capacity
 *             properties:
 *               tableNumber:
 *                 type: string
 *                 maxLength: 50
 *                 example: "T-01"
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 4
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Ground Floor - Window Side"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Table created successfully
 *       400:
 *         description: Invalid table data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Table number already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, createTable);

/**
 * @swagger
 * /api/tables/{id}:
 *   put:
 *     summary: Update table
 *     description: |
 *       Update table details. If table number changes, QR code will be regenerated.
 *       
 *       **Access Control:** Admin only
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableNumber:
 *                 type: string
 *                 maxLength: 50
 *                 example: "T-02"
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 6
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 example: "First Floor - Private Room"
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Table updated successfully
 *       400:
 *         description: Invalid data or table ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Table not found
 *       409:
 *         description: Table number already exists
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, updateTable);

/**
 * @swagger
 * /api/tables/{id}:
 *   delete:
 *     summary: Delete table
 *     description: |
 *       Delete a table and its QR code. Cannot delete tables with existing orders or reservations.
 *       
 *       **Access Control:** Admin only
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: Table deleted successfully
 *       400:
 *         description: Invalid table ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Table not found
 *       409:
 *         description: Cannot delete table with existing orders or reservations
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, deleteTable);

/**
 * @swagger
 * /api/tables/{id}/regenerate-qr:
 *   post:
 *     summary: Regenerate QR code for table
 *     description: |
 *       Regenerate the QR code for a specific table. Useful if QR code is damaged or needs updating.
 *       
 *       **Access Control:** Admin only
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: QR code regenerated successfully
 *       400:
 *         description: Invalid table ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Table not found
 *       500:
 *         description: Server error
 */
router.post('/:id/regenerate-qr', authenticate, regenerateQRCode);

/**
 * @swagger
 * /api/tables/{id}/qr-data-url:
 *   get:
 *     summary: Get QR code as data URL
 *     description: |
 *       Get the QR code as a base64 data URL for immediate display without file access.
 *       
 *       **Access Control:** Admin only
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Table ID
 *     responses:
 *       200:
 *         description: QR code data URL generated successfully
 *       400:
 *         description: Invalid table ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Table not found
 *       500:
 *         description: Server error
 */
router.get('/:id/qr-data-url', authenticate, getQRCodeDataURL);

/**
 * @swagger
 * /api/tables/batch/generate-qr:
 *   post:
 *     summary: Batch generate QR codes for all tables
 *     description: |
 *       Generate or regenerate QR codes for all tables in the system.
 *       
 *       **Access Control:** Admin only
 *       
 *       Useful for initial setup or bulk regeneration.
 *     tags: [Tables]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch QR code generation completed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: No tables found
 *       500:
 *         description: Server error
 */
router.post('/batch/generate-qr', authenticate, batchGenerateQRCodes);

export default router;