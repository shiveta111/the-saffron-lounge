import QRCode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';
import * as winston from 'winston';
import { env } from '../config/env';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'qrcode-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/qrcode-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/qrcode.log' }),
  ],
});

if (env.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  quality?: number;
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export class QRCodeService {
  private readonly qrCodeDir: string;
  private readonly baseUrl: string;

  constructor() {
    // QR codes will be stored in public/qr-codes directory
    this.qrCodeDir = path.join(process.cwd(), 'public', 'qr-codes');
    this.baseUrl = env.urls.frontend;
  }

  /**
   * Initialize QR code directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.qrCodeDir, { recursive: true });
      logger.info('QR code directory initialized', { path: this.qrCodeDir });
    } catch (error) {
      logger.error('Failed to initialize QR code directory', { error });
      throw new Error('Failed to initialize QR code directory');
    }
  }

  /**
   * Generate QR code for a table
   * @param tableId - The table ID
   * @param tableNumber - The table number for filename
   * @param options - QR code generation options
   * @returns Path to the generated QR code image
   */
  async generateTableQRCode(
    tableId: number,
    tableNumber: string,
    options?: QRCodeOptions
  ): Promise<string> {
    try {
      // Ensure directory exists
      await this.initialize();

      // Generate URL that the QR code will point to
      const tableUrl = `${this.baseUrl}/table/${tableId}`;

      // Generate filename
      const filename = `table-${tableNumber.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      const filePath = path.join(this.qrCodeDir, filename);

      // Default QR code options
      const qrOptions: any = {
        errorCorrectionLevel: 'H', // High error correction
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        ...options,
      };

      // Generate QR code and save to file
      await QRCode.toFile(filePath, tableUrl, qrOptions);

      logger.info('QR code generated successfully', {
        tableId,
        tableNumber,
        filename,
        url: tableUrl,
      });

      // Return the relative path for storage in database
      return `/qr-codes/${filename}`;
    } catch (error) {
      logger.error('Failed to generate QR code', {
        error,
        tableId,
        tableNumber,
      });
      throw new Error(`Failed to generate QR code: ${(error as Error).message}`);
    }
  }

  /**
   * Generate QR code as base64 data URL (for immediate display)
   * @param tableId - The table ID
   * @param options - QR code generation options
   * @returns Base64 data URL
   */
  async generateTableQRCodeDataURL(
    tableId: number,
    options?: QRCodeOptions
  ): Promise<string> {
    try {
      const tableUrl = `${this.baseUrl}/table/${tableId}`;

      const qrOptions: any = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        ...options,
      };

      const dataUrl = await QRCode.toDataURL(tableUrl, qrOptions);

      logger.info('QR code data URL generated', { tableId });

      return dataUrl;
    } catch (error) {
      logger.error('Failed to generate QR code data URL', {
        error,
        tableId,
      });
      throw new Error(`Failed to generate QR code data URL: ${(error as Error).message}`);
    }
  }

  /**
   * Delete QR code file
   * @param qrCodePath - Path to the QR code file (relative)
   */
  async deleteQRCode(qrCodePath: string): Promise<void> {
    try {
      if (!qrCodePath) {
        return;
      }

      // Extract filename from path
      const filename = path.basename(qrCodePath);
      const filePath = path.join(this.qrCodeDir, filename);

      // Check if file exists
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        logger.info('QR code deleted', { path: qrCodePath });
      } catch (error) {
        // File doesn't exist, ignore
        logger.warn('QR code file not found for deletion', { path: qrCodePath });
      }
    } catch (error) {
      logger.error('Failed to delete QR code', { error, path: qrCodePath });
      throw new Error(`Failed to delete QR code: ${(error as Error).message}`);
    }
  }

  /**
   * Regenerate QR code for a table
   * @param tableId - The table ID
   * @param tableNumber - The table number
   * @param oldQRCodePath - Path to old QR code to delete
   * @param options - QR code generation options
   * @returns Path to the new QR code image
   */
  async regenerateTableQRCode(
    tableId: number,
    tableNumber: string,
    oldQRCodePath?: string,
    options?: QRCodeOptions
  ): Promise<string> {
    try {
      // Delete old QR code if exists
      if (oldQRCodePath) {
        await this.deleteQRCode(oldQRCodePath);
      }

      // Generate new QR code
      const newQRCodePath = await this.generateTableQRCode(
        tableId,
        tableNumber,
        options
      );

      logger.info('QR code regenerated', {
        tableId,
        tableNumber,
        oldPath: oldQRCodePath,
        newPath: newQRCodePath,
      });

      return newQRCodePath;
    } catch (error) {
      logger.error('Failed to regenerate QR code', {
        error,
        tableId,
        tableNumber,
      });
      throw new Error(`Failed to regenerate QR code: ${(error as Error).message}`);
    }
  }

  /**
   * Get full file system path for a QR code
   * @param qrCodePath - Relative QR code path
   * @returns Full file system path
   */
  getQRCodeFilePath(qrCodePath: string): string {
    const filename = path.basename(qrCodePath);
    return path.join(this.qrCodeDir, filename);
  }

  /**
   * Check if QR code file exists
   * @param qrCodePath - Relative QR code path
   * @returns True if file exists
   */
  async qrCodeExists(qrCodePath: string): Promise<boolean> {
    try {
      const filePath = this.getQRCodeFilePath(qrCodePath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Batch generate QR codes for multiple tables
   * @param tables - Array of table objects with id and tableNumber
   * @param options - QR code generation options
   * @returns Array of results with success status and paths
   */
  async batchGenerateQRCodes(
    tables: Array<{ id: number; tableNumber: string }>,
    options?: QRCodeOptions
  ): Promise<Array<{ tableId: number; success: boolean; qrCodePath?: string; error?: string }>> {
    const results = [];

    for (const table of tables) {
      try {
        const qrCodePath = await this.generateTableQRCode(
          table.id,
          table.tableNumber,
          options
        );
        results.push({
          tableId: table.id,
          success: true,
          qrCodePath,
        });
      } catch (error) {
        results.push({
          tableId: table.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    logger.info('Batch QR code generation completed', {
      total: tables.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return results;
  }
}

// Export singleton instance
export const qrCodeService = new QRCodeService();