import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { whatsappService } from '../services/whatsappService';
import { wsManager } from '../utils/websocket';
import { orderService } from '../services/orderService';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'orders-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/orders-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/orders.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createOrderSchema = Joi.object({
  customerName: Joi.string().min(2).max(255).required(),
  customerEmail: Joi.string().email().max(255).required(),
  customerPhone: Joi.string().min(10).max(20).required(),
  deliveryAddress: Joi.string().min(10).max(500).required(),
  deliveryNotes: Joi.string().max(1000).optional(),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'STRIPE', 'PAYPAL', 'PAY_IN_RESTAURANT', 'PAY_ON_ARRIVAL').required(),
  orderType: Joi.string().valid('DINE_IN', 'PICKUP', 'DELIVERY', 'ONLINE').optional().default('ONLINE'),
  tableId: Joi.number().integer().optional(),
  notes: Joi.string().max(1000).optional(),
  discountCode: Joi.string().max(50).optional(),
  deliveryFee: Joi.number().min(0).optional().default(0),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED').required(),
});

const querySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED').optional(),
  customerId: Joi.number().integer().optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  offset: Joi.number().integer().min(0).optional().default(0),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

// Controller functions
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate request body
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid order data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid order data',
        details: error.details?.[0]?.message,
      });
    }

    // Create order from cart using order service
    const order = await orderService.createOrderFromCart({
      userId,
      customerName: value.customerName,
      customerEmail: value.customerEmail,
      customerPhone: value.customerPhone,
      deliveryAddress: value.deliveryAddress,
      deliveryNotes: value.deliveryNotes,
      paymentMethod: value.paymentMethod,
      orderType: value.orderType,
      tableId: value.tableId,
      notes: value.notes || value.deliveryNotes,
      discountCode: value.discountCode,
      deliveryFee: value.deliveryFee,
    });

    logger.info('Order created successfully', {
      orderId: order.id,
      customerId: userId,
      total: order.total,
      itemCount: order.items.length,
    });

    // Send WhatsApp confirmation
    if (order.customer?.phone) {
      try {
        await whatsappService.sendOrderConfirmation(
          order.customer.phone,
          order.id,
          order.total
        );
      } catch (whatsappError) {
        logger.warn('Failed to send WhatsApp confirmation', { error: whatsappError });
        // Don't fail the order creation if WhatsApp fails
      }
    }

    // Broadcast order creation via WebSocket
    wsManager.broadcastToRoom('admin', 'ORDER_CREATED', {
      orderId: order.id,
      customerId: userId,
      total: order.total,
      status: 'PENDING',
      orderType: order.orderType,
    });

    wsManager.emitToUser(userId, 'ORDER_CREATED', {
      orderId: order.id,
      total: order.total,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  } catch (error: any) {
    logger.error('Failed to create order', { error: error.message, body: req.body });
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    // Get order using order service
    const order = await orderService.getOrderById(Number(id), userId, userRole);

    logger.info('Order retrieved successfully', { id, customerId: order.customerId });

    res.json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve order', { error: error.message, id: req.params.id });

    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (error.message === 'Access denied') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order',
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    // Validate request body
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid status update', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid status update',
        details: error.details?.[0]?.message,
      });
    }

    const { status } = value;

    // Check if user has permission to update status
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Only staff can update order status',
      });
    }

    // Update order status using order service
    const updatedOrder = await orderService.updateOrderStatus(Number(id), status, userId);

    logger.info('Order status updated successfully', {
      id,
      newStatus: status,
      updatedBy: userId,
    });

    // Send WhatsApp status update
    if (updatedOrder.customer?.phone) {
      try {
        await whatsappService.sendOrderStatusUpdate(
          updatedOrder.customer.phone,
          updatedOrder.id,
          status
        );
      } catch (whatsappError) {
        logger.warn('Failed to send WhatsApp status update', { error: whatsappError });
        // Don't fail the status update if WhatsApp fails
      }
    }

    // Broadcast status update via WebSocket
    wsManager.broadcastToRoom('admin', 'ORDER_STATUS_UPDATED', {
      orderId: updatedOrder.id,
      customerId: updatedOrder.customerId,
      status,
    });

    wsManager.emitToUser(updatedOrder.customerId, 'ORDER_STATUS_UPDATED', {
      orderId: updatedOrder.id,
      status,
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order: updatedOrder },
    });
  } catch (error: any) {
    logger.error('Failed to update order status', { error: error.message, id: req.params.id, body: req.body });

    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    if (error.message.includes('Cannot change status')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update order status',
    });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { status, customerId, limit, offset, startDate, endDate } = value;

    // Get orders using order service
    const orderParams: any = {
      userId,
      userRole,
      status,
      customerId,
      limit,
      offset,
    };

    if (startDate) orderParams.startDate = new Date(startDate);
    if (endDate) orderParams.endDate = new Date(endDate);

    const result = await orderService.getOrders(orderParams);

    logger.info('Orders retrieved successfully', {
      count: result.orders.length,
      total: result.total,
      filters: { status, customerId, startDate, endDate },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve orders', { error: error.message, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders',
    });
  }
};

export const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const userRole = (req.user as JWTPayload)?.role;

    // Check if user is admin or seller
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or seller role required.',
      });
    }

    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { status, customerId, limit, offset, startDate, endDate } = value;

    // Get all orders (admin view)
    const orderParams: any = {
      userRole: 'ADMIN', // Force admin view
      status,
      customerId,
      limit,
      offset,
    };

    if (startDate) orderParams.startDate = new Date(startDate);
    if (endDate) orderParams.endDate = new Date(endDate);

    const result = await orderService.getOrders(orderParams);

    logger.info('Admin orders retrieved successfully', {
      count: result.orders.length,
      total: result.total,
      filters: { status, customerId, startDate, endDate },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve admin orders', { error: error.message, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders',
    });
  }
};