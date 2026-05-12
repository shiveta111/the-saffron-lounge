import express, { Router } from 'express';
// Temporarily disabled imports due to controller issues
// import {
//   getAllInventory,
//   getInventoryById,
//   createInventory,
//   updateInventory,
//   adjustStock,
//   deleteInventory,
//   getLowStockAlerts,
// } from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireSeller } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory items
 *     description: |
 *       Retrieve a paginated list of all inventory items with optional filtering.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Supports filtering by stock status, supplier, and provides stock level summaries.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter items with low stock (quantity <= minThreshold)
 *         example: true
 *       - in: query
 *         name: outOfStock
 *         schema:
 *           type: boolean
 *         description: Filter items that are out of stock (quantity = 0)
 *         example: true
 *       - in: query
 *         name: supplier
 *         schema:
 *           type: string
 *         description: Filter by supplier name
 *         example: "Local Farm"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
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
 *                     inventory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: integer
 *                             example: 1
 *                           quantity:
 *                             type: integer
 *                             example: 25
 *                           minThreshold:
 *                             type: integer
 *                             example: 10
 *                           supplier:
 *                             type: string
 *                             example: "Local Farm"
 *                           lastRestocked:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           stockStatus:
 *                             type: string
 *                             enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK]
 *                             example: "IN_STOCK"
 *                           needsReorder:
 *                             type: boolean
 *                             example: false
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Margherita Pizza"
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 12.99
 *                               category:
 *                                 type: string
 *                                 example: "Pizza"
 *                               isAvailable:
 *                                 type: boolean
 *                                 example: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalItems:
 *                           type: integer
 *                           example: 50
 *                         lowStockItems:
 *                           type: integer
 *                           example: 5
 *                         outOfStockItems:
 *                           type: integer
 *                           example: 2
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
// router.get('/', authenticate, requireSeller, getAllInventory);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get inventory by product ID
 *     description: |
 *       Retrieve inventory information for a specific product.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Includes stock status and reorder information.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
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
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: integer
 *                           example: 1
 *                         quantity:
 *                           type: integer
 *                           example: 25
 *                         minThreshold:
 *                           type: integer
 *                           example: 10
 *                         supplier:
 *                           type: string
 *                           example: "Local Farm"
 *                         lastRestocked:
 *                           type: string
 *                           format: date-time
 *                         stockStatus:
 *                           type: string
 *                           enum: [IN_STOCK, LOW_STOCK, OUT_OF_STOCK]
 *                           example: "IN_STOCK"
 *                         needsReorder:
 *                           type: boolean
 *                           example: false
 *                         product:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Margherita Pizza"
 *                             price:
 *                               type: number
 *                               format: float
 *                               example: 12.99
 *                             category:
 *                               type: string
 *                               example: "Pizza"
 *                             isAvailable:
 *                               type: boolean
 *                               example: true
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
 // router.get('/:id', authenticate, requireSeller, getInventoryById);

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create inventory for a product
 *     description: |
 *       Add inventory tracking for a new product.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Creates inventory record with initial stock levels and supplier information.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 example: 50
 *               minThreshold:
 *                 type: integer
 *                 minimum: 0
 *                 default: 10
 *                 example: 10
 *               supplier:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Local Farm"
 *     responses:
 *       201:
 *         description: Inventory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inventory created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: integer
 *                           example: 1
 *                         quantity:
 *                           type: integer
 *                           example: 50
 *                         minThreshold:
 *                           type: integer
 *                           example: 10
 *                         supplier:
 *                           type: string
 *                           example: "Local Farm"
 *                         lastRestocked:
 *                           type: string
 *                           format: date-time
 *                         product:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             name:
 *                               type: string
 *                               example: "Margherita Pizza"
 *                             price:
 *                               type: number
 *                               format: float
 *                               example: 12.99
 *                             category:
 *                               type: string
 *                               example: "Pizza"
 *       400:
 *         description: Invalid inventory data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Product not found
 *       409:
 *         description: Inventory already exists for this product
 *       500:
 *         description: Server error
 */
// router.post('/', authenticate, requireSeller, createInventory);

/**
 * @swagger
 * /api/inventory/{id}:
 *   put:
 *     summary: Update inventory
 *     description: |
 *       Update inventory settings for a product.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Update stock thresholds, supplier information, etc.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 example: 75
 *               minThreshold:
 *                 type: integer
 *                 minimum: 0
 *                 example: 15
 *               supplier:
 *                 type: string
 *                 maxLength: 100
 *                 example: "New Supplier Inc"
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inventory updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: integer
 *                           example: 1
 *                         quantity:
 *                           type: integer
 *                           example: 75
 *                         minThreshold:
 *                           type: integer
 *                           example: 15
 *                         supplier:
 *                           type: string
 *                           example: "New Supplier Inc"
 *                         lastRestocked:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or product ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
// router.put('/:id', authenticate, requireSeller, updateInventory);

/**
 * @swagger
 * /api/inventory/{id}/adjust:
 *   patch:
 *     summary: Adjust stock levels
 *     description: |
 *       Adjust inventory stock levels with reason tracking.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Use positive values to add stock, negative values to reduce stock.
 *       Automatically updates lastRestocked timestamp for additions.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *               - reason
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Stock adjustment (positive to add, negative to reduce)
 *                 example: 25
 *               reason:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Restock from supplier"
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Received fresh batch from Local Farm"
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Stock adjusted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     inventory:
 *                       type: object
 *                       properties:
 *                         productId:
 *                           type: integer
 *                           example: 1
 *                         quantity:
 *                           type: integer
 *                           example: 75
 *                         minThreshold:
 *                           type: integer
 *                           example: 10
 *                         supplier:
 *                           type: string
 *                           example: "Local Farm"
 *                         lastRestocked:
 *                           type: string
 *                           format: date-time
 *                     adjustment:
 *                       type: object
 *                       properties:
 *                         previousQuantity:
 *                           type: integer
 *                           example: 50
 *                         adjustment:
 *                           type: integer
 *                           example: 25
 *                         newQuantity:
 *                           type: integer
 *                           example: 75
 *                         reason:
 *                           type: string
 *                           example: "Restock from supplier"
 *                         notes:
 *                           type: string
 *                           example: "Received fresh batch from Local Farm"
 *                         adjustedAt:
 *                           type: string
 *                           format: date-time
 *                         adjustedBy:
 *                           type: integer
 *                           example: 1
 *       400:
 *         description: Invalid adjustment data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
// router.patch('/:id/adjust', authenticate, requireSeller, adjustStock);

/**
 * @swagger
 * /api/inventory/{id}:
 *   delete:
 *     summary: Delete inventory
 *     description: |
 *       Remove inventory tracking for a product.
 *
 *       **Access Control:** Admin only
 *
 *       Permanently removes inventory record. Use with caution.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Inventory deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Inventory deleted successfully"
 *       400:
 *         description: Invalid product ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Inventory not found
 *       500:
 *         description: Server error
 */
// router.delete('/:id', authenticate, requireAdmin, deleteInventory);

/**
 * @swagger
 * /api/inventory/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     description: |
 *       Retrieve all items that need reordering due to low stock levels.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Includes items that are out of stock or below minimum threshold,
 *       with suggested reorder quantities and urgency levels.
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
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
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: integer
 *                             example: 1
 *                           productName:
 *                             type: string
 *                             example: "Margherita Pizza"
 *                           category:
 *                             type: string
 *                             example: "Pizza"
 *                           currentQuantity:
 *                             type: integer
 *                             example: 3
 *                           minThreshold:
 *                             type: integer
 *                             example: 10
 *                           supplier:
 *                             type: string
 *                             example: "Local Farm"
 *                           lastRestocked:
 *                             type: string
 *                             format: date-time
 *                           alertType:
 *                             type: string
 *                             enum: [OUT_OF_STOCK, LOW_STOCK]
 *                             example: "LOW_STOCK"
 *                           urgency:
 *                             type: string
 *                             enum: [CRITICAL, HIGH, MEDIUM]
 *                             example: "HIGH"
 *                           suggestedReorderQuantity:
 *                             type: integer
 *                             example: 17
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalAlerts:
 *                           type: integer
 *                           example: 7
 *                         outOfStock:
 *                           type: integer
 *                           example: 2
 *                         lowStock:
 *                           type: integer
 *                           example: 5
 *                         critical:
 *                           type: integer
 *                           example: 2
 *                         high:
 *                           type: integer
 *                           example: 3
 *                         medium:
 *                           type: integer
 *                           example: 2
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
// router.get('/alerts/low-stock', authenticate, requireSeller, getLowStockAlerts);

export default router;