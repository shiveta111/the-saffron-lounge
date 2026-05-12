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
  defaultMeta: { service: 'notification-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/notification-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/notification.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const sendNotificationSchema = Joi.object({
  bookingId: Joi.number().integer().required(),
  userId: Joi.number().integer().required(),
  type: Joi.string().valid('EMAIL', 'WHATSAPP').required(),
  message: Joi.string().min(1).required(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  type: Joi.string().valid('EMAIL', 'WHATSAPP').optional(),
  status: Joi.string().valid('SENT', 'FAILED', 'PENDING').optional(),
  booking_id: Joi.number().integer().optional(),
  sort_by: Joi.string().valid('createdAt', 'sentAt').optional().default('createdAt'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Mock functions for external services (replace with actual implementations)
const sendEmail = async (to: string, subject: string, message: string) => {
  // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
  logger.info('Email sent (mock)', { to, subject });
  return { success: true, messageId: `email_${Date.now()}` };
};

const sendWhatsApp = async (to: string, message: string) => {
  // TODO: Integrate with WhatsApp Business API or Twilio
  logger.info('WhatsApp message sent (mock)', { to });
  return { success: true, messageId: `whatsapp_${Date.now()}` };
};

// Controller functions
export const getAllNotifications = async (req: Request, res: Response) => {
  try {
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

    const { page, limit, type, status, booking_id, sort_by, order } = value;
    const offset = (page - 1) * limit;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Build where clause
    const where: any = {};

    // If not admin, only show user's own notifications
    if (userRole !== 'ADMIN') {
      where.userId = userId;
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (booking_id) where.bookingId = booking_id;

    // Get notifications with pagination
    const notifications = await (prisma as any).notification.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingType: true,
            status: true,
            date: true,
            timeSlot: {
              select: {
                startTime: true,
                endTime: true,
                date: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { [sort_by]: order },
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
      userId,
      filters: { type, status, booking_id },
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

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
      });
    }

    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    const notification = await (prisma as any).notification.findUnique({
      where: { id: Number(id) },
      include: {
        booking: {
          select: {
            id: true,
            bookingType: true,
            status: true,
            date: true,
            timeSlot: {
              select: {
                startTime: true,
                endTime: true,
                date: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
        error: 'Access denied. You can only view your own notifications.',
      });
    }

    logger.info('Notification retrieved successfully', { id, userId });

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

export const sendNotification = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = sendNotificationSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid notification data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid notification data',
        details: error.details?.[0]?.message,
      });
    }

    const { bookingId, userId, type, message } = value;

    // Validate booking exists
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'User does not match booking owner',
      });
    }

    let sendResult;
    let notificationStatus: 'SENT' | 'FAILED' | 'PENDING' = 'SENT';
    let sentAt: Date | undefined = new Date();

    try {
      if (type === 'EMAIL') {
        const subject = `Booking Update - ${booking.bookingType}`;
        sendResult = await sendEmail(booking.user.email, subject, message);
      } else if (type === 'WHATSAPP') {
        sendResult = await sendWhatsApp(booking.user.phone, message);
      }
    } catch (sendError) {
      logger.error('Failed to send notification', { error: sendError, bookingId, userId, type });
      notificationStatus = 'FAILED';
      sentAt = undefined;
    }

    // Create notification record
    const notification = await (prisma as any).notification.create({
      data: {
        bookingId,
        userId,
        type,
        message,
        sentAt,
        status: notificationStatus,
      },
      include: {
        booking: {
          select: {
            id: true,
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

    logger.info('Notification sent', {
      id: notification.id,
      bookingId,
      userId,
      type,
      status: notificationStatus,
    });

    res.status(201).json({
      success: true,
      message: `Notification ${notificationStatus.toLowerCase()} successfully`,
      data: {
        notification,
        sendResult: sendResult || null,
      },
    });
  } catch (error) {
    logger.error('Failed to send notification', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
    });
  }
};

// Helper functions for automated notifications
export const sendBookingConfirmation = async (booking: any) => {
  const message = `
    🎉 Booking Confirmed!

    Booking ID: ${booking.id}
    Type: ${booking.bookingType}
    Date: ${booking.date.toDateString()}
    Time: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}
    ${booking.bookingType === 'DELIVERY' ? `Address: ${booking.address}` : ''}

    Thank you for choosing our service!
  `.trim();

  await sendNotification({
    body: {
      bookingId: booking.id,
      userId: booking.userId,
      type: 'EMAIL',
      message,
    },
  } as Request, {} as Response);
};

export const sendBookingUpdate = async (booking: any) => {
  const message = `
    📅 Booking Updated

    Your booking (ID: ${booking.id}) has been updated.
    New Date: ${booking.date.toDateString()}
    New Time: ${booking.timeSlot.startTime} - ${booking.timeSlot.endTime}

    Please contact us if you have any questions.
  `.trim();

  await sendNotification({
    body: {
      bookingId: booking.id,
      userId: booking.userId,
      type: 'EMAIL',
      message,
    },
  } as Request, {} as Response);
};

export const sendBookingCancellation = async (booking: any) => {
  const message = `
    ❌ Booking Cancelled

    Your booking (ID: ${booking.id}) has been cancelled.
    ${booking.paymentType === 'ONLINE' ? 'Refund will be processed within 3-5 business days.' : ''}

    We're sorry for any inconvenience.
  `.trim();

  await sendNotification({
    body: {
      bookingId: booking.id,
      userId: booking.userId,
      type: 'EMAIL',
      message,
    },
  } as Request, {} as Response);
};