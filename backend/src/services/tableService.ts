import prisma from '../config/prisma';
import * as winston from 'winston';
import { qrCodeService } from './qrcodeService';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'table-service' },
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

export interface CreateTableData {
  tableNumber: string;
  capacity: number;
  location?: string;
  isActive?: boolean;
}

export interface UpdateTableData {
  tableNumber?: string;
  capacity?: number;
  location?: string;
  isActive?: boolean;
}

export interface TableFilters {
  isActive?: boolean;
  location?: string;
}

export class TableService {
  /**
   * Get all tables with optional filtering and pagination
   */
  async getAllTables(
    page: number = 1,
    limit: number = 10,
    filters: TableFilters = {},
    sortBy: string = 'tableNumber',
    order: 'asc' | 'desc' = 'asc'
  ) {
    try {
      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.location) where.location = filters.location;

      // Get tables with counts
      const tables = await (prisma as any).table.findMany({
        where,
        orderBy: { [sortBy]: order },
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
        filters,
      });

      return {
        tables,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve tables', { error, filters });
      throw new Error('Failed to retrieve tables');
    }
  }

  /**
   * Get table by ID with related data
   */
  async getTableById(id: number) {
    try {
      const table = await (prisma as any).table.findUnique({
        where: { id },
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
        return null;
      }

      logger.info('Table retrieved successfully', { id });
      return table;
    } catch (error) {
      logger.error('Failed to retrieve table', { error, id });
      throw new Error('Failed to retrieve table');
    }
  }

  /**
   * Create a new table with QR code generation
   */
  async createTable(data: CreateTableData) {
    try {
      // Check if table number already exists
      const existingTable = await (prisma as any).table.findUnique({
        where: { tableNumber: data.tableNumber },
      });

      if (existingTable) {
        logger.warn('Table number already exists', { tableNumber: data.tableNumber });
        throw new Error('Table number already exists');
      }

      // Create table first without QR code
      const table = await (prisma as any).table.create({
        data: {
          tableNumber: data.tableNumber,
          capacity: data.capacity,
          location: data.location,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
      });

      // Generate QR code
      try {
        const qrCodePath = await qrCodeService.generateTableQRCode(
          table.id,
          data.tableNumber
        );

        // Update table with QR code path
        const updatedTable = await (prisma as any).table.update({
          where: { id: table.id },
          data: { qrCode: qrCodePath },
        });

        logger.info('Table created successfully with QR code', {
          id: updatedTable.id,
          tableNumber: data.tableNumber,
          qrCodePath,
        });

        return updatedTable;
      } catch (qrError) {
        // If QR generation fails, still return the table but log the error
        logger.error('QR code generation failed for new table', {
          error: qrError,
          tableId: table.id,
        });

        return table;
      }
    } catch (error) {
      logger.error('Failed to create table', { error, data });
      throw error;
    }
  }

  /**
   * Update table
   */
  async updateTable(id: number, data: UpdateTableData) {
    try {
      // Check if table exists
      const existingTable = await (prisma as any).table.findUnique({
        where: { id },
      });

      if (!existingTable) {
        logger.warn('Table not found for update', { id });
        throw new Error('Table not found');
      }

      // If table number is being changed, check for duplicates
      if (data.tableNumber && data.tableNumber !== existingTable.tableNumber) {
        const duplicateTable = await (prisma as any).table.findUnique({
          where: { tableNumber: data.tableNumber },
        });

        if (duplicateTable) {
          logger.warn('Table number already exists', { tableNumber: data.tableNumber });
          throw new Error('Table number already exists');
        }

        // Regenerate QR code if table number changes
        try {
          const newQRCodePath = await qrCodeService.regenerateTableQRCode(
            id,
            data.tableNumber,
            existingTable.qrCode
          );
          (data as any).qrCode = newQRCodePath;
        } catch (qrError) {
          logger.error('Failed to regenerate QR code during update', {
            error: qrError,
            tableId: id,
          });
        }
      }

      // Update table
      const updatedTable = await (prisma as any).table.update({
        where: { id },
        data,
      });

      logger.info('Table updated successfully', {
        id,
        changes: Object.keys(data),
      });

      return updatedTable;
    } catch (error) {
      logger.error('Failed to update table', { error, id, data });
      throw error;
    }
  }

  /**
   * Delete table with validation
   */
  async deleteTable(id: number) {
    try {
      // Check if table exists and get counts
      const existingTable = await (prisma as any).table.findUnique({
        where: { id },
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
        throw new Error('Table not found');
      }

      // Check if table has active orders or reservations
      if (existingTable._count.orders > 0 || existingTable._count.reservations > 0) {
        logger.warn('Cannot delete table with existing orders or reservations', {
          id,
          orders: existingTable._count.orders,
          reservations: existingTable._count.reservations,
        });
        throw new Error('Cannot delete table with existing orders or reservations');
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
        where: { id },
      });

      logger.info('Table deleted successfully', {
        id,
        tableNumber: existingTable.tableNumber,
      });

      return { success: true, tableNumber: existingTable.tableNumber };
    } catch (error) {
      logger.error('Failed to delete table', { error, id });
      throw error;
    }
  }

  /**
   * Regenerate QR code for a table
   */
  async regenerateQRCode(id: number) {
    try {
      // Get table
      const table = await (prisma as any).table.findUnique({
        where: { id },
      });

      if (!table) {
        logger.warn('Table not found for QR regeneration', { id });
        throw new Error('Table not found');
      }

      // Regenerate QR code
      const newQRCodePath = await qrCodeService.regenerateTableQRCode(
        table.id,
        table.tableNumber,
        table.qrCode
      );

      // Update table with new QR code path
      const updatedTable = await (prisma as any).table.update({
        where: { id },
        data: { qrCode: newQRCodePath },
      });

      logger.info('QR code regenerated successfully', {
        id,
        tableNumber: table.tableNumber,
        newQRCodePath,
      });

      return updatedTable;
    } catch (error) {
      logger.error('Failed to regenerate QR code', { error, id });
      throw error;
    }
  }

  /**
   * Check if table has active orders or reservations
   */
  async hasActiveOrdersOrReservations(id: number): Promise<boolean> {
    try {
      const table = await (prisma as any).table.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true,
              reservations: true,
            },
          },
        },
      });

      if (!table) {
        return false;
      }

      return table._count.orders > 0 || table._count.reservations > 0;
    } catch (error) {
      logger.error('Failed to check table orders/reservations', { error, id });
      throw new Error('Failed to check table orders/reservations');
    }
  }

  /**
   * Batch generate QR codes for all tables
   */
  async batchGenerateQRCodes() {
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
        logger.warn('No tables found for batch QR generation');
        return { total: 0, successful: 0, failed: 0, results: [] };
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

      return {
        total: tables.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      logger.error('Failed to batch generate QR codes', { error });
      throw new Error('Failed to batch generate QR codes');
    }
  }
}

// Export singleton instance
export const tableService = new TableService();
