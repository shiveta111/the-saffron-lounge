import express, { Router } from 'express';
import {
  processPayment,
  getPaymentStatus,
  processRefund,
  getPaymentByOrderId,
  handlePaymentWebhook,
  createPaymentRecord,
  updatePaymentStatusEndpoint,
  getAllPayments,
} from '../controllers/paymentsController';
import { authenticate } from '../middleware/auth';
import { requireCustomer, requireSeller } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments (admin only)
 *     description: |
 *       Retrieve all payments with filtering options.
 *
 *       **Access Control:** Admin/Seller only
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *         description: Filter by payment status
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [CASH, CARD, STRIPE, PAYPAL]
 *         description: Filter by payment method
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a payment record
 *     description: |
 *       Create a payment record for an order.
 *
 *       **Access Control:** Order owner or Admin/Seller
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - amount
 *               - method
 *             properties:
 *               orderId:
 *                 type: integer
 *                 example: 1
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 25.99
 *               method:
 *                 type: string
 *                 enum: [CASH, CARD, STRIPE, PAYPAL]
 *                 example: "CASH"
 *               status:
 *                 type: string
 *                 enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                 example: "PENDING"
 *               transactionId:
 *                 type: string
 *                 example: "cash_1234567890"
 *     responses:
 *       201:
 *         description: Payment record created successfully
 *       400:
 *         description: Invalid payment data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, requireSeller, getAllPayments);
router.post('/', authenticate, createPaymentRecord);

/**
 * @swagger
 * /api/payments/{id}/status:
 *   patch:
 *     summary: Update payment status
 *     description: |
 *       Update the status of a payment (e.g., mark as COMPLETED).
 *
 *       **Access Control:** Admin/Seller only
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
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
 *                 enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                 example: "COMPLETED"
 *               transactionId:
 *                 type: string
 *                 example: "cash_1234567890_confirmed"
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid status update data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authenticate, requireSeller, updatePaymentStatusEndpoint);

/**
 * @swagger
 * /api/orders/{orderId}/pay:
 *   post:
 *     summary: Process payment for an order
 *     description: |
 *       Process payment for a pending order using various payment methods.
 *
 *       **Access Control:** Order owner (customer)
 *
 *       Supports Stripe, PayPal, cash, and card payments. Updates order status to 'PREPARING' on successful payment.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID to process payment for
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [STRIPE, PAYPAL, CASH, CARD]
 *                 example: "STRIPE"
 *               paymentMethodId:
 *                 type: string
 *                 description: Required for Stripe/PayPal payments (token or payment method ID)
 *                 example: "pm_1234567890"
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                   example: "Payment processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         orderId:
 *                           type: integer
 *                           example: 1
 *                         amount:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         method:
 *                           type: string
 *                           enum: [STRIPE, PAYPAL, CASH, CARD]
 *                           example: "STRIPE"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                           example: "COMPLETED"
 *                         transactionId:
 *                           type: string
 *                           example: "stripe_1234567890_abc123"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
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
 *       400:
 *         description: Invalid payment data or order not payable
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
 *                   example: "Order is not in a payable state"
 *       401:
 *         description: Authentication required
 *       402:
 *         description: Payment processing failed
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
 *                   example: "Payment declined by card issuer"
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 *       409:
 *         description: Payment already exists
 *       500:
 *         description: Server error
 */
router.post('/orders/:orderId/pay', authenticate, requireCustomer, processPayment);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment status by payment ID
 *     description: |
 *       Retrieve detailed payment information and status.
 *
 *       **Access Control:**
 *       - Customers: Can access payments for their own orders
 *       - Staff (Admin/Seller): Can access any payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         orderId:
 *                           type: integer
 *                           example: 1
 *                         amount:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         method:
 *                           type: string
 *                           enum: [STRIPE, PAYPAL, CASH, CARD]
 *                           example: "STRIPE"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                           example: "COMPLETED"
 *                         transactionId:
 *                           type: string
 *                           example: "stripe_1234567890_abc123"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         order:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             customerId:
 *                               type: integer
 *                               example: 1
 *                             status:
 *                               type: string
 *                               enum: [PENDING, PREPARING, READY, DELIVERED, CANCELLED]
 *                               example: "PREPARING"
 *                             total:
 *                               type: number
 *                               format: float
 *                               example: 25.99
 *       400:
 *         description: Invalid payment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getPaymentStatus);

/**
 * @swagger
 * /api/payments/order/{orderId}:
 *   get:
 *     summary: Get payment by order ID
 *     description: |
 *       Retrieve payment information for a specific order.
 *
 *       **Access Control:**
 *       - Customers: Can access payments for their own orders
 *       - Staff (Admin/Seller): Can access any payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
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
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         orderId:
 *                           type: integer
 *                           example: 1
 *                         amount:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         method:
 *                           type: string
 *                           enum: [STRIPE, PAYPAL, CASH, CARD]
 *                           example: "STRIPE"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                           example: "COMPLETED"
 *                         transactionId:
 *                           type: string
 *                           example: "stripe_1234567890_abc123"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid order ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found for this order
 *       500:
 *         description: Server error
 */
router.get('/order/:orderId', authenticate, getPaymentByOrderId);

/**
 * @swagger
 * /api/refunds/{id}:
 *   post:
 *     summary: Process refund for a payment
 *     description: |
 *       Process a refund for a completed payment.
 *
 *       **Access Control:** Staff only (Admin/Seller)
 *
 *       Supports full and partial refunds. Updates payment status and order status if fully refunded.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID to refund
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Refund amount (optional, defaults to full refund)
 *                 example: 12.99
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Customer requested cancellation"
 *     responses:
 *       200:
 *         description: Refund processed successfully
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
 *                   example: "Refund processed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         orderId:
 *                           type: integer
 *                           example: 1
 *                         amount:
 *                           type: number
 *                           format: float
 *                           example: 25.99
 *                         method:
 *                           type: string
 *                           enum: [STRIPE, PAYPAL, CASH, CARD]
 *                           example: "STRIPE"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *                           example: "REFUNDED"
 *                         transactionId:
 *                           type: string
 *                           example: "stripe_1234567890_abc123"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                     refund:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "refund_1234567890_abc123"
 *                         amount:
 *                           type: number
 *                           format: float
 *                           example: 12.99
 *                         reason:
 *                           type: string
 *                           example: "Customer requested cancellation"
 *                         processedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid refund data or payment not refundable
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
 *                   example: "Only completed payments can be refunded"
 *       401:
 *         description: Authentication required
 *       402:
 *         description: Refund processing failed
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment already refunded
 *       500:
 *         description: Server error
 */
router.post('/refunds/:id', authenticate, requireSeller, processRefund);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle payment gateway webhooks
 *     description: |
 *       Process webhook notifications from payment gateways.
 *
 *       **Access Control:** Public (used by payment gateways)
 *
 *       Handles payment success, failure, and refund notifications.
 *       Should be configured with webhook secret validation in production.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - data
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [payment.succeeded, payment.failed, refund.succeeded]
 *                 example: "payment.succeeded"
 *               data:
 *                 type: object
 *                 properties:
 *                   transactionId:
 *                     type: string
 *                     example: "stripe_1234567890_abc123"
 *                   amount:
 *                     type: number
 *                     format: float
 *                     example: 25.99
 *     responses:
 *       200:
 *         description: Webhook processed successfully
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
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook data
 *       500:
 *         description: Server error
 */
router.post('/webhook', handlePaymentWebhook);

export default router;