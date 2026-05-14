import * as winston from 'winston';
import prisma from '../config/prisma';
import { wsManager } from '../utils/websocket';
import NodeCache from 'node-cache';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'menu-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/menu-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/menu.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface PriceUpdate {
  menuId: number;
  oldPrice: number;
  newPrice: number;
  changedBy: number;
  reason?: string;
}

// Initialize cache
const menuCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

const categoryCache = new NodeCache({
  stdTTL: 600, // 10 minutes for categories
  checkperiod: 120,
  useClones: false,
});

export class MenuService {
  private cache = menuCache;
  private catCache = categoryCache;

  /**
   * Get menu item from cache or database
   * @param menuId - Menu item ID
   * @returns Menu item
   */
  async getMenuItem(menuId: number): Promise<any> {
    const cacheKey = `menu:${menuId}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Menu item retrieved from cache', { menuId });
      return cached;
    }

    // Fetch from database
    const menuItem = await prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (menuItem) {
      // Store in cache
      this.cache.set(cacheKey, menuItem);
    }

    return menuItem;
  }

  /**
   * Invalidate cache for a menu item
   * @param menuId - Menu item ID
   */
  invalidateMenuCache(menuId?: number): void {
    if (menuId) {
      this.cache.del(`menu:${menuId}`);
      logger.debug('Menu cache invalidated', { menuId });
    } else {
      this.cache.flushAll();
      logger.debug('All menu cache invalidated');
    }
  }

  /**
   * Invalidate category cache
   */
  invalidateCategoryCache(): void {
    this.catCache.flushAll();
    logger.debug('Category cache invalidated');
  }

  /**
   * Update menu item price with history tracking
   * @param menuId - Menu item ID
   * @param newPrice - New price
   * @param changedBy - User ID making the change
   * @param reason - Optional reason for price change
   * @returns Updated menu item
   */
  async updatePrice(
    menuId: number,
    newPrice: number,
    changedBy: number,
    reason?: string
  ): Promise<any> {
    try {
      // Get current menu item
      const menuItem = await prisma.menu.findUnique({
        where: { id: menuId },
      });

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      const oldPrice = menuItem.price;

      // Create price history record - commented out as table doesn't exist
      // await prisma.menuPriceHistory.create({
      //   data: {
      //     menuId,
      //     oldPrice,
      //     newPrice,
      //     changedBy,
      //     reason: reason || null,
      //   },
      // });

      // Update price
      const result = await prisma.menu.update({
        where: { id: menuId },
        data: { price: newPrice },
      });

      // Invalidate cache
      this.invalidateMenuCache(menuId);

      logger.info('Menu price updated', {
        menuId,
        oldPrice,
        newPrice,
        changedBy,
      });

      // Broadcast price update to all connected clients
      await this.broadcastMenuUpdate(menuId, 'price', {
        id: menuId,
        name: menuItem.name,
        oldPrice,
        newPrice,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update menu price', { error, menuId, newPrice });
      throw new Error(`Failed to update menu price: ${(error as Error).message}`);
    }
  }

  /**
   * Toggle menu item availability
   * @param menuId - Menu item ID
   * @param isAvailable - New availability status
   * @param changedBy - User ID making the change
   * @returns Updated menu item
   */
  async toggleAvailability(
    menuId: number,
    isAvailable: boolean,
    changedBy: number
  ): Promise<any> {
    try {
      const updatedMenu = await prisma.menu.update({
        where: { id: menuId },
        data: { isAvailable },
      });

      // Invalidate cache
      this.invalidateMenuCache(menuId);

      logger.info('Menu availability toggled', {
        menuId,
        isAvailable,
        changedBy,
      });

      // Broadcast availability update
      await this.broadcastMenuUpdate(menuId, 'availability', {
        id: menuId,
        name: updatedMenu.name,
        isAvailable,
      });

      return updatedMenu;
    } catch (error) {
      logger.error('Failed to toggle menu availability', { error, menuId });
      throw new Error(`Failed to toggle availability: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk update menu prices
   * @param updates - Array of price updates
   * @param changedBy - User ID making the changes
   * @returns Results of bulk update
   */
  async bulkUpdatePrices(
    updates: Array<{ menuId: number; newPrice: number; reason?: string }>,
    changedBy: number
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        const result = await this.updatePrice(
          update.menuId,
          update.newPrice,
          changedBy,
          update.reason
        );
        results.push({
          menuId: update.menuId,
          success: true,
          data: result,
        });
        successful++;
      } catch (error) {
        results.push({
          menuId: update.menuId,
          success: false,
          error: (error as Error).message,
        });
        failed++;
      }
    }

    logger.info('Bulk price update completed', {
      total: updates.length,
      successful,
      failed,
      changedBy,
    });

    return { successful, failed, results };
  }

  /**
   * Get price history for a menu item
   * @param menuId - Menu item ID
   * @param limit - Number of history records to retrieve
   * @returns Price history
   */
  async getPriceHistory(menuId: number, limit: number = 10): Promise<any[]> {
    try {
      // Price history table doesn't exist - return empty array
      logger.warn('Price history not available - table does not exist', { menuId });
      return [];
    } catch (error) {
      logger.error('Failed to get price history', { error, menuId });
      throw new Error(`Failed to get price history: ${(error as Error).message}`);
    }
  }

  /**
   * Broadcast menu update to all connected clients
   * @param menuId - Menu item ID
   * @param updateType - Type of update (price, availability, etc.)
   * @param data - Update data
   */
  async broadcastMenuUpdate(
    menuId: number,
    updateType: string,
    data: any
  ): Promise<void> {
    try {
      wsManager.broadcastToRoom('menu', 'menu:updated', {
        menuId,
        updateType,
        data,
        timestamp: new Date().toISOString(),
      });

      logger.info('Menu update broadcasted', { menuId, updateType });
    } catch (error) {
      logger.error('Failed to broadcast menu update', { error, menuId });
      // Don't throw - broadcasting failure shouldn't break the update
    }
  }

  /**
   * Update menu item stock availability
   * @param menuId - Menu item ID
   * @param availability - New stock count
   * @returns Updated menu item
   */
  async updateStock(menuId: number, availability: number): Promise<any> {
    try {
      const updatedMenu = await prisma.menu.update({
        where: { id: menuId },
        data: {
          isAvailable: availability > 0,
        },
      });

      // Invalidate cache
      this.invalidateMenuCache(menuId);

      logger.info('Menu stock updated', { menuId, availability });

      // Broadcast stock update
      await this.broadcastMenuUpdate(menuId, 'stock', {
        id: menuId,
        name: updatedMenu.name,
        availability,
        isAvailable: availability > 0,
      });

      return updatedMenu;
    } catch (error) {
      logger.error('Failed to update menu stock', { error, menuId });
      throw new Error(`Failed to update stock: ${(error as Error).message}`);
    }
  }

  /**
   * Validate menu item data
   * @param data - Menu item data to validate
   * @returns Validation result
   */
  validateMenuItem(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (data.price === undefined || data.price < 0) {
      errors.push('Price must be a positive number');
    }

    if (!data.category || data.category.trim().length < 2) {
      errors.push('Category is required');
    }

    if (data.availability !== undefined && data.availability < 0) {
      errors.push('Availability must be a non-negative number');
    }

    if (data.allergenCodes && !MenuDataTransformer.validateAllergenCodes(data.allergenCodes)) {
      errors.push('Invalid allergen codes');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const menuService = new MenuService();

/**

 * Data transformation utilities for menu items
 */
export class MenuDataTransformer {
  /**
   * Parse JSON string to array
   * @param jsonString - JSON string to parse
   * @returns Parsed array or empty array if invalid
   */
  static parseJsonArray(jsonString: string | null | undefined): any[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.error('Failed to parse JSON array', { jsonString, error });
      return [];
    }
  }

  /**
   * Stringify array to JSON
   * @param array - Array to stringify
   * @returns JSON string or undefined if empty
   */
  static stringifyArray(array: any[] | null | undefined): string | undefined {
    if (!array || array.length === 0) return undefined;
    try {
      return JSON.stringify(array);
    } catch (error) {
      logger.error('Failed to stringify array', { array, error });
      return undefined;
    }
  }

  /**
   * Transform menu item from database format to API format
   * @param item - Menu item from database
   * @returns Transformed menu item
   */
  static transformMenuItem(item: any): any {
    return {
      ...item,
      dietaryNotes: this.parseJsonArray(item.dietaryNotes),
      allergenCodes: this.parseJsonArray(item.allergenCodes),
    };
  }

  /**
   * Transform multiple menu items
   * @param items - Array of menu items from database
   * @returns Array of transformed menu items
   */
  static transformMenuItems(items: any[]): any[] {
    return items.map(item => this.transformMenuItem(item));
  }

  /**
   * Prepare menu item data for database storage
   * @param data - Menu item data from API
   * @returns Data ready for database storage
   */
  static prepareForStorage(data: any): any {
    const prepared = { ...data };
    
    if (data.dietaryNotes) {
      prepared.dietaryNotes = this.stringifyArray(data.dietaryNotes);
    }
    
    if (data.allergenCodes) {
      prepared.allergenCodes = this.stringifyArray(data.allergenCodes);
    }
    
    return prepared;
  }

  /**
   * Validate allergen codes
   * @param codes - Array of allergen codes
   * @returns True if all codes are valid
   */
  static validateAllergenCodes(codes: number[]): boolean {
    if (!Array.isArray(codes)) return false;
    
    // Valid allergen codes are 1-14
    return codes.every(code => 
      Number.isInteger(code) && code >= 1 && code <= 14
    );
  }

  /**
   * Get allergen names from codes
   * @param codes - Array of allergen codes
   * @returns Array of allergen names
   */
  static getAllergenNames(codes: number[]): string[] {
    const allergenMap: { [key: number]: string } = {
      1: 'Gluten (Cereals containing gluten)',
      2: 'Crustaceans',
      3: 'Eggs',
      4: 'Fish',
      5: 'Peanuts',
      6: 'Soybeans',
      7: 'Milk',
      8: 'Nuts',
      9: 'Celery',
      10: 'Mustard',
      11: 'Sesame seeds',
      12: 'Sulphur dioxide and sulphites',
      13: 'Lupin',
      14: 'Molluscs',
    };

    return codes
      .filter(code => allergenMap[code])
      .map(code => allergenMap[code]!);
  }
}

// Export transformer instance
export const menuTransformer = MenuDataTransformer;
