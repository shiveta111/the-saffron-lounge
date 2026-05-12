import * as winston from 'winston';
import prisma from '../config/prisma';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'delivery-service' },
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

export interface DeliveryZoneData {
  id: number;
  name: string;
  postcodes: string[];
  deliveryFee: number;
  minOrderValue?: number;
  estimatedTime: number;
  isActive: boolean;
}

export interface DeliveryFeeCalculation {
  zoneId: number;
  zoneName: string;
  baseFee: number;
  finalFee: number;
  isFreeDelivery: boolean;
  estimatedTime: number;
}

export class DeliveryService {
  /**
   * Find delivery zone by postcode
   * @param postcode - Postcode to search for
   * @returns Delivery zone or null
   */
  async findZoneByPostcode(postcode: string): Promise<DeliveryZoneData | null> {
    try {
      // Normalize postcode (remove spaces, uppercase)
      const normalizedPostcode = postcode.replace(/\s/g, '').toUpperCase();

      // Get all active delivery zones
      const zones = await (prisma as any).deliveryZone.findMany({
        where: { isActive: true },
      });

      // Find matching zone
      for (const zone of zones) {
        const postcodes = JSON.parse(zone.postcodes || '[]');
        
        // Check if postcode matches any in the zone
        const matches = postcodes.some((zonePostcode: string) => {
          const normalizedZonePostcode = zonePostcode.replace(/\s/g, '').toUpperCase();
          
          // Support partial matching (e.g., "SW1" matches "SW1A 1AA")
          return normalizedPostcode.startsWith(normalizedZonePostcode) ||
                 normalizedZonePostcode.startsWith(normalizedPostcode);
        });

        if (matches) {
          logger.info('Delivery zone found for postcode', {
            postcode: normalizedPostcode,
            zoneId: zone.id,
            zoneName: zone.name,
          });

          return {
            id: zone.id,
            name: zone.name,
            postcodes: JSON.parse(zone.postcodes),
            deliveryFee: zone.deliveryFee,
            minOrderValue: zone.minOrderValue,
            estimatedTime: zone.estimatedTime,
            isActive: zone.isActive,
          };
        }
      }

      logger.info('No delivery zone found for postcode', { postcode: normalizedPostcode });
      return null;
    } catch (error) {
      logger.error('Failed to find delivery zone', { error, postcode });
      throw new Error(`Failed to find delivery zone: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate delivery fee for an order
   * @param postcode - Delivery postcode
   * @param orderTotal - Order total amount
   * @returns Delivery fee calculation
   */
  async calculateDeliveryFee(
    postcode: string,
    orderTotal: number
  ): Promise<DeliveryFeeCalculation | null> {
    try {
      const zone = await this.findZoneByPostcode(postcode);

      if (!zone) {
        return null;
      }

      // Check if order qualifies for free delivery
      const isFreeDelivery = zone.minOrderValue
        ? orderTotal >= zone.minOrderValue
        : false;

      const finalFee = isFreeDelivery ? 0 : zone.deliveryFee;

      logger.info('Delivery fee calculated', {
        postcode,
        orderTotal,
        zoneId: zone.id,
        baseFee: zone.deliveryFee,
        finalFee,
        isFreeDelivery,
      });

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        baseFee: zone.deliveryFee,
        finalFee,
        isFreeDelivery,
        estimatedTime: zone.estimatedTime,
      };
    } catch (error) {
      logger.error('Failed to calculate delivery fee', { error, postcode, orderTotal });
      throw new Error(`Failed to calculate delivery fee: ${(error as Error).message}`);
    }
  }

  /**
   * Validate delivery address
   * @param address - Full delivery address
   * @param postcode - Postcode
   * @returns Validation result with zone info
   */
  async validateAddress(
    address: string,
    postcode: string
  ): Promise<{ valid: boolean; zone?: DeliveryZoneData; message?: string }> {
    try {
      // Basic address validation
      if (!address || address.trim().length < 10) {
        return {
          valid: false,
          message: 'Address must be at least 10 characters long',
        };
      }

      if (!postcode || postcode.trim().length < 3) {
        return {
          valid: false,
          message: 'Valid postcode is required',
        };
      }

      // Find delivery zone
      const zone = await this.findZoneByPostcode(postcode);

      if (!zone) {
        return {
          valid: false,
          message: 'We do not deliver to this postcode area',
        };
      }

      logger.info('Address validated successfully', {
        postcode,
        zoneId: zone.id,
      });

      return {
        valid: true,
        zone,
      };
    } catch (error) {
      logger.error('Address validation failed', { error, address, postcode });
      return {
        valid: false,
        message: 'Failed to validate address',
      };
    }
  }

  /**
   * Get all active delivery zones
   * @returns Array of active delivery zones
   */
  async getActiveZones(): Promise<DeliveryZoneData[]> {
    try {
      const zones = await (prisma as any).deliveryZone.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      return zones.map((zone: any) => ({
        id: zone.id,
        name: zone.name,
        postcodes: JSON.parse(zone.postcodes || '[]'),
        deliveryFee: zone.deliveryFee,
        minOrderValue: zone.minOrderValue,
        estimatedTime: zone.estimatedTime,
        isActive: zone.isActive,
      }));
    } catch (error) {
      logger.error('Failed to get active zones', { error });
      throw new Error(`Failed to get active zones: ${(error as Error).message}`);
    }
  }

  /**
   * Check if delivery is available for postcode
   * @param postcode - Postcode to check
   * @returns Boolean indicating availability
   */
  async isDeliveryAvailable(postcode: string): Promise<boolean> {
    try {
      const zone = await this.findZoneByPostcode(postcode);
      return zone !== null;
    } catch (error) {
      logger.error('Failed to check delivery availability', { error, postcode });
      return false;
    }
  }

  /**
   * Get estimated delivery time for postcode
   * @param postcode - Delivery postcode
   * @returns Estimated time in minutes or null
   */
  async getEstimatedDeliveryTime(postcode: string): Promise<number | null> {
    try {
      const zone = await this.findZoneByPostcode(postcode);
      return zone ? zone.estimatedTime : null;
    } catch (error) {
      logger.error('Failed to get estimated delivery time', { error, postcode });
      return null;
    }
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService();