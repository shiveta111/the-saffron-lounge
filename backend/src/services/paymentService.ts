import * as winston from 'winston';
import prisma from '../config/prisma';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payment-service' },
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

export interface CreatePaymentData {
  orderId: number;
  amount: number;
  method: 'CASH' | 'CARD' | 'STRIPE' | 'PAYPAL';
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
}

export interface UpdatePaymentStatusData {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
}

export class PaymentService {
  /**
   * Create a payment record
   * @param paymentData - Payment creation data
   * @returns Created payment
   */
  async createPayment(paymentData: CreatePaymentData): Promise<any> {
    try {
      // Validate payment method
      const validMethods = ['CASH', 'CARD', 'STRIPE', 'PAYPAL'];
      if (!validMethods.includes(paymentData.method)) {
        throw new Error(`Invalid payment method: ${paymentData.method}`);
      }

      // Check if order exists
      const order = await prisma.order.findUnique({
        where: { id: paymentData.orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if payment already exists for this order
      const existingPayment = await prisma.payment.findUnique({
        where: { orderId: paymentData.orderId },
      });

      if (existingPayment) {
        throw new Error('Payment already exists for this order');
      }

      // Create payment
      const payment = await prisma.payment.create({
        data: {
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          method: paymentData.method,
          status: paymentData.status || 'PENDING',
          transactionId: paymentData.transactionId || null,
        },
      });

      logger.info('Payment created', {
        paymentId: payment.id,
        orderId: paymentData.orderId,
        method: paymentData.method,
        amount: paymentData.amount,
        status: payment.status,
      });

      return payment;
    } catch (error) {
      logger.error('Failed to create payment', { error, paymentData });
      throw error;
    }
  }

  /**
   * Update payment status
   * @param paymentId - Payment ID
   * @param updateData - Status update data
   * @param userId - User ID (for logging)
   * @returns Updated payment
   */
  async updatePaymentStatus(
    paymentId: number,
    updateData: UpdatePaymentStatusData,
    userId?: number
  ): Promise<any> {
    try {
      // Get current payment
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // If already in the target state, return success without updating
      if (payment.status === updateData.status) {
        logger.info('Payment already in target status', {
          paymentId,
          status: payment.status,
        });
        return payment;
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        PENDING: ['COMPLETED', 'FAILED'],
        COMPLETED: ['REFUNDED'],
        FAILED: ['PENDING'], // Allow retry
        REFUNDED: [],
      };

      const allowedTransitions = validTransitions[payment.status] || [];
      if (!allowedTransitions.includes(updateData.status)) {
        throw new Error(`Cannot change payment status from ${payment.status} to ${updateData.status}`);
      }

      // Update payment
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: updateData.status,
          transactionId: updateData.transactionId || payment.transactionId,
        },
        include: {
          order: true,
        },
      });

      // If payment is completed and order is still pending, update order status
      if (updateData.status === 'COMPLETED' && payment.order.status === 'PENDING') {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'PREPARING' },
        });
      }

      logger.info('Payment status updated', {
        paymentId,
        oldStatus: payment.status,
        newStatus: updateData.status,
        updatedBy: userId,
      });

      return updatedPayment;
    } catch (error) {
      logger.error('Failed to update payment status', { error, paymentId, updateData });
      throw error;
    }
  }

  /**
   * Get payment by ID
   * @param paymentId - Payment ID
   * @returns Payment with order details
   */
  async getPaymentById(paymentId: number): Promise<any> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return payment;
    } catch (error) {
      logger.error('Failed to get payment by ID', { error, paymentId });
      throw error;
    }
  }

  /**
   * Get payment by order ID
   * @param orderId - Order ID
   * @returns Payment for the order
   */
  async getPaymentByOrderId(orderId: number): Promise<any> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { orderId },
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error('Payment not found for this order');
      }

      return payment;
    } catch (error) {
      logger.error('Failed to get payment by order ID', { error, orderId });
      throw error;
    }
  }

  /**
   * Get all payments with filtering
   * @param filters - Filter options
   * @returns Payments with pagination
   */
  async getPayments(filters: {
    status?: string;
    method?: string;
    customerId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ payments: any[]; total: number; pagination: any }> {
    try {
      const {
        status,
        method,
        customerId,
        limit = 20,
        offset = 0,
        startDate,
        endDate,
      } = filters;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (method) where.method = method;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Filter by customer if specified
      if (customerId) {
        where.order = {
          customerId,
        };
      }

      // Get payments
      const payments = await prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              customerId: true,
              status: true,
              total: true,
              createdAt: true,
              customer: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      // Get total count
      const total = await prisma.payment.count({ where });

      logger.info('Payments retrieved', {
        count: payments.length,
        total,
        filters,
      });

      return {
        payments,
        total,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      logger.error('Failed to get payments', { error, filters });
      throw error;
    }
  }

  /**
   * Validate payment method
   * @param method - Payment method
   * @returns Validation result
   */
  validatePaymentMethod(method: string): { valid: boolean; error?: string } {
    const validMethods = ['CASH', 'CARD', 'STRIPE', 'PAYPAL'];

    if (!validMethods.includes(method)) {
      return {
        valid: false,
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get payment statistics
   * @param customerId - Optional customer ID for customer-specific stats
   * @returns Payment statistics
   */
  async getPaymentStatistics(customerId?: number): Promise<any> {
    try {
      const where: any = customerId ? { order: { customerId } } : {};

      const [
        totalPayments,
        pendingPayments,
        completedPayments,
        failedPayments,
        refundedPayments,
        totalRevenue,
        cashPayments,
        cardPayments,
        onlinePayments,
      ] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.count({ where: { ...where, status: 'PENDING' } }),
        prisma.payment.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.payment.count({ where: { ...where, status: 'FAILED' } }),
        prisma.payment.count({ where: { ...where, status: 'REFUNDED' } }),
        prisma.payment.aggregate({
          where: { ...where, status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { ...where, method: 'CASH' } }),
        prisma.payment.count({ where: { ...where, method: 'CARD' } }),
        prisma.payment.count({
          where: {
            ...where,
            method: { in: ['STRIPE', 'PAYPAL'] },
          },
        }),
      ]);

      return {
        totalPayments,
        pendingPayments,
        completedPayments,
        failedPayments,
        refundedPayments,
        totalRevenue: totalRevenue._sum.amount || 0,
        paymentMethods: {
          cash: cashPayments,
          card: cardPayments,
          online: onlinePayments,
        },
      };
    } catch (error) {
      logger.error('Failed to get payment statistics', { error, customerId });
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
