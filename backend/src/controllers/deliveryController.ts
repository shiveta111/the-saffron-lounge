import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { deliveryService } from '../services/deliveryService';
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
  defaultMeta: { service: 'delivery-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/delivery-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/delivery.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createZoneSchema = Joi.object({
  name: Joi.string().required().max(255),
  postcodes: Joi.array().items(Joi.string()).min(1).required(),
  deliveryFee: Joi.number().min(0).required(),
  minOrderValue: Joi.number().min(0).optional(),
  estimatedTime: Joi.number().integer().min(10).max(180).required(),
  isActive: Joi.boolean().optional().default(true),
});

const updateZoneSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  postcodes: Joi.array().items(Joi.string()).min(1).optional(),
  deliveryFee: Joi.number().min(0).optional(),
  minOrderValue: Joi.number().min(0).optional(),
  estimatedTime: Joi.number().integer().min(10).max(180).optional(),
  isActive: Joi.boolean().optional(),
});

const validateAddressSchema = Joi.object({
  address: Joi.string().required().min(10),
  postcode: Joi.string().required().min(3),
});

const calculateFeeSchema = Joi.object({
  postcode: Joi.string().required().min(3),
  orderTotal: Joi.number().min(0).required(),
});

/**
 * Get all delivery zones
 */
export const getDeliveryZones = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const zones = await (prisma as any).deliveryZone.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Parse postcodes JSON for each zone
    const formattedZones = zones.map((zone: any) => ({
      ...zone,
      postcodes: JSON.parse(zone.postcodes || '[]'),
    }));

    logger.info('Delivery zones retrieved', { count: formattedZones.length });

    res.json({
      success: true,
      data: { zones: formattedZones },
    });
  } catch (error) {
    logger.error('Failed to retrieve delivery zones', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delivery zones',
    });
  }
};

/**
 * Get delivery zone by ID
 */
export const getDeliveryZoneById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID',
      });
    }

    const zone = await (prisma as any).deliveryZone.findUnique({
      where: { id: Number(id) },
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        error: 'Delivery zone not found',
      });
    }

    // Parse postcodes JSON
    const formattedZone = {
      ...zone,
      postcodes: JSON.parse(zone.postcodes || '[]'),
    };

    res.json({
      success: true,
      data: { zone: formattedZone },
    });
  } catch (error) {
    logger.error('Failed to retrieve delivery zone', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve delivery zone',
    });
  }
};

/**
 * Create delivery zone
 */
export const createDeliveryZone = async (req: Request, res: Response) => {
  try {
    const { error, value } = createZoneSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid zone data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid zone data',
        details: error.details?.[0]?.message,
      });
    }

    const { name, postcodes, deliveryFee, minOrderValue, estimatedTime, isActive } = value;

    // Create zone
    const zone = await (prisma as any).deliveryZone.create({
      data: {
        name,
        postcodes: JSON.stringify(postcodes),
        deliveryFee,
        minOrderValue,
        estimatedTime,
        isActive,
      },
    });

    logger.info('Delivery zone created', { id: zone.id, name });

    // Broadcast WebSocket event
    const formattedZone = {
      ...zone,
      postcodes: JSON.parse(zone.postcodes),
    };
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_CREATED', { zone: formattedZone });

    res.status(201).json({
      success: true,
      message: 'Delivery zone created successfully',
      data: {
        zone: formattedZone,
      },
    });
  } catch (error) {
    logger.error('Failed to create delivery zone', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to create delivery zone',
    });
  }
};

/**
 * Update delivery zone
 */
export const updateDeliveryZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID',
      });
    }

    const { error, value } = updateZoneSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid zone update data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid zone update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if zone exists
    const existingZone = await (prisma as any).deliveryZone.findUnique({
      where: { id: Number(id) },
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: 'Delivery zone not found',
      });
    }

    // Prepare update data
    const updateData: any = { ...value };
    if (value.postcodes) {
      updateData.postcodes = JSON.stringify(value.postcodes);
    }

    // Update zone
    const updatedZone = await (prisma as any).deliveryZone.update({
      where: { id: Number(id) },
      data: updateData,
    });

    logger.info('Delivery zone updated', { id, changes: Object.keys(value) });

    // Broadcast WebSocket event
    const formattedZone = {
      ...updatedZone,
      postcodes: JSON.parse(updatedZone.postcodes),
    };
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_UPDATED', { zone: formattedZone });

    res.json({
      success: true,
      message: 'Delivery zone updated successfully',
      data: {
        zone: formattedZone,
      },
    });
  } catch (error) {
    logger.error('Failed to update delivery zone', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update delivery zone',
    });
  }
};

/**
 * Delete delivery zone
 */
export const deleteDeliveryZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid zone ID',
      });
    }

    // Check if zone exists
    const existingZone = await (prisma as any).deliveryZone.findUnique({
      where: { id: Number(id) },
    });

    if (!existingZone) {
      return res.status(404).json({
        success: false,
        error: 'Delivery zone not found',
      });
    }

    // Delete zone
    await (prisma as any).deliveryZone.delete({
      where: { id: Number(id) },
    });

    logger.info('Delivery zone deleted', { id, name: existingZone.name });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('delivery-zones', 'ZONE_DELETED', { zoneId: Number(id) });

    res.json({
      success: true,
      message: 'Delivery zone deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete delivery zone', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete delivery zone',
    });
  }
};

/**
 * Validate delivery address
 */
export const validateDeliveryAddress = async (req: Request, res: Response) => {
  try {
    const { error, value } = validateAddressSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address data',
        details: error.details?.[0]?.message,
      });
    }

    const { address, postcode } = value;

    const validation = await deliveryService.validateAddress(address, postcode);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.message,
      });
    }

    res.json({
      success: true,
      message: 'Address is valid for delivery',
      data: {
        zone: validation.zone,
      },
    });
  } catch (error) {
    logger.error('Address validation failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to validate address',
    });
  }
};

/**
 * Calculate delivery fee
 */
export const calculateDeliveryFee = async (req: Request, res: Response) => {
  try {
    const { error, value } = calculateFeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calculation data',
        details: error.details?.[0]?.message,
      });
    }

    const { postcode, orderTotal } = value;

    const feeCalculation = await deliveryService.calculateDeliveryFee(postcode, orderTotal);

    if (!feeCalculation) {
      return res.status(404).json({
        success: false,
        error: 'No delivery zone found for this postcode',
      });
    }

    res.json({
      success: true,
      data: feeCalculation,
    });
  } catch (error) {
    logger.error('Fee calculation failed', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate delivery fee',
    });
  }
};