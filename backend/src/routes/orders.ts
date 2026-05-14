import express, { Router, Request, Response } from 'express';
import {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} from '../controllers/ordersController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireSeller, requireCustomer } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: |
 *       Place a new order with menu items.
 *
 *       **Access Control:** Authenticated customers
 *
 *       Validates inventory availability, calculates total, and creates order with items.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       example: 2
 *                     specialRequests:
 *                       type: string
 *                       maxLength: 500
 *                       example: "Extra cheese, no onions"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Please deliver to the side entrance"
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                   example: "Order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         customerId:
 *                           type: integer
 *                           example: 1
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                           example: "PENDING"
 *                         total:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         notes:
 *                           type: string
 *                           example: "Please deliver to the side entrance"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           orderId:
 *                             type: integer
 *                             example: 1
 *                           productId:
 *                             type: integer
 *                             example: 1
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 12.99
 *                           specialRequests:
 *                             type: string
 *                             example: "Extra cheese, no onions"
 *       400:
 *         description: Invalid order data or insufficient inventory
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
 *                   example: "Invalid order data"
 *                 details:
 *                   type: string
 *                   example: "items must contain at least 1 item"
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireCustomer, createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     description: |
 *       Retrieve a paginated list of orders with optional filtering.
 *
 *       **Access Control:**
 *       - Customers: Can only see their own orders
 *       - Staff (Admin/Seller): Can see all orders
 *
 *       Supports filtering by status, customer, and date range.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *         description: Filter by order status
 *         example: "PENDING"
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID (staff only)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 20
 *         description: Number of orders per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
 *         description: Number of orders to skip
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date (ISO format)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date (ISO format)
 *         example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
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
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           customerId:
 *                             type: integer
 *                             example: 1
 *                           status:
 *                             type: string
 *                             enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                             example: "PENDING"
 *                           total:
 *                             type: number
 *                             format: float
 *                             example: 25.99
 *                           notes:
 *                             type: string
 *                             example: "Please deliver to the side entrance"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           customer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               email:
 *                                 type: string
 *                                 example: "customer@test.com"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 1
 *                                 productId:
 *                                   type: integer
 *                                   example: 1
 *                                 quantity:
 *                                   type: integer
 *                                   example: 2
 *                                 price:
 *                                   type: number
 *                                   format: float
 *                                   example: 12.99
 *                                 specialRequests:
 *                                   type: string
 *                                   example: "Extra cheese"
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: integer
 *                                       example: 1
 *                                     name:
 *                                       type: string
 *                                       example: "Margherita Pizza"
 *                                     price:
 *                                       type: number
 *                                       format: float
 *                                       example: 12.99
 *                           payment:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               status:
 *                                 type: string
 *                                 enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                                 example: "COMPLETED"
 *                               method:
 *                                 type: string
 *                                 enum: [STRIPE, PAYPAL, CASH, CARD]
 *                                 example: "STRIPE"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, getAllOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: |
 *       Retrieve detailed information about a specific order.
 *
 *       **Access Control:**
 *       - Customers: Can only access their own orders
 *       - Staff (Admin/Seller): Can access any order
 *
 *       Includes order items, customer details, and payment information.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Order retrieved successfully
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
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         customerId:
 *                           type: integer
 *                           example: 1
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                           example: "PREPARING"
 *                         total:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         notes:
 *                           type: string
 *                           example: "Please deliver to the side entrance"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         customer:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             email:
 *                               type: string
 *                               example: "customer@test.com"
 *                             name:
 *                               type: string
 *                               example: "John Doe"
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               productId:
 *                                 type: integer
 *                                 example: 1
 *                               quantity:
 *                                 type: integer
 *                                 example: 2
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 12.99
 *                               specialRequests:
 *                                 type: string
 *                                 example: "Extra cheese"
 *                               product:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                     example: 1
 *                                   name:
 *                                     type: string
 *                                     example: "Margherita Pizza"
 *                                   price:
 *                                     type: number
 *                                     format: float
 *                                     example: 12.99
 *                                   imageUrl:
 *                                     type: string
 *                                     format: uri
 *                                     example: "https://example.com/pizza.jpg"
 *                         payment:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             amount:
 *                               type: number
 *                               format: float
 *                               example: 25.99
 *                             method:
 *                               type: string
 *                               enum: [STRIPE, PAYPAL, CASH, CARD]
 *                               example: "STRIPE"
 *                             status:
 *                               type: string
 *                               enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                               example: "COMPLETED"
 *                             transactionId:
 *                               type: string
 *                               example: "txn_1234567890"
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *       400:
 *         description: Invalid order ID
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
 *                   example: "Invalid order ID"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getOrderById);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: |
 *       Update the status of an existing order.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Supports status transitions: PENDING → PREPARING/CANCELLED,
 *       PREPARING → READY/CANCELLED, READY → DELIVERED.
 *       Cancelling an order restores inventory.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
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
 *                 enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                 example: "PREPARING"
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                   example: "Order status updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         customerId:
 *                           type: integer
 *                           example: 1
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                           example: "PREPARING"
 *                         total:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         notes:
 *                           type: string
 *                           example: "Please deliver to the side entrance"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         customer:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             email:
 *                               type: string
 *                               example: "customer@test.com"
 *                             name:
 *                               type: string
 *                               example: "John Doe"
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               productId:
 *                                 type: integer
 *                                 example: 1
 *                               quantity:
 *                                 type: integer
 *                                 example: 2
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 12.99
 *                               specialRequests:
 *                                 type: string
 *                                 example: "Extra cheese"
 *                               product:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                     example: 1
 *                                   name:
 *                                     type: string
 *                                     example: "Margherita Pizza"
 *       400:
 *         description: Invalid status or invalid transition
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
 *                   example: "Cannot change status from PENDING to DELIVERED"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authenticate, requireSeller, updateOrderStatus);

// Add PUT handler for backward compatibility
router.put('/:id/status', authenticate, requireSeller, updateOrderStatus);

export default router;