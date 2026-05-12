import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { deleteImageFile } from '../utils/upload';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'testimonials-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/testimonials-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/testimonials.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createTestimonialSchema = Joi.object({
  client_name: Joi.string().min(1).max(100).required(),
  designation: Joi.string().max(100).optional(),
  feedback: Joi.string().min(1).required(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  photo: Joi.string().uri().optional(),
  company: Joi.string().max(100).optional(),
  date_given: Joi.date().optional(),
});

const updateTestimonialSchema = Joi.object({
  client_name: Joi.string().min(1).max(100).optional(),
  designation: Joi.string().max(100).optional(),
  feedback: Joi.string().min(1).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  photo: Joi.string().uri().optional(),
  company: Joi.string().max(100).optional(),
  date_given: Joi.date().optional(),
  status: Joi.string().valid('active', 'inactive', 'pending').optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  sort_by: Joi.string().valid('created_at', 'rating', 'client_name').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
  rating_filter: Joi.number().integer().min(1).max(5).optional(),
  status: Joi.string().valid('pending', 'active', 'inactive').optional(),
});

// Controller functions
export const getAllTestimonials = async (req: Request, res: Response) => {
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

    const { page, limit, sort_by, order, rating_filter, status } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (rating_filter) where.rating = rating_filter;
    if (status) where.status = status;

    let testimonials;
    let total;

    try {
      // Get testimonials with pagination
      testimonials = await (prisma as any).testimonial.findMany({
        where,
        orderBy: { [sort_by]: order },
        take: limit,
        skip: offset,
      });

      // Get total count
      total = await (prisma as any).testimonial.count({ where });
    } catch (error: any) {
      // If status column doesn't exist in database, retry without status filter
      if (error.code === 'P2022' && status && error.meta?.column?.includes('status')) {
        logger.warn('Status column not found in database, retrying without status filter', {
          error: error.message,
        });
        
        // Remove status from where clause and retry
        const whereWithoutStatus: any = {};
        if (rating_filter) whereWithoutStatus.rating = rating_filter;

        testimonials = await (prisma as any).testimonial.findMany({
          where: whereWithoutStatus,
          orderBy: { [sort_by]: order },
          take: limit,
          skip: offset,
        });

        total = await (prisma as any).testimonial.count({ where: whereWithoutStatus });
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }

    logger.info('Testimonials retrieved successfully', {
      count: testimonials.length,
      total,
      page,
      limit,
      rating_filter,
    });

    res.json({
      success: true,
      data: {
        testimonials,
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
    logger.error('Failed to retrieve testimonials', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve testimonials',
    });
  }
};

export const getTestimonialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid testimonial ID',
      });
    }

    const testimonial = await (prisma as any).testimonial.findUnique({
      where: { id: Number(id) },
    });

    if (!testimonial) {
      logger.warn('Testimonial not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }

    logger.info('Testimonial retrieved successfully', { id, client_name: testimonial.client_name });

    res.json({
      success: true,
      data: { testimonial },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve testimonial', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve testimonial',
    });
  }
};

export const createTestimonial = async (req: Request, res: Response) => {
  try {
    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      bodyData = {};
      if (req.body.client_name) bodyData.client_name = req.body.client_name;
      if (req.body.designation) bodyData.designation = req.body.designation;
      if (req.body.feedback) bodyData.feedback = req.body.feedback;
      if (req.body.rating) bodyData.rating = parseInt(req.body.rating);
      if (req.body.company) bodyData.company = req.body.company;
      if (req.body.date_given) bodyData.date_given = req.body.date_given ? new Date(req.body.date_given) : null;
      
      // Handle photo file upload if present
      if ((req as any).file) {
        bodyData.photo = `/assets/uploads/testimonials/${(req as any).file.filename}`;
      } else if (req.body.photo) {
        bodyData.photo = req.body.photo;
      }
    }

    // Validate request body
    const { error, value } = createTestimonialSchema.validate(bodyData);
    if (error) {
      logger.warn('Invalid testimonial data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid testimonial data',
        details: error.details?.[0]?.message,
      });
    }

    const { client_name, designation, feedback, rating, photo, company, date_given } = value;

    // Create the testimonial with default status 'pending'
    const testimonial = await (prisma as any).testimonial.create({
      data: {
        client_name,
        designation,
        feedback,
        rating,
        photo,
        company,
        date_given,
        status: 'pending', // Default status
      },
    });

    logger.info('Testimonial created successfully', {
      id: testimonial.id,
      client_name: testimonial.client_name,
      rating: testimonial.rating,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Testimonial created successfully',
      data: { testimonial },
    });
  } catch (error: any) {
    logger.error('Failed to create testimonial', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create testimonial',
    });
  }
};

export const updateTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid testimonial ID',
      });
    }

    // Handle FormData if present (multipart/form-data)
    let bodyData: any = req.body;
    if (req.headers['content-type']?.includes('multipart/form-data') || (req as any).file) {
      bodyData = {};
      if (req.body.client_name) bodyData.client_name = req.body.client_name;
      if (req.body.designation) bodyData.designation = req.body.designation;
      if (req.body.feedback) bodyData.feedback = req.body.feedback;
      if (req.body.rating) bodyData.rating = parseInt(req.body.rating);
      if (req.body.company) bodyData.company = req.body.company;
      if (req.body.date_given) bodyData.date_given = req.body.date_given ? new Date(req.body.date_given) : null;
      if (req.body.status) bodyData.status = req.body.status;
      
      // Handle photo file upload if present
      if ((req as any).file) {
        bodyData.photo = `/assets/uploads/testimonials/${(req as any).file.filename}`;
      } else if (req.body.photo === 'null' || req.body.photo === '') {
        // If frontend explicitly sends null/empty for photo, clear it
        bodyData.photo = null;
      } else if (req.body.photo) {
        // If photo is sent as a string (existing URL), keep it
        bodyData.photo = req.body.photo;
      }
    }

    // Validate request body
    const { error, value } = updateTestimonialSchema.validate(bodyData);
    if (error) {
      logger.warn('Invalid testimonial update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid testimonial update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if testimonial exists
    const existingTestimonial = await (prisma as any).testimonial.findUnique({
      where: { id: Number(id) },
    });

    if (!existingTestimonial) {
      logger.warn('Testimonial not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }

    // Delete old photo if a new one is uploaded or existing one is cleared
    if ((req as any).file && existingTestimonial.photo) {
      deleteImageFile(existingTestimonial.photo);
    } else if (value.photo === null && existingTestimonial.photo) {
      deleteImageFile(existingTestimonial.photo);
    }

    // Remove undefined values to allow partial updates
    const updateData: any = {};
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined) {
        updateData[key] = value[key];
      }
    });

    // Update the testimonial
    const updatedTestimonial = await (prisma as any).testimonial.update({
      where: { id: Number(id) },
      data: updateData,
    });

    logger.info('Testimonial updated successfully', {
      id,
      client_name: updatedTestimonial.client_name,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Testimonial updated successfully',
      data: { testimonial: updatedTestimonial },
    });
  } catch (error: any) {
    logger.error('Failed to update testimonial', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update testimonial',
    });
  }
};

export const deleteTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid testimonial ID',
      });
    }

    // Check if testimonial exists
    const existingTestimonial = await (prisma as any).testimonial.findUnique({
      where: { id: Number(id) },
    });

    if (!existingTestimonial) {
      logger.warn('Testimonial not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Testimonial not found',
      });
    }

    // Delete the testimonial
    await (prisma as any).testimonial.delete({
      where: { id: Number(id) },
    });

    logger.info('Testimonial deleted successfully', {
      id,
      client_name: existingTestimonial.client_name,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Testimonial deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete testimonial', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete testimonial',
    });
  }
};