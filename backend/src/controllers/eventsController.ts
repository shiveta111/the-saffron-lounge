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
  defaultMeta: { service: 'events-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/events-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/events.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createEventSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).max(5000).required(),
  date: Joi.date().iso().required(),
  location: Joi.string().min(1).max(255).required(),
  capacity: Joi.number().integer().min(1).optional(),
  tags: Joi.array().items(Joi.string()).optional().default([]),
});

const updateEventSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).max(5000).optional(),
  date: Joi.date().iso().optional(),
  location: Joi.string().min(1).max(255).optional(),
  capacity: Joi.number().integer().min(1).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  upcoming: Joi.boolean().optional().default(false),
  organizerId: Joi.number().integer().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

// Controller functions
export const getAllEvents = async (req: Request, res: Response) => {
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

    const { page, limit, upcoming, organizerId, startDate, endDate } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (upcoming) {
      where.date = { gte: new Date() };
    }
    if (organizerId) where.organizer_id = organizerId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get events
    const events = await (prisma as any).event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
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
      orderBy: upcoming ? { date: 'asc' } : { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    // Parse tags from JSON strings back to arrays
    const eventsWithParsedTags = events.map((event: any) => {
      let tags = [];
      try {
        tags = event.tags ? JSON.parse(event.tags) : [];
      } catch (e) {
        logger.warn('Failed to parse tags for event', { eventId: event.id, tags: event.tags });
        tags = [];
      }
      return {
        ...event,
        tags,
        attendeeCount: event.attendees?.length || 0,
      };
    });

    // Get total count
    const total = await (prisma as any).event.count({ where });

    logger.info('Events retrieved successfully', {
      count: events.length,
      total,
      page,
      limit,
      filters: { upcoming, organizerId, startDate, endDate },
    });

    res.json({
      success: true,
      data: {
        events: eventsWithParsedTags,
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
    logger.error('Failed to retrieve events', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve events',
    });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    const event = await (prisma as any).event.findUnique({
      where: { id: Number(id) },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
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

    if (!event) {
      logger.warn('Event not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Parse tags from JSON string back to array
    let tags = [];
    try {
      tags = event.tags ? JSON.parse(event.tags) : [];
    } catch (e) {
      logger.warn('Failed to parse tags for event', { eventId: event.id, tags: event.tags });
      tags = [];
    }
    const eventWithParsedTags = {
      ...event,
      tags,
      attendeeCount: event.attendees?.length || 0,
    };

    logger.info('Event retrieved successfully', { id, title: event.title });

    res.json({
      success: true,
      data: { event: eventWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to retrieve event', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event',
    });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createEventSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid event data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: error.details?.[0]?.message,
      });
    }

    const { title, description, date, location, capacity, tags } = value;
    const organizerId = (req.user as JWTPayload)?.userId;

    if (!organizerId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Convert tags array to JSON string
    const tagsJson = JSON.stringify(tags || []);

    // Create the event
    const event = await (prisma as any).event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        organizer_id: organizerId,
        capacity,
        tags: tagsJson,
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Parse tags back to array for response
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(event.tags);
    } catch (e) {
      logger.warn('Failed to parse tags for created event', { eventId: event.id, tags: event.tags });
      parsedTags = [];
    }
    const eventWithParsedTags = {
      ...event,
      tags: parsedTags,
      attendeeCount: 0,
    };

    logger.info('Event created successfully', {
      id: event.id,
      title: event.title,
      date: event.date,
      organizerId,
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event: eventWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to create event', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
    });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    // Validate request body
    const { error, value } = updateEventSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid event update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid event update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if event exists
    const existingEvent = await (prisma as any).event.findUnique({
      where: { id: Number(id) },
    });

    if (!existingEvent) {
      logger.warn('Event not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if user can update this event
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (userRole !== 'ADMIN' && existingEvent.organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own events',
      });
    }

    // Convert tags array to JSON string if provided
    const updateData: any = { ...value };
    if (value.tags) {
      updateData.tags = JSON.stringify(value.tags);
    }
    if (value.date) {
      updateData.date = new Date(value.date);
    }

    // Update the event
    const updatedEvent = await (prisma as any).event.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendees: {
          include: {
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

    // Parse tags back to array for response
    let tags = [];
    try {
      tags = updatedEvent.tags ? JSON.parse(updatedEvent.tags) : [];
    } catch (e) {
      logger.warn('Failed to parse tags for updated event', { eventId: updatedEvent.id, tags: updatedEvent.tags });
      tags = [];
    }
    const eventWithParsedTags = {
      ...updatedEvent,
      tags,
      attendeeCount: updatedEvent.attendees?.length || 0,
    };

    logger.info('Event updated successfully', {
      id,
      title: updatedEvent.title,
      updatedBy: userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event: eventWithParsedTags },
    });
  } catch (error) {
    logger.error('Failed to update event', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
    });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    // Check if event exists
    const existingEvent = await (prisma as any).event.findUnique({
      where: { id: Number(id) },
    });

    if (!existingEvent) {
      logger.warn('Event not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if user can delete this event
    const userId = (req.user as JWTPayload)?.userId;
    const userRole = (req.user as JWTPayload)?.role;

    if (userRole !== 'ADMIN' && existingEvent.organizer_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own events',
      });
    }

    // Delete the event (cascade will handle attendees)
    await (prisma as any).event.delete({
      where: { id: Number(id) },
    });

    logger.info('Event deleted successfully', {
      id,
      title: existingEvent.title,
      deletedBy: userId,
    });

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete event', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
    });
  }
};

export const attendEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check if event exists
    const event = await (prisma as any).event.findUnique({
      where: { id: Number(id) },
      include: { attendees: true },
    });

    if (!event) {
      logger.warn('Event not found for attendance', { id });
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if event is in the past
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot attend past events',
      });
    }

    // Check capacity
    if (event.capacity && event.attendees.length >= event.capacity) {
      return res.status(400).json({
        success: false,
        error: 'Event is at full capacity',
      });
    }

    // Check if already attending
    const existingAttendance = await (prisma as any).eventAttendee.findUnique({
      where: {
        event_id_user_id: {
          event_id: Number(id),
          user_id: userId,
        },
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already attending this event',
      });
    }

    // Add attendance
    await (prisma as any).eventAttendee.create({
      data: {
        event_id: Number(id),
        user_id: userId,
      },
    });

    logger.info('User registered for event successfully', {
      eventId: id,
      userId,
      eventTitle: event.title,
    });

    res.json({
      success: true,
      message: 'Successfully registered for event',
    });
  } catch (error) {
    logger.error('Failed to register for event', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to register for event',
    });
  }
};

export const unattendEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Remove attendance
    const deletedAttendance = await (prisma as any).eventAttendee.deleteMany({
      where: {
        event_id: Number(id),
        user_id: userId,
      },
    });

    if (deletedAttendance.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not attending this event',
      });
    }

    logger.info('User unregistered from event successfully', {
      eventId: id,
      userId,
    });

    res.json({
      success: true,
      message: 'Successfully unregistered from event',
    });
  } catch (error) {
    logger.error('Failed to unregister from event', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to unregister from event',
    });
  }
};