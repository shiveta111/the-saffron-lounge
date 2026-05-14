// TypeScript interfaces for Menu API
export interface MenuItemDTO {
  id: number;
  slug?: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  type: string | null;
  dietaryNotes: string[];
  imageUrl: string | null;
  availability?: number;
  allergenCodes: number[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  preparationTime?: number;
  nutritionalInfo?: string;
  categoryRef?: {
    id: number;
    name: string;
    type: string | null;
    description: string | null;
  };
  products?: {
    id: number;
    slug: string | null;
  }[];
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  category: string;
  type?: string;
  dietaryNotes?: string[];
  imageUrl?: string;
  availability?: number;
  allergenCodes?: number[];
  isAvailable?: boolean;
  preparationTime?: number;
  nutritionalInfo?: string;
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  type?: string;
  dietaryNotes?: string[];
  imageUrl?: string;
  availability?: number;
  allergenCodes?: number[];
  isAvailable?: boolean;
  preparationTime?: number;
  nutritionalInfo?: string;
}

export interface MenuQueryParams {
  category?: string;
  type?: string;
  isAvailable?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  type: string | null;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

/**
 * Menu Service API Client
 * Handles all API calls related to menu management
 * Now uses centralized apiClient for consistent auth and error handling
 */
import { apiClient } from '@/lib/api-client';

class MenuService {
  /**
   * Get all menu items with optional filtering
   */
  async getAllMenuItems(params?: MenuQueryParams): Promise<MenuItemDTO[]> {
    try {
      const response = await apiClient.getMenuItems(params);
      // Backend returns: { success: true, data: [...], count: ... }
      // apiClient.getMenuItems returns response.data which is { success: true, data: [...], count: ... }
      // Extract the data array from the response structure
      if (response && typeof response === 'object') {
        if (Array.isArray(response)) {
          return response;
        }
        if (response.success && Array.isArray(response.data)) {
          return response.data;
        }
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // Fallback: if response itself is an array-like structure
        if (Array.isArray(response)) {
          return response;
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      throw error;
    }
  }

  /**
   * Get menu items with pagination info
   */
  async getMenuItemsWithPagination(
    params?: MenuQueryParams
  ): Promise<{ items: MenuItemDTO[]; total: number }> {
    try {
      const response = await apiClient.getMenuItems(params);
      return { items: response.data || [], total: response.count || 0 };
    } catch (error) {
      console.error('Failed to fetch menu items:', error);
      throw error;
    }
  }

  /**
   * Get single menu item by ID
   */
  async getMenuItemById(id: number): Promise<MenuItemDTO> {
    try {
      const response = await apiClient.getMenuItem(id);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch menu item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new menu item (Admin only)
   */
  async createMenuItem(item: CreateMenuItemRequest): Promise<MenuItemDTO> {
    try {
      const response = await apiClient.createMenu(item);
      return response.data?.item || response.data;
    } catch (error) {
      console.error('Failed to create menu item:', error);
      throw error;
    }
  }

  /**
   * Update existing menu item (Admin only)
   */
  async updateMenuItem(
    id: number,
    item: UpdateMenuItemRequest
  ): Promise<MenuItemDTO> {
    try {
      const response = await apiClient.updateMenuItem(id, item);
      return response.data?.item || response.data;
    } catch (error) {
      console.error(`Failed to update menu item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete menu item (Admin only)
   */
  async deleteMenuItem(id: number, force: boolean = true): Promise<void> {
    try {
      await apiClient.deleteMenuItem(id, force);
    } catch (error) {
      console.error(`Failed to delete menu item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<CategoryDTO[]> {
    try {
      const response = await apiClient.getCategories();
      
      // Handle different response structures
      // Case 1: Response is already an array
      if (Array.isArray(response)) {
        return response;
      }
      
      // Case 2: Response is an object with nested data structure
      // Backend returns: { success: true, data: { categories: [...], pagination: {...} } }
      let categories: any = null;
      
      if (response && typeof response === 'object') {
        // Try multiple possible paths
        categories = response.data?.categories || 
                     response.categories || 
                     response.data?.data?.categories ||
                     (response.data && Array.isArray(response.data) ? response.data : null);
      }
      
      // Ensure we always return a proper array
      if (Array.isArray(categories)) {
        return categories;
      }
      
      // If we still don't have an array, return empty array
      console.warn('getCategories: Could not extract categories array from response:', response);
      return [];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Return empty array on error to prevent UI crashes
      return [];
    }
  }

  /**
   * Toggle menu item availability (Admin only)
   */
  async toggleAvailability(
    id: number,
    isAvailable: boolean
  ): Promise<MenuItemDTO> {
    try {
      const response = await apiClient.toggleMenuAvailability(id, isAvailable);
      return response.data?.item || response.data;
    } catch (error) {
      console.error(`Failed to toggle availability for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update menu item price (Admin only)
   */
  async updateMenuPrice(
    id: number,
    price: number,
    reason?: string
  ): Promise<MenuItemDTO> {
    try {
      const response = await apiClient.updateMenuPrice(id, price, reason);
      return response.data?.item || response.data;
    } catch (error) {
      console.error(`Failed to update price for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get menu price history (Admin only)
   */
  async getMenuPriceHistory(id: number, limit?: number): Promise<any> {
    try {
      const response = await apiClient.getMenuPriceHistory(id, limit);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch price history for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk update menu prices (Admin only)
   */
  async bulkUpdateMenuPrices(updates: Array<{ menuId: number; newPrice: number; reason?: string }>): Promise<any> {
    try {
      const response = await apiClient.bulkUpdateMenuPrices(updates);
      return response.data;
    } catch (error) {
      console.error('Failed to bulk update menu prices:', error);
      throw error;
    }
  }

  /**
   * Check products availability
   */
  async checkProductsAvailability(): Promise<any> {
    try {
      const response = await apiClient.checkProductsAvailability();
      return response.data;
    } catch (error) {
      console.error('Failed to check products availability:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const menuService = new MenuService();

// Export class for testing
export default MenuService;
