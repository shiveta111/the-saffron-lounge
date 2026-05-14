import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'notifications-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/notifications-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/notifications.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createNotificationSchema = Joi.object({
  bookingId: Joi.number().integer().required(),
  type: Joi.string().valid('EMAIL', 'WHATSAPP').required(),
  message: Joi.string().min(1).max(1000).required(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  type: Joi.string().valid('EMAIL', 'WHATSAPP').optional(),
  status: Joi.string().valid('SENT', 'FAILED', 'PENDING').optional(),
  bookingId: Joi.number().integer().optional(),
});

// Controller functions
export const getAllNotifications = async (req: Request, res: Response) => {
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

    const { page, limit, type, status, bookingId } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (type && type !== '') where.type = type;
    if (status && status !== '') where.status = status;
    if (bookingId) where.bookingId = bookingId;

    // Non-admin users can only see their own notifications
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    // Get notifications
    const notifications = await (prisma as any).notification.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).notification.count({ where });

    logger.info('Notifications retrieved successfully', {
      count: notifications.length,
      total,
      page,
      limit,
      filters: { type, status, bookingId },
      userId,
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve notifications', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
    });
  }
};

export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    const notification = await (prisma as any).notification.findUnique({
      where: { id: Number(id) },
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      logger.warn('Notification not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Check if user can access this notification
    if (userRole !== 'ADMIN' && notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    logger.info('Notification retrieved successfully', { id, userId: notification.userId });

    res.json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    logger.error('Failed to retrieve notification', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification',
    });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid notification data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid notification data',
        details: error.details?.[0]?.message,
      });
    }

    const { bookingId, type, message } = value;

    // Check if booking exists
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Create the notification
    const notification = await (prisma as any).notification.create({
      data: {
        bookingId,
        userId: booking.userId,
        type,
        message,
        status: 'PENDING',
      },
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Notification created successfully', {
      id: notification.id,
      bookingId,
      userId: notification.userId,
      type: notification.type,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification },
    });
  } catch (error) {
    logger.error('Failed to create notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
    });
  }
};

export const updateNotificationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    // Validate status
    const validStatuses = ['SENT', 'FAILED', 'PENDING'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: SENT, FAILED, PENDING',
      });
    }

    // Check if notification exists
    const existingNotification = await (prisma as any).notification.findUnique({
      where: { id: Number(id) },
    });

    if (!existingNotification) {
      logger.warn('Notification not found for status update', { id });
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Only admins can update notification status
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can update notification status',
      });
    }

    // Update the notification
    const updatedNotification = await (prisma as any).notification.update({
      where: { id: Number(id) },
      data: {
        status,
        sentAt: status === 'SENT' ? new Date() : null,
      },
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info('Notification status updated successfully', {
      id,
      oldStatus: existingNotification.status,
      newStatus: status,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Notification status updated successfully',
      data: { notification: updatedNotification },
    });
  } catch (error) {
    logger.error('Failed to update notification status', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update notification status',
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    // Check if notification exists
    const existingNotification = await (prisma as any).notification.findUnique({
      where: { id: Number(id) },
    });

    if (!existingNotification) {
      logger.warn('Notification not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Only admins can delete notifications
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can delete notifications',
      });
    }

    // Delete the notification
    await (prisma as any).notification.delete({
      where: { id: Number(id) },
    });

    logger.info('Notification deleted successfully', {
      id,
      bookingId: existingNotification.bookingId,
      userId: existingNotification.userId,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete notification', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
    });
  }
};

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req.user as JWTPayload)?.role;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    // Check if notification exists
    const notification = await (prisma as any).notification.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
          },
        },
      },
    });

    if (!notification) {
      logger.warn('Notification not found for sending', { id });
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Only admins can send notifications
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can send notifications',
      });
    }

    // Here you would integrate with your email/SMS service
    // For now, we'll just mark it as sent
    const updatedNotification = await (prisma as any).notification.update({
      where: { id: Number(id) },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        booking: {
          select: {
            id: true,
            date: true,
            bookingType: true,
          },
        },
      },
    });

    logger.info('Notification sent successfully', {
      id,
      type: notification.type,
      userId: notification.userId,
      sentBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: { notification: updatedNotification },
    });
  } catch (error) {
    logger.error('Failed to send notification', { error, id: req.params.id });

    // Mark as failed
    try {
      await (prisma as any).notification.update({
        where: { id: Number(req.params.id) },
        data: { status: 'FAILED' },
      });
    } catch (updateError) {
      logger.error('Failed to update notification status to FAILED', { updateError });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
    });
  }
};