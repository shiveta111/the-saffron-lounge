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
  defaultMeta: { service: 'services-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/services-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/services.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createServiceSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().min(1).required(),
  icon: Joi.string().optional(), // Allow any string, not just URI
  features: Joi.array().items(Joi.string()).optional().default([]),
  price: Joi.number().min(0).optional(),
  category: Joi.string().min(1).max(100).optional().default('General'), // Provide default category
});

const updateServiceSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().min(1).optional(),
  icon: Joi.string().optional(), // Allow any string, not just URI
  features: Joi.array().items(Joi.string()).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().min(1).max(100).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  category: Joi.string().optional(),
  sort_by: Joi.string().valid('created_at', 'title', 'price').optional().default('created_at'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Controller functions
export const getAllServices = async (req: Request, res: Response) => {
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

    const { page, limit, category, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (category) where.category = category;

    // Get services with pagination
    const services = await (prisma as any).service.findMany({
      where,
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await (prisma as any).service.count({ where });

    // Parse features from JSON strings back to arrays
    const servicesWithParsedFeatures = services.map((service: any) => ({
      ...service,
      features: service.features ? JSON.parse(service.features) : [],
    }));

    logger.info('Services retrieved successfully', {
      count: services.length,
      total,
      page,
      limit,
      category,
    });

    res.json({
      success: true,
      data: {
        services: servicesWithParsedFeatures,
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
    logger.error('Failed to retrieve services', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve services',
    });
  }
};

export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
      });
    }

    const service = await (prisma as any).service.findUnique({
      where: { id: Number(id) },
    });

    if (!service) {
      logger.warn('Service not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // Parse features from JSON string back to array
    const serviceWithParsedFeatures = {
      ...service,
      features: service.features ? JSON.parse(service.features) : [],
    };

    logger.info('Service retrieved successfully', { id, title: service.title });

    res.json({
      success: true,
      data: { service: serviceWithParsedFeatures },
    });
  } catch (error) {
    logger.error('Failed to retrieve service', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service',
    });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid service data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid service data',
        details: error.details?.[0]?.message,
      });
    }

    const { title, description, icon, features, price, category } = value;

    // Convert features array to JSON string
    const featuresJson = JSON.stringify(features || []);

    // Create the service
    const service = await (prisma as any).service.create({
      data: {
        title,
        description,
        icon,
        features: featuresJson,
        price,
        category,
      },
    });

    // Parse features back to array for response
    const serviceWithParsedFeatures = {
      ...service,
      features: JSON.parse(service.features),
    };

    logger.info('Service created successfully', {
      id: service.id,
      title: service.title,
      category: service.category,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service: serviceWithParsedFeatures },
    });
  } catch (error) {
    logger.error('Failed to create service', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create service',
    });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
      });
    }

    // Validate request body
    const { error, value } = updateServiceSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid service update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid service update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if service exists
    const existingService = await (prisma as any).service.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      logger.warn('Service not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // Convert features array to JSON string if provided
    const updateData: any = { ...value };
    if (value.features) {
      updateData.features = JSON.stringify(value.features);
    }

    // Update the service
    const updatedService = await (prisma as any).service.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Parse features back to array for response
    const serviceWithParsedFeatures = {
      ...updatedService,
      features: updatedService.features ? JSON.parse(updatedService.features) : [],
    };

    logger.info('Service updated successfully', {
      id,
      title: updatedService.title,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: serviceWithParsedFeatures },
    });
  } catch (error) {
    logger.error('Failed to update service', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update service',
    });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service ID',
      });
    }

    // Check if service exists
    const existingService = await (prisma as any).service.findUnique({
      where: { id: Number(id) },
    });

    if (!existingService) {
      logger.warn('Service not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    // Delete the service
    await (prisma as any).service.delete({
      where: { id: Number(id) },
    });

    logger.info('Service deleted successfully', {
      id,
      title: existingService.title,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete service', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
    });
  }
};