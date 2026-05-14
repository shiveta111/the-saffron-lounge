import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { reservationService } from '../services/reservationService';
import { JWTPayload } from '../utils/jwt';
import { wsManager } from '../utils/websocket';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'reservations-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/reservations-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/reservations.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const BUSINESS_TIMEZONE = process.env.RESERVATION_TIMEZONE || 'Europe/Madrid';

const getActiveBusinessTimezone = () => {
  try {
    // Validate timezone once on startup; fallback avoids runtime failures on misconfigured env.
    new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIMEZONE });
    return BUSINESS_TIMEZONE;
  } catch {
    logger.warn('Invalid RESERVATION_TIMEZONE. Falling back to UTC.', {
      configuredTimezone: BUSINESS_TIMEZONE,
      fallbackTimezone: 'UTC',
    });
    return 'UTC';
  }
};

const ACTIVE_BUSINESS_TIMEZONE = getActiveBusinessTimezone();

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

const getBusinessNow = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACTIVE_BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
};

const isFutureReservationDateTime = (reservationDate: string, reservationTime: string) => {
  const businessNow = getBusinessNow();

  if (reservationDate > businessNow.date) return true;
  if (reservationDate < businessNow.date) return false;

  return reservationTime > businessNow.time;
};

// Validation schemas
const getAvailableSlotsSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().custom((value, helpers) => {
    if (!dateStringRegex.test(value)) {
      return helpers.error('any.invalid', { message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const businessNow = getBusinessNow();
    
    // Compare against business timezone date (not server timezone).
    if (value < businessNow.date) {
      return helpers.error('any.invalid', { message: 'Date must be today or in the future' });
    }
    
    return value;
  }),
  partySize: Joi.number().integer().min(1).max(20).required(),
});

const createReservationSchema = Joi.object({
  guestName: Joi.string().required().max(255),
  guestEmail: Joi.string().email().required().max(255),
  guestPhone: Joi.string().required().max(20),
  partySize: Joi.number().integer().min(1).max(20).required(),
  reservationDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().custom((value, helpers) => {
    const businessNow = getBusinessNow();

    if (value < businessNow.date) {
      return helpers.error('date.min', { limit: businessNow.date });
    }

    return value;
  }),
  reservationTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  tableId: Joi.number().integer().optional(),
  specialRequests: Joi.string().max(500).optional(),
});

const updateReservationSchema = Joi.object({
  guestName: Joi.string().max(255).optional(),
  guestEmail: Joi.string().email().max(255).optional(),
  guestPhone: Joi.string().max(20).optional(),
  partySize: Joi.number().integer().min(1).max(20).optional(),
  reservationDate: Joi.date().greater('now').optional(),
  reservationTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  tableId: Joi.number().integer().optional(),
  specialRequests: Joi.string().max(500).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').required(),
});

const assignTableSchema = Joi.object({
  tableId: Joi.number().integer().required(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
  date_from: Joi.date().optional(),
  date_to: Joi.date().optional(),
  sort_by: Joi.string().valid('reservationDate', 'createdAt', 'guestName').optional().default('reservationDate'),
  order: Joi.string().valid('asc', 'desc').optional().default('asc'),
});

/**
 * Check slot availability for a specific date and time
 */
export const checkSlotAvailability = async (req: Request, res: Response) => {
  try {
    const { date, time, guests } = req.query;

    if (!date || !time || !guests) {
      return res.status(400).json({
        success: false,
        error: 'Date, time, and guests are required',
      });
    }

    const availability = await reservationService.checkSlotAvailability(
      new Date(date as string),
      time as string,
      parseInt(guests as string)
    );

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    logger.error('Failed to check slot availability', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to check slot availability',
    });
  }
};

/**
 * Get available time slots for a specific date
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    logger.info('Received available slots request', { query: req.query });
    
    const { error, value } = getAvailableSlotsSchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters for available slots', {
        error: error.details?.[0]?.message,
        query: req.query,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { date, partySize } = value;
    
    // Ensure date is parsed correctly
    const reservationDate = new Date(date + 'T00:00:00');
    if (isNaN(reservationDate.getTime())) {
      logger.error('Invalid date after parsing', { date, reservationDate });
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: 'Date must be in YYYY-MM-DD format',
      });
    }

    logger.info('Fetching available slots', { date, partySize, reservationDate });
    
    const availableSlots = await reservationService.getAvailableSlots(
      reservationDate,
      partySize
    );

    logger.info('Available slots retrieved', {
      date,
      partySize,
      slotsFound: availableSlots.length,
    });

    res.json({
      success: true,
      data: {
        date,
        partySize,
        availableSlots,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get available slots', { 
      error: error.message,
      stack: error.stack,
      query: req.query 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get available slots',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all reservations with pagination and filtering
 */
export const getAllReservations = async (req: Request, res: Response) => {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { page, limit, status, date_from, date_to, sort_by, order } = value;
    const offset = (page - 1) * limit;
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Build where clause
    const where: any = {};

    // If not admin, only show user's own reservations
    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      where.userId = userId;
    }

    if (status) where.status = status;
    if (date_from || date_to) {
      where.reservationDate = {};
      if (date_from) where.reservationDate.gte = new Date(date_from);
      if (date_to) where.reservationDate.lte = new Date(date_to);
    }

    // Filter out orphaned reservations: get valid user IDs first (for admin/seller only)
    if (userRole === 'ADMIN' || userRole === 'SELLER') {
      try {
        const validUserIds = await (prisma as any).user.findMany({
          select: { id: true },
        }).then((users: any[]) => users.map(u => u.id));
        
        // Only include reservations with valid userIds
        if (validUserIds.length > 0) {
          where.userId = { in: validUserIds };
        } else {
          // No valid users, return empty result
          return res.json({
            success: true,
            data: {
              reservations: [],
              pagination: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            },
          });
        }
      } catch (userError) {
        logger.warn('Failed to fetch valid user IDs, proceeding without filter', { error: userError });
      }
    }

    // Get reservations with pagination
    const reservations = await (prisma as any).reservation.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).reservation.count({ where });

    logger.info('Reservations retrieved successfully', {
      count: reservations.length,
      total,
      page,
      limit,
      userId,
      userRole,
    });

    res.json({
      success: true,
      data: {
        reservations,
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
  } catch (error: any) {
    // Handle Prisma errors for orphaned data
    if (error.message?.includes('Field user is required') || error.message?.includes('Inconsistent query result')) {
      logger.warn('Orphaned reservation data detected, filtering out invalid records', { error: error.message });
      // Retry without user include, then manually fetch users
      try {
        const { page, limit, status, date_from, date_to, sort_by, order } = querySchema.validate(req.query).value;
        const offset = (page - 1) * limit;
        const userId = (req.user as JWTPayload)?.userId;
        const userRole = (req.user as JWTPayload)?.role;

        const where: any = {};
        if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
          where.userId = userId;
        }
        if (status) where.status = status;
        if (date_from || date_to) {
          where.reservationDate = {};
          if (date_from) where.reservationDate.gte = new Date(date_from);
          if (date_to) where.reservationDate.lte = new Date(date_to);
        }

        // Filter by valid user IDs
        const validUserIds = await (prisma as any).user.findMany({
          select: { id: true },
        }).then((users: any[]) => users.map(u => u.id));
        
        if (validUserIds.length > 0) {
          where.userId = { in: validUserIds };
        } else {
          return res.json({
            success: true,
            data: {
              reservations: [],
              pagination: {
                total: 0,
                page,
                limit,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            },
          });
        }

        const reservationsWithoutUser = await (prisma as any).reservation.findMany({
          where,
          include: {
            table: {
              select: {
                id: true,
                tableNumber: true,
                capacity: true,
                location: true,
              },
            },
          },
          orderBy: { [sort_by]: order },
          take: limit,
          skip: offset,
        });

        // Manually fetch users for valid userIds
        const userIds = [...new Set(reservationsWithoutUser.map((r: any) => r.userId).filter(Boolean))];
        const users = userIds.length > 0 ? await (prisma as any).user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        }) : [];
        const userMap = new Map(users.map((u: any) => [u.id, u]));

        const reservations = reservationsWithoutUser.map((r: any) => ({
          ...r,
          user: r.userId ? userMap.get(r.userId) || null : null,
        }));

        const total = await (prisma as any).reservation.count({ where });

        return res.json({
          success: true,
          data: {
            reservations,
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
      } catch (retryError) {
        logger.error('Failed to retrieve reservations after retry', { error: retryError, query: req.query });
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve reservations',
        });
      }
    }

    logger.error('Failed to retrieve reservations', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reservations',
    });
  }
};

/**
 * Get reservation by ID
 */
export const getReservationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    const reservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    if (!reservation) {
      logger.warn('Reservation not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check if user can access this reservation
    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && reservation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own reservations.',
      });
    }

    logger.info('Reservation retrieved successfully', { id, userId });

    res.json({
      success: true,
      data: { reservation },
    });
  } catch (error) {
    logger.error('Failed to retrieve reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reservation',
    });
  }
};

/**
 * Create a new reservation
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    const { error, value } = createReservationSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid reservation data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data',
        details: error.details?.[0]?.message,
      });
    }

    const {
      guestName,
      guestEmail,
      guestPhone,
      partySize,
      reservationDate,
      reservationTime,
      tableId,
      specialRequests,
    } = value;

    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to make a reservation.',
      });
    }

    // Validate that the combined reservation date+time is in the future.
    // This allows same-day bookings while preventing past time submissions.
    if (!isFutureReservationDateTime(reservationDate, reservationTime)) {
      const businessNow = getBusinessNow();
      logger.warn('Reservation rejected by future-time validation', {
        reservationDate,
        reservationTime,
        businessNowDate: businessNow.date,
        businessNowTime: businessNow.time,
        configuredTimezone: BUSINESS_TIMEZONE,
        activeTimezone: ACTIVE_BUSINESS_TIMEZONE,
        serverNowIso: new Date().toISOString(),
      });

      return res.status(400).json({
        success: false,
        error: 'Reservation date and time must be in the future',
      });
    }

    const reservationDateForDb = new Date(`${reservationDate}T12:00:00.000Z`);

    // Create reservation atomically with availability check
    // This prevents race conditions where multiple users try to book the same table
    let reservation;
    try {
      reservation = await reservationService.createReservationAtomically(
        {
          userId,
          guestName,
          guestEmail,
          guestPhone,
          partySize,
          reservationDate: reservationDateForDb,
          reservationTime,
          specialRequests,
        },
        tableId
      );
    } catch (error: any) {
      if (error.message && error.message.includes('already have a reservation for this time slot')) {
        return res.status(409).json({
          success: false,
          error: 'You already have a reservation for this time slot. Please choose a different time.',
        });
      }

      // Handle table availability errors
      if (error.message && error.message.includes('not available')) {
        // Get alternative time slots and send email
        try {
          const alternativeSlots = await reservationService.getAvailableSlots(
            reservationDateForDb,
            partySize
          );
          
          // Send email with alternative slots
          await reservationService.sendAlternativeSlotsEmail(
            guestEmail,
            guestName,
            reservationDateForDb,
            reservationTime,
            partySize,
            alternativeSlots
          );
        } catch (emailError) {
          logger.error('Failed to send alternative slots email', { error: emailError });
        }

        return res.status(409).json({
          success: false,
          error: tableId
            ? `Sorry, Table ${tableId} is already booked for this time. Please select another time or table.`
            : 'No tables are available for this time slot. Please select another time.',
          alternativeSlots: await reservationService.getAvailableSlots(
            reservationDateForDb,
            partySize
          ).catch(() => []),
        });
      }
      // Re-throw other errors to be handled by catch block
      throw error;
    }

    logger.info('Reservation created successfully', {
      id: reservation.id,
      userId,
      guestEmail,
      reservationDate,
      reservationTime,
      status: reservation.status,
    });

    // Do NOT send confirmation email on creation - only send after admin confirms
    // Email will be sent when admin updates status to CONFIRMED

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('reservations', 'RESERVATION_CREATED', {
      reservation,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: { reservation },
    });
  } catch (error: any) {
    logger.error('Failed to create reservation', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create reservation',
    });
  }
};

const adminCreateReservationSchema = Joi.object({
  guestName: Joi.string().required().max(255),
  guestEmail: Joi.string().email().required().max(255),
  guestPhone: Joi.string().required().max(20),
  partySize: Joi.number().integer().min(1).max(20).required(),
  reservationDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  reservationTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  tableId: Joi.number().integer().optional(),
  specialRequests: Joi.string().max(500).optional().allow(''),
  source: Joi.string().valid('WHATSAPP', 'PHONE', 'WALK_IN', 'MANUAL').default('MANUAL'),
});

/**
 * Admin: Create a reservation on behalf of a guest (WhatsApp, phone, walk-in, etc.)
 * Skips the per-user duplicate check and sets status to CONFIRMED immediately.
 */
export const adminCreateReservation = async (req: Request, res: Response) => {
  try {
    const { error, value } = adminCreateReservationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation data',
        details: error.details?.[0]?.message,
      });
    }

    const { guestName, guestEmail, guestPhone, partySize, reservationDate, reservationTime, tableId, specialRequests, source } = value;

    const adminUserId = (req.user as JWTPayload)?.userId;
    if (!adminUserId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const reservationDateForDb = new Date(`${reservationDate}T12:00:00.000Z`);

    // Check overall capacity (does not block admin even if slot is tight, but warns)
    const slotAvailability = await reservationService.checkSlotAvailability(
      reservationDateForDb,
      reservationTime,
      partySize
    );

    if (!slotAvailability.available) {
      return res.status(409).json({
        success: false,
        error: `This time slot is fully booked. Only ${slotAvailability.availableCapacity} seats available, but ${partySize} requested.`,
      });
    }

    const sourceLabel: Record<string, string> = {
      WHATSAPP: 'WhatsApp',
      PHONE: 'Phone Call',
      WALK_IN: 'Walk-in',
      MANUAL: 'Manual Entry',
    };

    const noteParts = [`[SOURCE:${sourceLabel[source]}]`];
    if (specialRequests && specialRequests.trim()) noteParts.push(specialRequests.trim());
    const fullSpecialRequests = noteParts.join(' | ');

    const reservation = await (prisma as any).reservation.create({
      data: {
        userId: adminUserId,
        guestName,
        guestEmail,
        guestPhone,
        partySize,
        reservationDate: reservationDateForDb,
        reservationTime,
        tableId: tableId || null,
        specialRequests: fullSpecialRequests,
        status: 'CONFIRMED',
      },
      include: {
        table: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    logger.info('Admin created reservation', { id: reservation.id, adminUserId, source, guestEmail });

    wsManager.broadcastToRoom('reservations', 'RESERVATION_CREATED', {
      reservation,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully',
      data: { reservation },
    });
  } catch (error: any) {
    logger.error('Admin failed to create reservation', { error, body: req.body });
    return res.status(500).json({ success: false, error: error?.message || 'Failed to create reservation' });
  }
};

/**
 * Update reservation
 */
export const updateReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const { error, value } = updateReservationSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid reservation update data', {
        error: error.details?.[0]?.message,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation update data',
        details: error.details?.[0]?.message,
      });
    }

    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check if user can update this reservation
    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && existingReservation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only update your own reservations.',
      });
    }

    // Check if reservation can be modified
    const canModify = await reservationService.canModifyReservation(Number(id));
    if (!canModify && userRole !== 'ADMIN') {
      return res.status(409).json({
        success: false,
        error: 'Reservation cannot be modified less than 2 hours before the scheduled time',
      });
    }

    // If table is being changed, check availability
    if (value.tableId && value.tableId !== existingReservation.tableId) {
      const reservationDate = value.reservationDate || existingReservation.reservationDate;
      const reservationTime = value.reservationTime || existingReservation.reservationTime;
      const partySize = value.partySize || existingReservation.partySize;

      const availableTables = await reservationService.checkTableAvailability(
        new Date(reservationDate),
        reservationTime,
        partySize
      );

      const isTableAvailable = availableTables.some((t: any) => t.tableId === value.tableId);

      if (!isTableAvailable) {
        return res.status(409).json({
          success: false,
          error: 'Selected table is not available for this time slot',
        });
      }
    }

    // Update reservation
    const updatedReservation = await (prisma as any).reservation.update({
      where: { id: Number(id) },
      data: value,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    logger.info('Reservation updated successfully', {
      id,
      userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Reservation updated successfully',
      data: { reservation: updatedReservation },
    });
  } catch (error) {
    logger.error('Failed to update reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation',
    });
  }
};

/**
 * Update reservation status
 */
export const updateReservationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid status update data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid status update data',
        details: error.details?.[0]?.message,
      });
    }

    const { status } = value;

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for status update', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Update status
    const updatedReservation = await (prisma as any).reservation.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    logger.info('Reservation status updated', {
      id,
      oldStatus: existingReservation.status,
      newStatus: status,
    });

    // Broadcast WebSocket event to admin room
    wsManager.broadcastToRoom('reservations', 'RESERVATION_STATUS_UPDATED', {
      reservation: updatedReservation,
      oldStatus: existingReservation.status,
      newStatus: status,
      timestamp: new Date().toISOString(),
    });

    // Also notify the customer if they have a WebSocket connection
    if (updatedReservation.userId) {
      wsManager.emitToUser(updatedReservation.userId, 'RESERVATION_STATUS_UPDATED', {
        reservation: updatedReservation,
        oldStatus: existingReservation.status,
        newStatus: status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Reservation status updated successfully',
      data: { reservation: updatedReservation },
    });
  } catch (error) {
    logger.error('Failed to update reservation status', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update reservation status',
    });
  }
};

/**
 * Assign table to reservation
 */
export const assignTableToReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const { error, value } = assignTableSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid table assignment data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid table assignment data',
        details: error.details?.[0]?.message,
      });
    }

    const { tableId } = value;

    const updatedReservation = await reservationService.assignTable(Number(id), tableId);

    logger.info('Table assigned to reservation', {
      reservationId: id,
      tableId,
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('reservations', 'RESERVATION_TABLE_ASSIGNED', {
      reservation: updatedReservation,
      tableId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Table assigned successfully',
      data: { reservation: updatedReservation },
    });
  } catch (error) {
    logger.error('Failed to assign table', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to assign table',
    });
  }
};

/**
 * Cancel reservation
 */
export const cancelReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for cancellation', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check if user can cancel this reservation
    if (userRole !== 'ADMIN' && userRole !== 'SELLER' && existingReservation.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only cancel your own reservations.',
      });
    }

    // Check if reservation can be cancelled
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existingReservation.status)) {
      return res.status(409).json({
        success: false,
        error: 'Reservation cannot be cancelled',
      });
    }

    // Determine who cancelled (customer or admin)
    const cancelledBy = userRole === 'ADMIN' || userRole === 'SELLER' ? 'ADMIN' : 'CUSTOMER';
    
    // Cancel reservation - store cancelledBy in specialRequests or use a note field
    // For now, we'll add a note in specialRequests or create a separate field
    const cancelledReservation = await (prisma as any).reservation.update({
      where: { id: Number(id) },
      data: { 
        status: 'CANCELLED',
        // Store cancellation info - we'll add a proper field later via migration
        specialRequests: existingReservation.specialRequests 
          ? `${existingReservation.specialRequests}\n[CANCELLED_BY:${cancelledBy}]`
          : `[CANCELLED_BY:${cancelledBy}]`
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    logger.info('Reservation cancelled successfully', {
      id,
      userId,
    });

    // Send cancellation email
    await reservationService.sendCancellationEmail(cancelledReservation);

    // Broadcast WebSocket event to admin room
    wsManager.broadcastToRoom('reservations', 'RESERVATION_CANCELLED', {
      reservation: cancelledReservation,
      cancelledBy,
      timestamp: new Date().toISOString(),
    });

    // Notify the customer if they cancelled it
    if (cancelledBy === 'CUSTOMER' && cancelledReservation.userId) {
      wsManager.emitToUser(cancelledReservation.userId, 'RESERVATION_CANCELLED', {
        reservation: cancelledReservation,
        cancelledBy,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Reservation cancelled successfully',
      data: { reservation: cancelledReservation },
    });
  } catch (error) {
    logger.error('Failed to cancel reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel reservation',
    });
  }
};

/**
 * Confirm reservation
 */
export const confirmReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tableId } = req.body || {};

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for confirmation', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check if reservation can be confirmed
    if (existingReservation.status !== 'PENDING') {
      return res.status(409).json({
        success: false,
        error: `Reservation cannot be confirmed. Current status: ${existingReservation.status}`,
      });
    }

    // If tableId is provided, assign it; otherwise just confirm
    let updatedReservation;
    if (tableId) {
      updatedReservation = await reservationService.assignTable(Number(id), tableId);
    } else {
      // Just update status to CONFIRMED
      updatedReservation = await (prisma as any).reservation.update({
        where: { id: Number(id) },
        data: { status: 'CONFIRMED' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          table: {
            select: {
              id: true,
              tableNumber: true,
              capacity: true,
              location: true,
            },
          },
        },
      });

      // Send confirmation email
      await reservationService.sendConfirmation(updatedReservation);
    }

    logger.info('Reservation confirmed successfully', {
      id,
      tableId: tableId || existingReservation.tableId,
    });

    // Broadcast WebSocket event to admin room
    wsManager.broadcastToRoom('reservations', 'RESERVATION_CONFIRMED', {
      reservation: updatedReservation,
      timestamp: new Date().toISOString(),
    });

    // Notify the customer
    if (updatedReservation.userId) {
      wsManager.emitToUser(updatedReservation.userId, 'RESERVATION_CONFIRMED', {
        reservation: updatedReservation,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Reservation confirmed successfully',
      data: { reservation: updatedReservation },
    });
  } catch (error) {
    logger.error('Failed to confirm reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to confirm reservation',
    });
  }
};

/**
 * Reject reservation
 */
export const rejectReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for rejection', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Check if reservation can be rejected
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(existingReservation.status)) {
      return res.status(409).json({
        success: false,
        error: `Reservation cannot be rejected. Current status: ${existingReservation.status}`,
      });
    }

    // Update status to CANCELLED
    const rejectedReservation = await (prisma as any).reservation.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        table: {
          select: {
            id: true,
            tableNumber: true,
            capacity: true,
            location: true,
          },
        },
      },
    });

    logger.info('Reservation rejected successfully', {
      id,
      reason,
    });

    // Send cancellation/rejection email
    await reservationService.sendCancellationEmail(rejectedReservation);

    // Broadcast WebSocket event to admin room
    wsManager.broadcastToRoom('reservations', 'RESERVATION_REJECTED', {
      reservation: rejectedReservation,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Notify the customer
    if (rejectedReservation.userId) {
      wsManager.emitToUser(rejectedReservation.userId, 'RESERVATION_REJECTED', {
        reservation: rejectedReservation,
        reason,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Reservation rejected successfully',
      data: { reservation: rejectedReservation },
    });
  } catch (error) {
    logger.error('Failed to reject reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to reject reservation',
    });
  }
};

/**
 * Delete reservation (Admin only)
 */
export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID',
      });
    }

    const userRole = (req.user as JWTPayload)?.role;

    // Only admins can delete reservations
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only administrators can delete reservations.',
      });
    }

    // Check if reservation exists
    const existingReservation = await (prisma as any).reservation.findUnique({
      where: { id: Number(id) },
    });

    if (!existingReservation) {
      logger.warn('Reservation not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Delete reservation
    await (prisma as any).reservation.delete({
      where: { id: Number(id) },
    });

    logger.info('Reservation deleted successfully', {
      id,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('reservations', 'RESERVATION_DELETED', {
      reservationId: Number(id),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Reservation deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete reservation', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete reservation',
    });
  }
};