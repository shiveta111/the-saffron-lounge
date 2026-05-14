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
  defaultMeta: { service: 'timeslots-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/timeslots-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/timeslots.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createTimeslotSchema = Joi.object({
  date: Joi.date().iso().required(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  capacity: Joi.number().integer().min(1).optional().default(10),
});

const updateTimeslotSchema = Joi.object({
  date: Joi.date().iso().optional(),
  startTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('AVAILABLE', 'FULL', 'DISABLED').optional(),
});

const querySchema = Joi.object({
  date: Joi.date().iso().optional(),
  status: Joi.string().valid('AVAILABLE', 'FULL', 'DISABLED').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
});

// Controller functions
export const getAllTimeslots = async (req: Request, res: Response) => {
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

    const { date, status, startDate, endDate, limit } = value;

    // Build where clause
    const where: any = {};
    if (date) where.date = new Date(date);
    if (status && status !== '') where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get timeslots
    const timeslots = await (prisma as any).timeslot.findMany({
      where,
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
      take: limit,
    });

    // Add booking count to each timeslot
    const timeslotsWithCounts = timeslots.map((slot: any) => ({
      ...slot,
      bookedCount: slot.bookings?.length || 0,
      availableSpots: Math.max(0, slot.capacity - (slot.bookings?.length || 0)),
    }));

    logger.info('Timeslots retrieved successfully', {
      count: timeslots.length,
      filters: { date, status, startDate, endDate },
    });

    res.json({
      success: true,
      data: { timeslots: timeslotsWithCounts },
    });
  } catch (error) {
    logger.error('Failed to retrieve timeslots', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve timeslots',
    });
  }
};

export const getTimeslotById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeslot ID',
      });
    }

    const timeslot = await (prisma as any).timeslot.findUnique({
      where: { id: Number(id) },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!timeslot) {
      logger.warn('Timeslot not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Timeslot not found',
      });
    }

    const timeslotWithCount = {
      ...timeslot,
      bookedCount: timeslot.bookings?.length || 0,
      availableSpots: Math.max(0, timeslot.capacity - (timeslot.bookings?.length || 0)),
    };

    logger.info('Timeslot retrieved successfully', { id, date: timeslot.date, startTime: timeslot.startTime });

    res.json({
      success: true,
      data: { timeslot: timeslotWithCount },
    });
  } catch (error) {
    logger.error('Failed to retrieve timeslot', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve timeslot',
    });
  }
};

export const createTimeslot = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createTimeslotSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid timeslot data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid timeslot data',
        details: error.details?.[0]?.message,
      });
    }

    const { date, startTime, endTime, capacity } = value;

    // Validate time range
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time must be before end time',
      });
    }

    // Check for overlapping timeslots on the same date
    const overlappingSlot = await (prisma as any).timeslot.findFirst({
      where: {
        date: new Date(date),
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (overlappingSlot) {
      return res.status(409).json({
        success: false,
        error: 'Timeslot overlaps with existing slot',
      });
    }

    // Create the timeslot
    const timeslot = await (prisma as any).timeslot.create({
      data: {
        date: new Date(date),
        startTime,
        endTime,
        capacity,
        status: 'AVAILABLE',
      },
    });

    const timeslotWithCount = {
      ...timeslot,
      bookedCount: 0,
      availableSpots: capacity,
    };

    logger.info('Timeslot created successfully', {
      id: timeslot.id,
      date: timeslot.date,
      startTime: timeslot.startTime,
      endTime: timeslot.endTime,
      capacity: timeslot.capacity,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Timeslot created successfully',
      data: { timeslot: timeslotWithCount },
    });
  } catch (error) {
    logger.error('Failed to create timeslot', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create timeslot',
    });
  }
};

export const updateTimeslot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeslot ID',
      });
    }

    // Validate request body
    const { error, value } = updateTimeslotSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid timeslot update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid timeslot update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if timeslot exists
    const existingTimeslot = await (prisma as any).timeslot.findUnique({
      where: { id: Number(id) },
    });

    if (!existingTimeslot) {
      logger.warn('Timeslot not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Timeslot not found',
      });
    }

    // Prepare update data
    const updateData: any = { ...value };
    if (value.date) {
      updateData.date = new Date(value.date);
    }

    // Validate time range if both times are being updated
    if (updateData.startTime && updateData.endTime && updateData.startTime >= updateData.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time must be before end time',
      });
    }

    // Update the timeslot
    const updatedTimeslot = await (prisma as any).timeslot.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const timeslotWithCount = {
      ...updatedTimeslot,
      bookedCount: updatedTimeslot.bookings?.length || 0,
      availableSpots: Math.max(0, updatedTimeslot.capacity - (updatedTimeslot.bookings?.length || 0)),
    };

    logger.info('Timeslot updated successfully', {
      id,
      date: updatedTimeslot.date,
      startTime: updatedTimeslot.startTime,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Timeslot updated successfully',
      data: { timeslot: timeslotWithCount },
    });
  } catch (error) {
    logger.error('Failed to update timeslot', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update timeslot',
    });
  }
};

export const deleteTimeslot = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeslot ID',
      });
    }

    // Check if timeslot exists
    const existingTimeslot = await (prisma as any).timeslot.findUnique({
      where: { id: Number(id) },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
      },
    });

    if (!existingTimeslot) {
      logger.warn('Timeslot not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Timeslot not found',
      });
    }

    // Check if there are active bookings
    if (existingTimeslot.bookings && existingTimeslot.bookings.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete timeslot with active bookings',
        activeBookings: existingTimeslot.bookings.length,
      });
    }

    // Delete the timeslot
    await (prisma as any).timeslot.delete({
      where: { id: Number(id) },
    });

    logger.info('Timeslot deleted successfully', {
      id,
      date: existingTimeslot.date,
      startTime: existingTimeslot.startTime,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Timeslot deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete timeslot', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete timeslot',
    });
  }
};