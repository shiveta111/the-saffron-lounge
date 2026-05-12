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
  defaultMeta: { service: 'promotion-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/promotions-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/promotions.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface ApplicablePromotion {
  promotion: any;
  discountAmount: number;
  bogoItems?: Array<{ productId?: number; menuId?: number; quantity: number }>;
}

export interface PromotionCalculation {
  subtotal: number;
  discountAmount: number;
  appliedPromotions: Array<{ id: number; name: string; discountAmount: number; type: string }>;
  bogoItems?: Array<{ productId?: number; menuId?: number; quantity: number }>;
  finalTotal: number;
}

export class PromotionService {
  /**
   * Get all applicable promotions for a cart
   */
  async getApplicablePromotions(cart: any, userId?: number): Promise<any[]> {
    try {
      const now = new Date();
      const cartProductIds: number[] = [];
      const cartMenuIds: number[] = [];
      const cartCategoryIds: Set<number> = new Set();

      // Extract product IDs, menu IDs, and category IDs from cart
      for (const item of cart.items || []) {
        if (item.productId) {
          cartProductIds.push(item.productId);
          if (item.product?.categoryId) {
            cartCategoryIds.add(item.product.categoryId);
          }
        }
        if (item.menuId) {
          cartMenuIds.push(item.menuId);
          if (item.menu?.categoryId) {
            cartCategoryIds.add(item.menu.categoryId);
          }
        }
      }

      // Calculate cart subtotal
      const subtotal = this.calculateCartSubtotal(cart);

      // Get all active promotions
      const promotions = await prisma.promotion.findMany({
        where: {
          isActive: true,
          validFrom: { lte: now },
          OR: [
            { validTo: null },
            { validTo: { gte: now } },
          ],
        },
        include: {
          products: true,
        },
        orderBy: {
          priority: 'desc',
        },
      });

      const applicablePromotions: any[] = [];

      for (const promotion of promotions) {
        const isValid = await this.validatePromotionApplicability(
          promotion,
          cart,
          userId,
          subtotal,
          cartProductIds,
          cartMenuIds,
          Array.from(cartCategoryIds)
        );

        if (isValid) {
          applicablePromotions.push(promotion);
        }
      }

      return applicablePromotions;
    } catch (error) {
      logger.error('Failed to get applicable promotions', { error });
      return [];
    }
  }

  /**
   * Calculate best discount from applicable promotions
   */
  async calculateBestDiscount(cart: any, userId?: number): Promise<PromotionCalculation | null> {
    try {
      const applicablePromotions = await this.getApplicablePromotions(cart, userId);
      
      if (applicablePromotions.length === 0) {
        return null;
      }

      // Get highest priority promotion (already sorted by priority desc)
      const bestPromotion = applicablePromotions[0];
      const subtotal = this.calculateCartSubtotal(cart);

      let discountAmount = 0;
      let bogoItems: Array<{ productId?: number; menuId?: number; quantity: number }> | undefined = undefined;

      if (bestPromotion.type === 'BOGO') {
        const bogoResult = await this.applyBOGOPromotion(cart, bestPromotion);
        discountAmount = bogoResult.discountAmount;
        bogoItems = bogoResult.bogoItems;
      } else {
        discountAmount = this.calculateDiscountAmount(bestPromotion, subtotal);
      }

      const result: PromotionCalculation = {
        subtotal,
        discountAmount,
        appliedPromotions: [{
          id: bestPromotion.id,
          name: bestPromotion.name,
          discountAmount,
          type: bestPromotion.type,
        }],
        finalTotal: Math.max(0, subtotal - discountAmount),
      };

      if (bogoItems !== undefined) {
        result.bogoItems = bogoItems;
      }

      return result;
    } catch (error) {
      logger.error('Failed to calculate best discount', { error });
      return null;
    }
  }

  /**
   * Apply BOGO promotion
   */
  async applyBOGOPromotion(
    cart: any,
    promotion: any
  ): Promise<{ discountAmount: number; bogoItems: Array<{ productId?: number; menuId?: number; quantity: number }> }> {
    try {
      const buyQuantity = promotion.bogoBuyQuantity || 1;
      const getQuantity = promotion.bogoGetQuantity || 1;
      const bogoItems: Array<{ productId?: number; menuId?: number; quantity: number }> = [];
      let discountAmount = 0;

      if (promotion.bogoProductId) {
        // Specific product BOGO
        const cartItem = cart.items.find((item: any) => item.productId === promotion.bogoProductId);
        if (cartItem) {
          const freeQuantity = Math.floor(cartItem.quantity / buyQuantity) * getQuantity;
          if (freeQuantity > 0) {
            const itemPrice = cartItem.product?.price || cartItem.price;
            discountAmount = freeQuantity * itemPrice;
            bogoItems.push({
              productId: promotion.bogoProductId,
              quantity: freeQuantity,
            });
          }
        }
      } else {
        // Apply to all applicable items
        const applicableItems = this.getApplicableItems(cart, promotion);
        for (const item of applicableItems) {
          const freeQuantity = Math.floor(item.quantity / buyQuantity) * getQuantity;
          if (freeQuantity > 0) {
            const itemPrice = item.product?.price || item.menu?.price || item.price;
            discountAmount += freeQuantity * itemPrice;
            bogoItems.push({
              productId: item.productId,
              menuId: item.menuId,
              quantity: freeQuantity,
            });
          }
        }
      }

      return { discountAmount, bogoItems };
    } catch (error) {
      logger.error('Failed to apply BOGO promotion', { error });
      return { discountAmount: 0, bogoItems: [] };
    }
  }

  /**
   * Check if promotion is in happy hour
   */
  checkHappyHour(promotion: any): boolean {
    if (promotion.type !== 'HAPPY_HOURS' || !promotion.happyHourStart || !promotion.happyHourEnd) {
      return true; // Not a happy hour promotion or times not set
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if current day is in happy hour days
    if (promotion.happyHourDays) {
      try {
        const days = JSON.parse(promotion.happyHourDays);
        if (!days.includes(currentDay)) {
          return false;
        }
      } catch (error) {
        logger.warn('Invalid happyHourDays JSON', { promotionId: promotion.id });
      }
    }

    // Check if current time is within happy hour range
    return currentTime >= promotion.happyHourStart && currentTime <= promotion.happyHourEnd;
  }

  /**
   * Check first order eligibility
   */
  async checkFirstOrderEligibility(userId: number, promotion: any): Promise<boolean> {
    if (!promotion.firstOrderOnly || !userId) {
      return true;
    }

    try {
      // Check if user has any completed orders
      const existingOrder = await prisma.order.findFirst({
        where: {
          customerId: userId,
          status: { in: ['DELIVERED'] },
        },
      });

      return !existingOrder; // Eligible if no completed orders
    } catch (error) {
      logger.error('Failed to check first order eligibility', { error, userId });
      return false;
    }
  }

  /**
   * Validate promotion applicability
   */
  async validatePromotionApplicability(
    promotion: any,
    cart: any,
    userId?: number,
    subtotal?: number,
    cartProductIds?: number[],
    cartMenuIds?: number[],
    cartCategoryIds?: number[]
  ): Promise<boolean> {
    try {
      // Check if promotion is active and within date range
      const now = new Date();
      if (!promotion.isActive) return false;
      if (now < promotion.validFrom) return false;
      if (promotion.validTo && now > promotion.validTo) return false;

      // Check usage limits
      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        return false;
      }

      // Check happy hour
      if (!this.checkHappyHour(promotion)) {
        return false;
      }

      // Check first order eligibility
      if (userId && promotion.firstOrderOnly) {
        const isEligible = await this.checkFirstOrderEligibility(userId, promotion);
        if (!isEligible) return false;
      }

      // Check user limit
      if (userId && promotion.userLimit) {
        const usageCount = await prisma.promotionUsage.count({
          where: {
            promotionId: promotion.id,
            userId,
          },
        });
        if (usageCount >= promotion.userLimit) {
          return false;
        }
      }

      // Calculate subtotal if not provided
      const cartSubtotal = subtotal || this.calculateCartSubtotal(cart);

      // Check minimum order value
      if (promotion.minOrderValue && cartSubtotal < promotion.minOrderValue) {
        return false;
      }

      // Check applicability type
      if (promotion.applicableType === 'ALL_PRODUCTS') {
        return true;
      }

      if (promotion.applicableType === 'SPECIFIC_PRODUCTS') {
        const productIds = promotion.productIds ? JSON.parse(promotion.productIds) : [];
        const hasProduct = cartProductIds?.some(id => productIds.includes(id)) ?? false;
        const hasMenu = cartMenuIds?.some(id => {
          // Check if menu contains any of the products
          const menuItem = cart.items.find((item: any) => item.menuId === id);
          if (menuItem?.menu?.menuProducts) {
            return menuItem.menu.menuProducts.some((mp: any) => productIds.includes(mp.productId));
          }
          return false;
        }) ?? false;
        return hasProduct || hasMenu;
      }

      if (promotion.applicableType === 'SPECIFIC_CATEGORIES') {
        const categoryIds = promotion.categoryIds ? JSON.parse(promotion.categoryIds) : [];
        return cartCategoryIds?.some(id => categoryIds.includes(id)) || false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate promotion applicability', { error, promotionId: promotion.id });
      return false;
    }
  }

  /**
   * Auto-apply eligible promotions
   */
  async autoApplyPromotions(cart: any, userId?: number): Promise<PromotionCalculation | null> {
    try {
      const applicablePromotions = await this.getApplicablePromotions(cart, userId);
      const autoApplyPromotions = applicablePromotions.filter((p: any) => p.autoApply && !p.requiresCouponCode);

      if (autoApplyPromotions.length === 0) {
        return null;
      }

      // Get highest priority auto-apply promotion
      const bestPromotion = autoApplyPromotions[0];
      return await this.calculateBestDiscount(cart, userId);
    } catch (error) {
      logger.error('Failed to auto-apply promotions', { error });
      return null;
    }
  }

  /**
   * Calculate discount amount
   */
  calculateDiscountAmount(promotion: any, orderTotal: number): number {
    let discount = 0;

    if (promotion.discountType === 'PERCENTAGE') {
      discount = (orderTotal * promotion.discountValue) / 100;
    } else if (promotion.discountType === 'FIXED') {
      discount = Math.min(promotion.discountValue, orderTotal);
    }

    // Apply max discount limit if set
    if (promotion.maxDiscount && discount > promotion.maxDiscount) {
      discount = promotion.maxDiscount;
    }

    return Math.max(0, discount);
  }

  /**
   * Calculate cart subtotal
   */
  calculateCartSubtotal(cart: any): number {
    return (cart.items || []).reduce((sum: number, item: any) => {
      const itemPrice = item.menuId && item.menu
        ? (item.menu.price || item.price)
        : (item.product?.price || item.price);
      return sum + (itemPrice * item.quantity);
    }, 0);
  }

  /**
   * Get applicable items from cart based on promotion
   */
  getApplicableItems(cart: any, promotion: any): any[] {
    const applicableItems: any[] = [];

    if (promotion.applicableType === 'ALL_PRODUCTS') {
      return cart.items || [];
    }

    if (promotion.applicableType === 'SPECIFIC_PRODUCTS') {
      const productIds = promotion.productIds ? JSON.parse(promotion.productIds) : [];
      return (cart.items || []).filter((item: any) => {
        if (item.productId && productIds.includes(item.productId)) {
          return true;
        }
        if (item.menuId && item.menu?.menuProducts) {
          return item.menu.menuProducts.some((mp: any) => productIds.includes(mp.productId));
        }
        return false;
      });
    }

    if (promotion.applicableType === 'SPECIFIC_CATEGORIES') {
      const categoryIds = promotion.categoryIds ? JSON.parse(promotion.categoryIds) : [];
      return (cart.items || []).filter((item: any) => {
        const itemCategoryId = item.product?.categoryId || item.menu?.categoryId;
        return itemCategoryId && categoryIds.includes(itemCategoryId);
      });
    }

    return applicableItems;
  }

  /**
   * Track promotion usage
   */
  async trackPromotionUsage(promotionId: number, userId: number, orderId?: number): Promise<void> {
    try {
      await prisma.promotionUsage.upsert({
        where: {
          promotionId_userId: {
            promotionId,
            userId,
          },
        },
        create: {
          promotionId,
          userId,
          orderId: orderId || null,
        },
        update: {
          orderId: orderId || null,
          usedAt: new Date(),
        },
      });

      // Increment usage count
      await prisma.promotion.update({
        where: { id: promotionId },
        data: {
          usedCount: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Failed to track promotion usage', { error, promotionId, userId });
    }
  }
}

export const promotionService = new PromotionService();

















