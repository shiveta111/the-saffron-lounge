import NodeCache from 'node-cache';

// Memory cache for frequently accessed data
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
}

class CacheManager {
  /**
   * Get data from cache
   */
  get<T>(key: string): T | undefined {
    try {
      return cache.get<T>(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = 300): boolean {
    try {
      return cache.set(key, data, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  del(key: string): number {
    try {
      return cache.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  flushAll(): void {
    try {
      cache.flushAll();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  /**
   * Get or set cache with a function
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl } = options;

    // Try to get from cache first
    const cachedData = this.get<T>(key);
    if (cachedData !== undefined) {
      return cachedData;
    }

    // Fetch fresh data
    const data = await fetchFunction();

    // Cache the result
    this.set(key, data, ttl);

    return data;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    try {
      return cache.getStats();
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    try {
      return cache.has(key);
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Cache key generators
export const cacheKeys = {
  dashboardStats: 'dashboard:stats',
  userList: (page: number, limit: number, filters: any) =>
    `users:list:${page}:${limit}:${JSON.stringify(filters)}`,
  userCount: 'users:count',
  orderStats: 'orders:stats',
  inventoryStats: 'inventory:stats',
  bookingStats: 'bookings:stats',
  recentOrders: 'orders:recent',
  lowStockItems: 'inventory:low_stock',
  recentUsers: 'users:recent',
  analytics: (timeframe: string) => `analytics:${timeframe}`,
  popularProducts: (timeframe: string) => `products:popular:${timeframe}`,
  customerMetrics: (timeframe: string) => `customers:metrics:${timeframe}`,
};

export default cacheManager;