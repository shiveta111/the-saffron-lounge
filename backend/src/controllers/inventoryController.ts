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
  defaultMeta: { service: 'inventory-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/inventory-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/inventory.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createInventorySchema = Joi.object({
  productId: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(0).required(),
  minThreshold: Joi.number().integer().min(0).default(10),
  supplier: Joi.string().max(100).optional(),
});

const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).optional(),
  minThreshold: Joi.number().integer().min(0).optional(),
  supplier: Joi.string().max(100).optional(),
});

const stockAdjustmentSchema = Joi.object({
  quantity: Joi.number().integer().required(), // Can be negative for reductions
  reason: Joi.string().max(200).required(),
  notes: Joi.string().max(500).optional(),
});

const querySchema = Joi.object({
  lowStock: Joi.boolean().optional(),
  outOfStock: Joi.boolean().optional(),
  supplier: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  offset: Joi.number().integer().min(0).optional().default(0),
});

// Controller functions
export const getAllInventory = async (req: Request, res: Response) => {
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

    const { lowStock, outOfStock, supplier, limit, offset } = value;

    // Build where clause
    const where: any = {};

    // Note: Low stock filtering will be handled in the query processing
    // since we need to compare quantity with minThreshold which requires
    // fetching the data first

    if (outOfStock) {
      where.quantity = 0;
    }

    if (supplier) {
      where.supplier = { contains: supplier };
    }

    // Get inventory with product details
    let inventory = await (prisma as any).inventory.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
            isAvailable: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Apply low stock filtering if requested
    if (lowStock) {
      inventory = inventory.filter((item: any) =>
        item.quantity === 0 || item.quantity <= item.minThreshold
      );
    }

    // Apply pagination
    const total = inventory.length;
    const paginatedInventory = inventory.slice(offset, offset + limit);

    // Add stock status to each item
    const inventoryWithStatus = paginatedInventory.map((item: any) => ({
      ...item,
      stockStatus: item.quantity === 0 ? 'OUT_OF_STOCK' :
                   item.quantity <= item.minThreshold ? 'LOW_STOCK' : 'IN_STOCK',
      needsReorder: item.quantity <= item.minThreshold,
    }));

    logger.info('Inventory retrieved successfully', {
      count: inventory.length,
      total,
      filters: { lowStock, outOfStock, supplier },
    });

    res.json({
      success: true,
      data: {
        inventory: inventoryWithStatus,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        summary: {
          totalItems: total,
          lowStockItems: inventoryWithStatus.filter((item: any) => item.stockStatus === 'LOW_STOCK').length,
          outOfStockItems: inventoryWithStatus.filter((item: any) => item.stockStatus === 'OUT_OF_STOCK').length,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve inventory', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory',
    });
  }
};

export const getInventoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    const inventory = await (prisma as any).inventory.findUnique({
      where: { productId: Number(id) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
            isAvailable: true,
          },
        },
      },
    });

    if (!inventory) {
      logger.warn('Inventory not found', { productId: id });
      return res.status(404).json({
        success: false,
        error: 'Inventory not found for this product',
      });
    }

    // Add stock status
    const inventoryWithStatus = {
      ...inventory,
      stockStatus: inventory.quantity === 0 ? 'OUT_OF_STOCK' :
                   inventory.quantity <= inventory.minThreshold ? 'LOW_STOCK' : 'IN_STOCK',
      needsReorder: inventory.quantity <= inventory.minThreshold,
    };

    logger.info('Inventory item retrieved successfully', { productId: id, quantity: inventory.quantity });

    res.json({
      success: true,
      data: { inventory: inventoryWithStatus },
    });
  } catch (error) {
    logger.error('Failed to retrieve inventory item', { error, productId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve inventory item',
    });
  }
};

export const createInventory = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createInventorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid inventory data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid inventory data',
        details: error.details?.[0]?.message,
      });
    }

    const { productId, quantity, minThreshold, supplier } = value;

    // Check if product exists
    const product = await (prisma as any).product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if inventory already exists for this product
    const existingInventory = await (prisma as any).inventory.findUnique({
      where: { productId },
    });

    if (existingInventory) {
      return res.status(409).json({
        success: false,
        error: 'Inventory already exists for this product',
      });
    }

    // Create inventory
    const inventory = await (prisma as any).inventory.create({
      data: {
        productId,
        quantity,
        minThreshold,
        supplier,
        lastRestocked: quantity > 0 ? new Date() : null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
    });

    logger.info('Inventory created successfully', {
      productId,
      productName: product.name,
      quantity,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Inventory created successfully',
      data: { inventory },
    });
  } catch (error: any) {
    logger.error('Failed to create inventory', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create inventory',
    });
  }
};

export const updateInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    // Validate request body
    const { error, value } = updateInventorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid inventory update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid inventory update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if inventory exists
    const existingInventory = await (prisma as any).inventory.findUnique({
      where: { productId: Number(id) },
    });

    if (!existingInventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found for this product',
      });
    }

    // Update inventory
    const updatedInventory = await (prisma as any).inventory.update({
      where: { productId: Number(id) },
      data: value,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
    });

    logger.info('Inventory updated successfully', {
      productId: id,
      changes: value,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: { inventory: updatedInventory },
    });
  } catch (error) {
    logger.error('Failed to update inventory', { error, productId: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update inventory',
    });
  }
};

export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    // Validate request body
    const { error, value } = stockAdjustmentSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid stock adjustment data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid stock adjustment data',
        details: error.details?.[0]?.message,
      });
    }

    const { quantity: adjustment, reason, notes } = value;

    // Check if inventory exists
    const existingInventory = await (prisma as any).inventory.findUnique({
      where: { productId: Number(id) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingInventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found for this product',
      });
    }

    // Calculate new quantity
    const newQuantity = Math.max(0, existingInventory.quantity + adjustment);

    // Update inventory
    const updatedInventory = await (prisma as any).inventory.update({
      where: { productId: Number(id) },
      data: {
        quantity: newQuantity,
        lastRestocked: adjustment > 0 ? new Date() : existingInventory.lastRestocked,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
    });

    logger.info('Stock adjusted successfully', {
      productId: id,
      productName: existingInventory.product.name,
      oldQuantity: existingInventory.quantity,
      adjustment,
      newQuantity,
      reason,
      adjustedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        inventory: updatedInventory,
        adjustment: {
          previousQuantity: existingInventory.quantity,
          adjustment,
          newQuantity,
          reason,
          notes,
          adjustedAt: new Date(),
          adjustedBy: (req.user as JWTPayload)?.userId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to adjust stock', { error, productId: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to adjust stock',
    });
  }
};

export const deleteInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    // Check if inventory exists
    const existingInventory = await (prisma as any).inventory.findUnique({
      where: { productId: Number(id) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingInventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory not found for this product',
      });
    }

    // Delete inventory
    await (prisma as any).inventory.delete({
      where: { productId: Number(id) },
    });

    logger.info('Inventory deleted successfully', {
      productId: id,
      productName: existingInventory.product.name,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Inventory deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete inventory', { error, productId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory',
    });
  }
};

export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    // Get all inventory items that are low on stock
    const lowStockItems = await (prisma as any).inventory.findMany({
      where: {
        OR: [
          { quantity: 0 },
          {
            AND: [
              { quantity: { lte: (prisma as any).inventory.fields.minThreshold } },
              { quantity: { gt: 0 } },
            ],
          },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    // Add alert information
    const alerts = lowStockItems.map((item: any) => ({
      productId: item.productId,
      productName: item.product.name,
      category: item.product.category,
      currentQuantity: item.quantity,
      minThreshold: item.minThreshold,
      supplier: item.supplier,
      lastRestocked: item.lastRestocked,
      alertType: item.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      urgency: item.quantity === 0 ? 'CRITICAL' :
               item.quantity <= item.minThreshold * 0.5 ? 'HIGH' : 'MEDIUM',
      suggestedReorderQuantity: Math.max(item.minThreshold * 2 - item.quantity, 10),
    }));

    logger.info('Low stock alerts retrieved successfully', {
      alertCount: alerts.length,
      criticalCount: alerts.filter((a: any) => a.urgency === 'CRITICAL').length,
    });

    res.json({
      success: true,
      data: {
        alerts,
        summary: {
          totalAlerts: alerts.length,
          outOfStock: alerts.filter((a: any) => a.alertType === 'OUT_OF_STOCK').length,
          lowStock: alerts.filter((a: any) => a.alertType === 'LOW_STOCK').length,
          critical: alerts.filter((a: any) => a.urgency === 'CRITICAL').length,
          high: alerts.filter((a: any) => a.urgency === 'HIGH').length,
          medium: alerts.filter((a: any) => a.urgency === 'MEDIUM').length,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get low stock alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get low stock alerts',
    });
  }
};