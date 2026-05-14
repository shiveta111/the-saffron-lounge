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
  defaultMeta: { service: 'timeslot-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/timeslot-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/timeslot.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createTimeslotSchema = Joi.object({
  date: Joi.date().required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  capacity: Joi.number().integer().min(1).optional().default(10),
});

const updateTimeslotSchema = Joi.object({
  date: Joi.date().optional(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  status: Joi.string().valid('AVAILABLE', 'FULL', 'DISABLED').optional(),
});

const querySchema = Joi.object({
  date: Joi.date().optional(),
  date_from: Joi.date().optional(),
  date_to: Joi.date().optional(),
  status: Joi.string().valid('AVAILABLE', 'FULL', 'DISABLED').optional(),
  sort_by: Joi.string().valid('date', 'startTime', 'createdAt').optional().default('date'),
  order: Joi.string().valid('asc', 'desc').optional().default('asc'),
});

// Helper function to check for overlapping timeslots
const checkTimeslotOverlap = async (date: Date, startTime: string, endTime: string, excludeId?: number) => {
  const where: any = {
    date,
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
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const overlappingSlots = await (prisma as any).timeslot.findMany({
    where,
  });

  return overlappingSlots.length > 0;
};

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

    const { date, date_from, date_to, status, sort_by, order } = value;

    // Build where clause
    const where: any = {};

    if (date) {
      where.date = date;
    } else if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    if (status) where.status = status;

    // Get timeslots
    const timeslots = await (prisma as any).timeslot.findMany({
      where,
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Add availability info
    const timeslotsWithAvailability = timeslots.map((slot: any) => ({
      ...slot,
      availableSpots: slot.capacity - slot.bookedCount,
      isAvailable: slot.status === 'AVAILABLE' && slot.bookedCount < slot.capacity,
      activeBookings: slot.bookings.filter((b: any) => b.status !== 'CANCELLED').length,
    }));

    logger.info('Timeslots retrieved successfully', {
      count: timeslots.length,
      filters: { date, date_from, date_to, status },
    });

    res.json({
      success: true,
      data: { timeslots: timeslotsWithAvailability },
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
            bookingType: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
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

    // Add availability info
    const timeslotWithAvailability = {
      ...timeslot,
      availableSpots: timeslot.capacity - timeslot.bookedCount,
      isAvailable: timeslot.status === 'AVAILABLE' && timeslot.bookedCount < timeslot.capacity,
      activeBookings: timeslot.bookings.filter((b: any) => b.status !== 'CANCELLED').length,
    };

    logger.info('Timeslot retrieved successfully', { id });

    res.json({
      success: true,
      data: { timeslot: timeslotWithAvailability },
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

    // Validate time logic
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time',
      });
    }

    // Check for overlapping timeslots
    const hasOverlap = await checkTimeslotOverlap(date, startTime, endTime);
    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        error: 'Timeslot overlaps with existing slots',
      });
    }

    // Create the timeslot
    const timeslot = await (prisma as any).timeslot.create({
      data: {
        date,
        startTime,
        endTime,
        capacity,
      },
    });

    logger.info('Timeslot created successfully', {
      id: timeslot.id,
      date: timeslot.date,
      startTime: timeslot.startTime,
      endTime: timeslot.endTime,
      capacity: timeslot.capacity,
    });

    res.status(201).json({
      success: true,
      message: 'Timeslot created successfully',
      data: { timeslot },
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
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      },
    });

    if (!existingTimeslot) {
      logger.warn('Timeslot not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Timeslot not found',
      });
    }

    // Check for overlapping timeslots if date/time is being updated
    if ((value.date || value.startTime || value.endTime) &&
        (value.date !== existingTimeslot.date ||
         value.startTime !== existingTimeslot.startTime ||
         value.endTime !== existingTimeslot.endTime)) {

      const checkDate = value.date || existingTimeslot.date;
      const checkStartTime = value.startTime || existingTimeslot.startTime;
      const checkEndTime = value.endTime || existingTimeslot.endTime;

      // Validate time logic
      if (checkStartTime >= checkEndTime) {
        return res.status(400).json({
          success: false,
          error: 'End time must be after start time',
        });
      }

      const hasOverlap = await checkTimeslotOverlap(checkDate, checkStartTime, checkEndTime, Number(id));
      if (hasOverlap) {
        return res.status(409).json({
          success: false,
          error: 'Updated timeslot would overlap with existing slots',
        });
      }
    }

    // If reducing capacity, check if it would affect existing bookings
    if (value.capacity && value.capacity < existingTimeslot.bookedCount) {
      return res.status(409).json({
        success: false,
        error: `Cannot reduce capacity below current bookings (${existingTimeslot.bookedCount})`,
      });
    }

    // Update the timeslot
    const updatedTimeslot = await (prisma as any).timeslot.update({
      where: { id: Number(id) },
      data: value,
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Update status based on capacity and bookings
    let newStatus = updatedTimeslot.status;
    if (updatedTimeslot.bookedCount >= updatedTimeslot.capacity) {
      newStatus = 'FULL';
    } else if (updatedTimeslot.status === 'FULL') {
      newStatus = 'AVAILABLE';
    }

    if (newStatus !== updatedTimeslot.status) {
      await (prisma as any).timeslot.update({
        where: { id: Number(id) },
        data: { status: newStatus },
      });
      updatedTimeslot.status = newStatus;
    }

    logger.info('Timeslot updated successfully', {
      id,
      changes: Object.keys(value),
      newStatus,
    });

    res.json({
      success: true,
      message: 'Timeslot updated successfully',
      data: { timeslot: updatedTimeslot },
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
            status: { in: ['PENDING', 'CONFIRMED'] },
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
    if (existingTimeslot.bookings.length > 0) {
      // Cancel all pending/confirmed bookings
      await (prisma as any).booking.updateMany({
        where: {
          timeSlotId: Number(id),
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED' },
      });

      logger.info('Cancelled bookings due to timeslot deletion', {
        timeslotId: id,
        cancelledBookings: existingTimeslot.bookings.length,
      });

      // TODO: Send notifications to affected users
      // await notifyCancelledBookings(existingTimeslot.bookings);
    }

    // Delete the timeslot
    await (prisma as any).timeslot.delete({
      where: { id: Number(id) },
    });

    logger.info('Timeslot deleted successfully', {
      id,
      cancelledBookings: existingTimeslot.bookings.length,
    });

    res.json({
      success: true,
      message: 'Timeslot deleted successfully',
      data: {
        cancelledBookings: existingTimeslot.bookings.length,
      },
    });
  } catch (error) {
    logger.error('Failed to delete timeslot', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete timeslot',
    });
  }
};