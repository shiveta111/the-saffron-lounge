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
  defaultMeta: { service: 'newsletter-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/newsletter-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/newsletter.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const subscribeSchema = Joi.object({
  email: Joi.string().email().required(),
});

const updateSubscriberSchema = Joi.object({
  status: Joi.string().valid('active', 'unsubscribed').required(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('active', 'unsubscribed').optional(),
  sort_by: Joi.string().valid('created_at', 'email').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Controller functions
export const subscribe = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = subscribeSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid subscription data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        details: error.details?.[0]?.message,
      });
    }

    const { email } = value;

    // Check if email already exists
    const existingSubscriber = await (prisma as any).subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(409).json({
          success: false,
          error: 'Email is already subscribed to our newsletter',
        });
      } else {
        // Reactivate subscription
        const updatedSubscriber = await (prisma as any).subscriber.update({
          where: { email },
          data: { status: 'active' },
        });

        logger.info('Newsletter subscription reactivated', { email });

        return res.json({
          success: true,
          message: 'Welcome back! Your newsletter subscription has been reactivated.',
          data: { subscriber: updatedSubscriber },
        });
      }
    }

    // Create new subscription
    const subscriber = await (prisma as any).subscriber.create({
      data: { email },
    });

    logger.info('New newsletter subscription', { email, id: subscriber.id });

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!',
      data: { subscriber },
    });
  } catch (error) {
    logger.error('Failed to subscribe to newsletter', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to newsletter',
    });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !Joi.string().email().validate(email).error) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required',
      });
    }

    // Check if subscriber exists
    const existingSubscriber = await (prisma as any).subscriber.findUnique({
      where: { email },
    });

    if (!existingSubscriber) {
      return res.status(404).json({
        success: false,
        error: 'Email not found in our subscriber list',
      });
    }

    if (existingSubscriber.status === 'unsubscribed') {
      return res.json({
        success: true,
        message: 'You are already unsubscribed from our newsletter',
      });
    }

    // Update status to unsubscribed
    const updatedSubscriber = await (prisma as any).subscriber.update({
      where: { email },
      data: { status: 'unsubscribed' },
    });

    logger.info('Newsletter unsubscription', { email });

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter',
      data: { subscriber: updatedSubscriber },
    });
  } catch (error) {
    logger.error('Failed to unsubscribe from newsletter', { error, email: req.body.email });
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from newsletter',
    });
  }
};

export const getAllSubscribers = async (req: Request, res: Response) => {
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

    const { page, limit, status, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;

    // Get subscribers with pagination
    const subscribers = await (prisma as any).subscriber.findMany({
      where,
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).subscriber.count({ where });

    logger.info('Subscribers retrieved successfully', {
      count: subscribers.length,
      total,
      page,
      limit,
      status,
    });

    res.json({
      success: true,
      data: {
        subscribers,
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
    logger.error('Failed to retrieve subscribers', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscribers',
    });
  }
};

export const updateSubscriber = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscriber ID',
      });
    }

    // Validate request body
    const { error, value } = updateSubscriberSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid subscriber update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid subscriber update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if subscriber exists
    const existingSubscriber = await (prisma as any).subscriber.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSubscriber) {
      logger.warn('Subscriber not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found',
      });
    }

    // Update the subscriber
    const updatedSubscriber = await (prisma as any).subscriber.update({
      where: { id: Number(id) },
      data: value,
    });

    logger.info('Subscriber updated successfully', {
      id,
      email: updatedSubscriber.email,
      status: updatedSubscriber.status,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Subscriber updated successfully',
      data: { subscriber: updatedSubscriber },
    });
  } catch (error) {
    logger.error('Failed to update subscriber', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update subscriber',
    });
  }
};

export const deleteSubscriber = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscriber ID',
      });
    }

    // Check if subscriber exists
    const existingSubscriber = await (prisma as any).subscriber.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSubscriber) {
      logger.warn('Subscriber not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Subscriber not found',
      });
    }

    // Delete the subscriber
    await (prisma as any).subscriber.delete({
      where: { id: Number(id) },
    });

    logger.info('Subscriber deleted successfully', {
      id,
      email: existingSubscriber.email,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Subscriber deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete subscriber', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscriber',
    });
  }
};