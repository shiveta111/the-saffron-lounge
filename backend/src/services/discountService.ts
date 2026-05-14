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
  defaultMeta: { service: 'discount-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/discount-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/discount.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface DiscountValidation {
  valid: boolean;
  promotion?: any;
  discountAmount?: number;
  message?: string;
}

export interface DiscountCalculation {
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  discountType: string;
  discountValue: number;
}

export class DiscountService {
  /**
   * Validate discount code
   * @param code - Discount code
   * @param userId - User ID
   * @param orderTotal - Order total amount
   * @param items - Order items
   * @returns Validation result
   */
  async validateCode(
    code: string,
    userId: number,
    orderTotal: number,
    items?: Array<{ productId: number; quantity: number }>
  ): Promise<DiscountValidation> {
    try {
      // Find promotion by code
      const promotion = await (prisma as any).promotion.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          applicableItems: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!promotion) {
        return {
          valid: false,
          message: 'Invalid discount code',
        };
      }

      // Check if promotion is active
      if (!promotion.isActive) {
        return {
          valid: false,
          message: 'This discount code is no longer active',
        };
      }

      // Check validity period
      const now = new Date();
      if (promotion.validFrom && new Date(promotion.validFrom) > now) {
        return {
          valid: false,
          message: 'This discount code is not yet valid',
        };
      }

      if (promotion.validTo && new Date(promotion.validTo) < now) {
        return {
          valid: false,
          message: 'This discount code has expired',
        };
      }

      // Check usage limit
      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        return {
          valid: false,
          message: 'This discount code has reached its usage limit',
        };
      }

      // Check minimum order value
      if (promotion.minOrderValue && orderTotal < promotion.minOrderValue) {
        return {
          valid: false,
          message: `Minimum order value of £${promotion.minOrderValue.toFixed(2)} required`,
        };
      }

      // Check per-user limit
      if (promotion.userLimit) {
        const userUsageCount = await this.getUserUsageCount(code, userId);
        if (userUsageCount >= promotion.userLimit) {
          return {
            valid: false,
            message: 'You have already used this discount code the maximum number of times',
          };
        }
      }

      // Check first order only restriction
      if (promotion.firstOrderOnly) {
        const userOrderCount = await (prisma as any).order.count({
          where: {
            customerId: userId,
            status: { not: 'CANCELLED' },
          },
        });

        if (userOrderCount > 0) {
          return {
            valid: false,
            message: 'This discount is only valid for first-time orders',
          };
        }
      }

      // Check item-specific discounts
      if (promotion.applicableItems && promotion.applicableItems.length > 0 && items) {
        const applicableItemIds = promotion.applicableItems.map((item: any) => item.id);
        const hasApplicableItems = items.some(item =>
          applicableItemIds.includes(item.productId)
        );

        if (!hasApplicableItems) {
          return {
            valid: false,
            message: 'This discount is not applicable to items in your cart',
          };
        }
      }

      // Calculate discount amount
      const discountAmount = this.calculateDiscountAmount(
        promotion,
        orderTotal,
        items
      );

      logger.info('Discount code validated successfully', {
        code,
        userId,
        orderTotal,
        discountAmount,
      });

      return {
        valid: true,
        promotion,
        discountAmount,
      };
    } catch (error) {
      logger.error('Failed to validate discount code', { error, code, userId });
      return {
        valid: false,
        message: 'Failed to validate discount code',
      };
    }
  }

  /**
   * Calculate discount amount
   * @param promotion - Promotion object
   * @param orderTotal - Order total
   * @param items - Order items (for item-specific discounts)
   * @returns Discount amount
   */
  private calculateDiscountAmount(
    promotion: any,
    orderTotal: number,
    items?: Array<{ productId: number; quantity: number; price?: number }>
  ): number {
    let discountAmount = 0;

    if (promotion.discountType === 'PERCENTAGE') {
      discountAmount = (orderTotal * promotion.discountValue) / 100;
    } else if (promotion.discountType === 'FIXED') {
      discountAmount = promotion.discountValue;
    }

    // Apply maximum discount limit if set
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }

    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Apply discount to order
   * @param code - Discount code
   * @param userId - User ID
   * @param orderTotal - Order total
   * @param items - Order items
   * @returns Discount calculation
   */
  async applyDiscount(
    code: string,
    userId: number,
    orderTotal: number,
    items?: Array<{ productId: number; quantity: number }>
  ): Promise<DiscountCalculation | null> {
    try {
      const validation = await this.validateCode(code, userId, orderTotal, items);

      if (!validation.valid || !validation.promotion || validation.discountAmount === undefined) {
        return null;
      }

      const discountAmount = validation.discountAmount;
      const finalTotal = Math.max(0, orderTotal - discountAmount);

      return {
        originalTotal: orderTotal,
        discountAmount,
        finalTotal,
        discountType: validation.promotion.discountType,
        discountValue: validation.promotion.discountValue,
      };
    } catch (error) {
      logger.error('Failed to apply discount', { error, code, userId });
      return null;
    }
  }

  /**
   * Increment usage count for a discount code
   * @param code - Discount code
   * @param userId - User ID
   */
  async incrementUsage(code: string, userId: number): Promise<void> {
    try {
      await (prisma as any).promotion.update({
        where: { code: code.toUpperCase() },
        data: {
          usedCount: { increment: 1 },
        },
      });

      logger.info('Discount usage incremented', { code, userId });
    } catch (error) {
      logger.error('Failed to increment discount usage', { error, code, userId });
    }
  }

  /**
   * Get user usage count for a discount code
   * @param code - Discount code
   * @param userId - User ID
   * @returns Usage count
   */
  private async getUserUsageCount(code: string, userId: number): Promise<number> {
    try {
      const count = await (prisma as any).order.count({
        where: {
          customerId: userId,
          discountCode: code.toUpperCase(),
          status: { not: 'CANCELLED' },
        },
      });

      return count;
    } catch (error) {
      logger.error('Failed to get user usage count', { error, code, userId });
      return 0;
    }
  }

  /**
   * Check if user is eligible for a discount
   * @param code - Discount code
   * @param userId - User ID
   * @returns Eligibility status
   */
  async checkEligibility(code: string, userId: number): Promise<boolean> {
    try {
      const promotion = await (prisma as any).promotion.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promotion || !promotion.isActive) {
        return false;
      }

      // Check per-user limit
      if (promotion.userLimit) {
        const userUsageCount = await this.getUserUsageCount(code, userId);
        if (userUsageCount >= promotion.userLimit) {
          return false;
        }
      }

      // Check first order only
      if (promotion.firstOrderOnly) {
        const userOrderCount = await (prisma as any).order.count({
          where: {
            customerId: userId,
            status: { not: 'CANCELLED' },
          },
        });

        if (userOrderCount > 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check eligibility', { error, code, userId });
      return false;
    }
  }
}

// Export singleton instance
export const discountService = new DiscountService();