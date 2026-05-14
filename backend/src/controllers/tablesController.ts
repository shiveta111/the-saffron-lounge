import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { qrCodeService } from '../services/qrcodeService';
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
  defaultMeta: { service: 'tables-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/tables-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/tables.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createTableSchema = Joi.object({
  tableNumber: Joi.string().required().max(50),
  capacity: Joi.number().integer().min(1).max(20).required(),
  location: Joi.string().max(255).optional(),
  isActive: Joi.boolean().optional().default(true),
});

const updateTableSchema = Joi.object({
  tableNumber: Joi.string().max(50).optional(),
  capacity: Joi.number().integer().min(1).max(20).optional(),
  location: Joi.string().max(255).optional(),
  isActive: Joi.boolean().optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  isActive: Joi.boolean().optional(),
  location: Joi.string().optional(),
  sort_by: Joi.string().valid('tableNumber', 'capacity', 'createdAt').optional().default('tableNumber'),
  order: Joi.string().valid('asc', 'desc').optional().default('asc'),
});

/**
 * Get all tables with pagination and filtering
 */
export const getAllTables = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { page, limit, isActive, location, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (location) where.location = location;

    // Get tables with pagination
    const tables = await (prisma as any).table.findMany({
      where,
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            orders: true,
            reservations: true,
          },
        },
      },
    });

    // Get total count
    const total = await (prisma as any).table.count({ where });

    logger.info('Tables retrieved successfully', {
      count: tables.length,
      total,
      page,
      limit,
    });

    res.json({
      success: true,
      data: {
        tables,
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
    logger.error('Failed to retrieve tables', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tables',
    });
  }
};

/**
 * Get table by ID
 */
export const getTableById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    const table = await (prisma as any).table.findUnique({
      where: { id: Number(id) },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        reservations: {
          take: 10,
          orderBy: { reservationDate: 'desc' },
          select: {
            id: true,
            guestName: true,
            partySize: true,
            reservationDate: true,
            reservationTime: true,
            status: true,
          },
        },
        _count: {
          select: {
            orders: true,
            reservations: true,
          },
        },
      },
    });

    if (!table) {
      logger.warn('Table not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    logger.info('Table retrieved successfully', { id });

    res.json({
      success: true,
      data: { table },
    });
  } catch (error) {
    logger.error('Failed to retrieve table', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve table',
    });
  }
};

/**
 * Create a new table with QR code
 */
export const createTable = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createTableSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid table data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid table data',
        details: error.details?.[0]?.message,
      });
    }

    const { tableNumber, capacity, location, isActive } = value;

    // Check if table number already exists
    const existingTable = await (prisma as any).table.findUnique({
      where: { tableNumber },
    });

    if (existingTable) {
      return res.status(409).json({
        success: false,
        error: 'Table number already exists',
      });
    }

    // Create table first without QR code
    const table = await (prisma as any).table.create({
      data: {
        tableNumber,
        capacity,
        location,
        isActive,
      },
    });

    // Generate QR code
    try {
      const qrCodePath = await qrCodeService.generateTableQRCode(
        table.id,
        tableNumber
      );

      // Update table with QR code path
      const updatedTable = await (prisma as any).table.update({
        where: { id: table.id },
        data: { qrCode: qrCodePath },
      });

      logger.info('Table created successfully with QR code', {
        id: updatedTable.id,
        tableNumber,
        qrCodePath,
      });

      // Broadcast TABLE_CREATED event via WebSocket
      wsManager.broadcastToRoom('tables', 'TABLE_CREATED', {
        table: updatedTable,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: 'Table created successfully',
        data: { table: updatedTable },
      });
    } catch (qrError) {
      // If QR generation fails, still return the table but log the error
      logger.error('QR code generation failed for new table', {
        error: qrError,
        tableId: table.id,
      });

      // Broadcast TABLE_CREATED event even if QR generation failed
      wsManager.broadcastToRoom('tables', 'TABLE_CREATED', {
        table,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: 'Table created but QR code generation failed',
        data: { table },
        warning: 'QR code could not be generated. Use regenerate endpoint.',
      });
    }
  } catch (error) {
    logger.error('Failed to create table', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create table',
    });
  }
};

/**
 * Update table
 */
export const updateTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Validate request body
    const { error, value } = updateTableSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid table update data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid table update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if table exists
    const existingTable = await (prisma as any).table.findUnique({
      where: { id: Number(id) },
    });

    if (!existingTable) {
      logger.warn('Table not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // If table number is being changed, check for duplicates
    if (value.tableNumber && value.tableNumber !== existingTable.tableNumber) {
      const duplicateTable = await (prisma as any).table.findUnique({
        where: { tableNumber: value.tableNumber },
      });

      if (duplicateTable) {
        return res.status(409).json({
          success: false,
          error: 'Table number already exists',
        });
      }

      // Regenerate QR code if table number changes
      try {
        const newQRCodePath = await qrCodeService.regenerateTableQRCode(
          Number(id),
          value.tableNumber,
          existingTable.qrCode
        );
        value.qrCode = newQRCodePath;
      } catch (qrError) {
        logger.error('Failed to regenerate QR code during update', {
          error: qrError,
          tableId: id,
        });
      }
    }

    // Update table
    const updatedTable = await (prisma as any).table.update({
      where: { id: Number(id) },
      data: value,
    });

    logger.info('Table updated successfully', {
      id,
      changes: Object.keys(value),
    });

    // Broadcast TABLE_UPDATED event via WebSocket
    wsManager.broadcastToRoom('tables', 'TABLE_UPDATED', {
      table: updatedTable,
      changes: Object.keys(value),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: { table: updatedTable },
    });
  } catch (error) {
    logger.error('Failed to update table', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update table',
    });
  }
};

/**
 * Delete table
 */
export const deleteTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Check if table exists
    const existingTable = await (prisma as any).table.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            orders: true,
            reservations: true,
          },
        },
      },
    });

    if (!existingTable) {
      logger.warn('Table not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Check if table has active orders or reservations
    if (existingTable._count.orders > 0 || existingTable._count.reservations > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete table with existing orders or reservations',
        details: {
          orders: existingTable._count.orders,
          reservations: existingTable._count.reservations,
        },
      });
    }

    // Delete QR code file
    if (existingTable.qrCode) {
      try {
        await qrCodeService.deleteQRCode(existingTable.qrCode);
      } catch (qrError) {
        logger.error('Failed to delete QR code file', {
          error: qrError,
          tableId: id,
          qrCodePath: existingTable.qrCode,
        });
      }
    }

    // Delete table
    await (prisma as any).table.delete({
      where: { id: Number(id) },
    });

    logger.info('Table deleted successfully', {
      id,
      tableNumber: existingTable.tableNumber,
    });

    // Broadcast TABLE_DELETED event via WebSocket
    wsManager.broadcastToRoom('tables', 'TABLE_DELETED', {
      tableId: Number(id),
      tableNumber: existingTable.tableNumber,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete table', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete table',
    });
  }
};

/**
 * Regenerate QR code for a table
 */
export const regenerateQRCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Get table
    const table = await (prisma as any).table.findUnique({
      where: { id: Number(id) },
    });

    if (!table) {
      logger.warn('Table not found for QR regeneration', { id });
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Regenerate QR code
    const newQRCodePath = await qrCodeService.regenerateTableQRCode(
      table.id,
      table.tableNumber,
      table.qrCode
    );

    // Update table with new QR code path
    const updatedTable = await (prisma as any).table.update({
      where: { id: Number(id) },
      data: { qrCode: newQRCodePath },
    });

    logger.info('QR code regenerated successfully', {
      id,
      tableNumber: table.tableNumber,
      newQRCodePath,
    });

    // Broadcast TABLE_QR_UPDATED event via WebSocket
    wsManager.broadcastToRoom('tables', 'TABLE_QR_UPDATED', {
      table: updatedTable,
      oldQRCode: table.qrCode,
      newQRCode: newQRCodePath,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'QR code regenerated successfully',
      data: { table: updatedTable },
    });
  } catch (error) {
    logger.error('Failed to regenerate QR code', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR code',
    });
  }
};

/**
 * Get QR code as data URL for immediate display
 */
export const getQRCodeDataURL = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table ID',
      });
    }

    // Check if table exists
    const table = await (prisma as any).table.findUnique({
      where: { id: Number(id) },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    // Generate QR code as data URL
    const dataUrl = await qrCodeService.generateTableQRCodeDataURL(Number(id));

    res.json({
      success: true,
      data: {
        tableId: table.id,
        tableNumber: table.tableNumber,
        qrCodeDataUrl: dataUrl,
      },
    });
  } catch (error) {
    logger.error('Failed to generate QR code data URL', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code data URL',
    });
  }
};

/**
 * Batch generate QR codes for all tables
 */
export const batchGenerateQRCodes = async (req: Request, res: Response) => {
  try {
    // Get all tables
    const tables = await (prisma as any).table.findMany({
      select: {
        id: true,
        tableNumber: true,
        qrCode: true,
      },
    });

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tables found',
      });
    }

    // Generate QR codes
    const results = await qrCodeService.batchGenerateQRCodes(tables);

    // Update tables with new QR code paths
    const updatePromises = results
      .filter(r => r.success && r.qrCodePath)
      .map(r =>
        (prisma as any).table.update({
          where: { id: r.tableId },
          data: { qrCode: r.qrCodePath },
        })
      );

    await Promise.all(updatePromises);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info('Batch QR code generation completed', {
      total: tables.length,
      successful,
      failed,
    });

    res.json({
      success: true,
      message: 'Batch QR code generation completed',
      data: {
        total: tables.length,
        successful,
        failed,
        results,
      },
    });
  } catch (error) {
    logger.error('Failed to batch generate QR codes', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to batch generate QR codes',
    });
  }
};