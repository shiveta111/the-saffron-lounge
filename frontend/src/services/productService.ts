// TypeScript interfaces for Product API
export interface ProductDTO {
  id: number;
  menuId: number;
  slug?: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  type: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  availability: number;
  sku: string | null;
  dietaryNotes: string[];
  allergenCodes: number[];
  createdAt: Date;
  updatedAt: Date;
  menu?: {
    id: number;
    name: string;
    category: string;
  };
}

export interface ProductQueryParams {
  category?: string;
  type?: string;
  isAvailable?: boolean;
  search?: string;
  menuId?: number;
  page?: number;
  limit?: number;
}

/**
 * Product Service API Client
 * Handles all API calls related to products (for shop/ordering)
 * Now uses centralized apiClient for consistent auth and error handling
 */
import { apiClient } from '@/lib/api-client';

class ProductService {
  /**
   * Get all products (public access for shop page)
   */
  async getAllProducts(params?: ProductQueryParams): Promise<ProductDTO[]> {
    try {
      const response = await apiClient.getProducts(params);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch products:', error);
      throw error;
    }
  }

  /**
   * Get single product by ID
   */
  async getProductById(id: number): Promise<ProductDTO> {
    try {
      const response = await apiClient.getProduct(id);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<ProductDTO> {
    try {
      const response = await apiClient.getProductBySlug(slug);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch product by slug ${slug}:`, error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<ProductDTO[]> {
    return this.getAllProducts({ category });
  }

  /**
   * Search products
   */
  async searchProducts(query: string): Promise<ProductDTO[]> {
    return this.getAllProducts({ search: query });
  }

  /**
   * Create product (admin only)
   */
  async createProduct(data: any): Promise<ProductDTO> {
    try {
      const response = await apiClient.createProduct(data);
      return response.data;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Update product (admin only)
   */
  async updateProduct(id: number, data: any): Promise<ProductDTO> {
    try {
      const response = await apiClient.updateProduct(id, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete product (admin only)
   */
  async deleteProduct(id: number): Promise<void> {
    try {
      await apiClient.deleteProduct(id);
    } catch (error) {
      console.error(`Failed to delete product ${id}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const productService = new ProductService();

// Export class for testing
export default ProductService;
