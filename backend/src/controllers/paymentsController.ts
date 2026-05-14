import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { paymentService } from '../services/paymentService';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payments-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/payments-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/payments.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const processPaymentSchema = Joi.object({
  paymentMethod: Joi.string().valid('STRIPE', 'PAYPAL', 'CASH', 'CARD').required(),
  paymentMethodId: Joi.string().when('paymentMethod', {
    is: Joi.valid('STRIPE', 'PAYPAL'),
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
});

const refundPaymentSchema = Joi.object({
  amount: Joi.number().min(0).optional(), // Optional, defaults to full refund
  reason: Joi.string().max(500).required(),
});

// Mock payment processing functions (replace with actual gateway integrations)
const processStripePayment = async (amount: number, paymentMethodId: string): Promise<{ success: boolean; transactionId: string; error?: string }> => {
  // Simulate Stripe payment processing
  logger.info('Processing Stripe payment', { amount, paymentMethodId });

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1;

  if (success) {
    return {
      success: true,
      transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      transactionId: '',
      error: 'Payment declined by card issuer',
    };
  }
};

const processPayPalPayment = async (amount: number, paymentMethodId: string): Promise<{ success: boolean; transactionId: string; error?: string }> => {
  // Simulate PayPal payment processing
  logger.info('Processing PayPal payment', { amount, paymentMethodId });

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Simulate success/failure (85% success rate)
  const success = Math.random() > 0.15;

  if (success) {
    return {
      success: true,
      transactionId: `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      transactionId: '',
      error: 'PayPal payment failed',
    };
  }
};

const processRefundViaGateway = async (paymentMethod: string, transactionId: string, amount: number): Promise<{ success: boolean; refundId: string; error?: string }> => {
  // Simulate refund processing
  logger.info('Processing refund', { paymentMethod, transactionId, amount });

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Simulate success/failure (95% success rate)
  const success = Math.random() > 0.05;

  if (success) {
    return {
      success: true,
      refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  } else {
    return {
      success: false,
      refundId: '',
      error: 'Refund processing failed',
    };
  }
};

// Controller functions
export const processPayment = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = (req.user as JWTPayload)?.userId;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    // Validate request body
    const { error, value } = processPaymentSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid payment data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        details: error.details?.[0]?.message,
      });
    }

    const { paymentMethod, paymentMethodId } = value;

    // Find the order
    const order = await (prisma as any).order.findUnique({
      where: { id: Number(orderId) },
      include: {
        customer: true,
        payment: true,
      },
    });

    if (!order) {
      logger.warn('Order not found for payment', { orderId });
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Check if user can access this order
    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if order is in correct status for payment
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Order is not in a payable state',
      });
    }

    // Check if payment already exists
    if (order.payment) {
      return res.status(409).json({
        success: false,
        error: 'Payment already exists for this order',
      });
    }

    // Process payment based on method
    let paymentResult;
    try {
      switch (paymentMethod) {
        case 'STRIPE':
          if (!paymentMethodId) {
            throw new Error('Payment method ID required for Stripe');
          }
          paymentResult = await processStripePayment(order.total, paymentMethodId);
          break;
        case 'PAYPAL':
          if (!paymentMethodId) {
            throw new Error('Payment method ID required for PayPal');
          }
          paymentResult = await processPayPalPayment(order.total, paymentMethodId);
          break;
        case 'CASH':
        case 'CARD':
          // For cash/card payments, assume success (would be handled by POS system)
          paymentResult = {
            success: true,
            transactionId: `${paymentMethod.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      if (!paymentResult.success) {
        // Create failed payment record
        await (prisma as any).payment.create({
          data: {
            orderId: Number(orderId),
            amount: order.total,
            method: paymentMethod,
            status: 'FAILED',
            transactionId: paymentResult.transactionId || null,
          },
        });

        logger.warn('Payment processing failed', {
          orderId,
          paymentMethod,
          error: paymentResult.error,
        });

        return res.status(402).json({
          success: false,
          error: paymentResult.error || 'Payment processing failed',
        });
      }

      // Create successful payment record
      const payment = await (prisma as any).payment.create({
        data: {
          orderId: Number(orderId),
          amount: order.total,
          method: paymentMethod,
          status: 'COMPLETED',
          transactionId: paymentResult.transactionId,
        },
      });

      // Update order status to preparing
      await (prisma as any).order.update({
        where: { id: Number(orderId) },
        data: { status: 'PREPARING' },
      });

      logger.info('Payment processed successfully', {
        orderId,
        paymentId: payment.id,
        paymentMethod,
        amount: order.total,
        transactionId: paymentResult.transactionId,
      });

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          payment,
          order: {
            id: order.id,
            status: 'PREPARING',
            total: order.total,
          },
        },
      });
    } catch (processingError: any) {
      logger.error('Payment processing error', { error: processingError.message, orderId, paymentMethod });

      // Create failed payment record
      await (prisma as any).payment.create({
        data: {
          orderId: Number(orderId),
          amount: order.total,
          method: paymentMethod,
          status: 'FAILED',
        },
      });

      res.status(500).json({
        success: false,
        error: processingError.message || 'Payment processing failed',
      });
    }
  } catch (error: any) {
    logger.error('Failed to process payment', { error: error.message, orderId: req.params.orderId });
    res.status(500).json({
      success: false,
      error: 'Failed to process payment',
    });
  }
};

export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID',
      });
    }

    // Find the payment
    const payment = await (prisma as any).payment.findUnique({
      where: { id: Number(id) },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      logger.warn('Payment not found', { paymentId: id });
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Check if user can access this payment
    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && payment.order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    logger.info('Payment status retrieved successfully', { paymentId: id, status: payment.status });

    res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    logger.error('Failed to retrieve payment status', { error, paymentId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment status',
    });
  }
};

export const processRefund = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID',
      });
    }

    // Validate request body
    const { error, value } = refundPaymentSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid refund data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid refund data',
        details: error.details?.[0]?.message,
      });
    }

    const { amount, reason } = value;

    // Check if user has permission to process refunds
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Only staff can process refunds',
      });
    }

    // Find the payment
    const payment = await (prisma as any).payment.findUnique({
      where: { id: Number(id) },
      include: {
        order: true,
      },
    });

    if (!payment) {
      logger.warn('Payment not found for refund', { paymentId: id });
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Check if payment can be refunded
    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Only completed payments can be refunded',
      });
    }

    // Check if already refunded
    if (payment.status === 'REFUNDED') {
      return res.status(409).json({
        success: false,
        error: 'Payment has already been refunded',
      });
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        error: 'Refund amount cannot exceed payment amount',
      });
    }

    // Process refund
    try {
      const refundResult = await processRefundViaGateway(payment.method, payment.transactionId!, refundAmount);

      if (!refundResult.success) {
        logger.warn('Refund processing failed', {
          paymentId: id,
          error: refundResult.error,
        });

        return res.status(402).json({
          success: false,
          error: refundResult.error || 'Refund processing failed',
        });
      }

      // Update payment status
      const updatedPayment = await (prisma as any).payment.update({
        where: { id: Number(id) },
        data: {
          status: refundAmount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      // If full refund, update order status
      if (refundAmount === payment.amount) {
        await (prisma as any).order.update({
          where: { id: payment.orderId },
          data: { status: 'CANCELLED' },
        });
      }

      logger.info('Refund processed successfully', {
        paymentId: id,
        refundId: refundResult.refundId,
        amount: refundAmount,
        reason,
        processedBy: (req.user as JWTPayload)?.userId,
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          payment: updatedPayment,
          refund: {
            id: refundResult.refundId,
            amount: refundAmount,
            reason,
            processedAt: new Date(),
          },
        },
      });
    } catch (processingError: any) {
      logger.error('Refund processing error', { error: processingError.message, paymentId: id });

      res.status(500).json({
        success: false,
        error: processingError.message || 'Refund processing failed',
      });
    }
  } catch (error: any) {
    logger.error('Failed to process refund', { error: error.message, paymentId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to process refund',
    });
  }
};

export const getPaymentByOrderId = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    // Find the payment for this order
    const payment = await (prisma as any).payment.findUnique({
      where: { orderId: Number(orderId) },
    });

    if (!payment) {
      logger.warn('Payment not found for order', { orderId });
      return res.status(404).json({
        success: false,
        error: 'Payment not found for this order',
      });
    }

    // Check if user can access this payment
    const order = await (prisma as any).order.findUnique({
      where: { id: Number(orderId) },
      select: { customerId: true },
    });

    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && order?.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    logger.info('Payment retrieved by order ID successfully', { orderId, paymentId: payment.id });

    res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    logger.error('Failed to retrieve payment by order ID', { error, orderId: req.params.orderId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment',
    });
  }
};

// Webhook handler for payment gateway notifications
export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    logger.info('Payment webhook received', { type, data: JSON.stringify(data) });

    // Handle different webhook types
    switch (type) {
      case 'payment.succeeded':
        // Update payment status to completed
        await (prisma as any).payment.updateMany({
          where: { transactionId: data.transactionId },
          data: { status: 'COMPLETED' },
        });
        break;

      case 'payment.failed':
        // Update payment status to failed
        await (prisma as any).payment.updateMany({
          where: { transactionId: data.transactionId },
          data: { status: 'FAILED' },
        });
        break;

      case 'refund.succeeded':
        // Update payment status to refunded
        await (prisma as any).payment.updateMany({
          where: { transactionId: data.originalTransactionId },
          data: { status: 'REFUNDED' },
        });
        break;

      default:
        logger.warn('Unknown webhook type', { type });
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    logger.error('Failed to process payment webhook', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
};

// Validation schema for creating payment
const createPaymentSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string().valid('CASH', 'CARD', 'STRIPE', 'PAYPAL').required(),
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').optional(),
  transactionId: Joi.string().optional(),
});

// Validation schema for updating payment status
const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').required(),
  transactionId: Joi.string().optional(),
});

/**
 * Create a payment record
 * POST /api/payments
 */
export const createPaymentRecord = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Validate request body
    const { error, value } = createPaymentSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid payment data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid payment data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if user can create payment for this order
    const order = await (prisma as any).order.findUnique({
      where: { id: value.orderId },
      select: { customerId: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Only order owner or admin can create payment
    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Create payment using service
    const payment = await paymentService.createPayment(value);

    logger.info('Payment record created', {
      paymentId: payment.id,
      orderId: value.orderId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: { payment },
    });
  } catch (error: any) {
    logger.error('Failed to create payment record', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment record',
    });
  }
};

/**
 * Update payment status
 * PATCH /api/payments/:id/status
 */
export const updatePaymentStatusEndpoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID',
      });
    }

    // Only admin/seller can update payment status
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Only staff can update payment status',
      });
    }

    // Validate request body
    const { error, value } = updatePaymentStatusSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid status update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid status update data',
        details: error.details?.[0]?.message,
      });
    }

    // Update payment status using service
    const updatedPayment = await paymentService.updatePaymentStatus(
      Number(id),
      value,
      userId
    );

    logger.info('Payment status updated', {
      paymentId: id,
      newStatus: value.status,
      updatedBy: userId,
    });

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: { payment: updatedPayment },
    });
  } catch (error: any) {
    logger.error('Failed to update payment status', { error: error.message, paymentId: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update payment status',
    });
  }
};

/**
 * Get all payments (admin only)
 * GET /api/payments
 */
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const userRole = (req.user as JWTPayload)?.role;

    // Only admin/seller can view all payments
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const {
      status,
      method,
      customerId,
      limit,
      offset,
      startDate,
      endDate,
    } = req.query;

    const filters: any = {
      status: status as string,
      method: method as string,
      customerId: customerId ? Number(customerId) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const result = await paymentService.getPayments(filters);

    logger.info('All payments retrieved', {
      count: result.payments.length,
      total: result.total,
      filters,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to get all payments', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payments',
    });
  }
};