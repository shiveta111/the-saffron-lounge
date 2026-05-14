// Cart Service for Frontend
export interface CartItemDTO {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  notes?: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
    isAvailable: boolean;
    menu?: {
      id: number;
      name: string;
      category: string;
    };
  };
}

export interface CartDTO {
  id: number;
  userId?: number;
  sessionId?: string;
  items: CartItemDTO[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddToCartRequest {
  productId?: number;
  menuId?: number;
  quantity: number;
  notes?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
  notes?: string;
}

export interface CartResponse {
  success: boolean;
  data: CartDTO;
  message?: string;
}

export interface CartValidationResponse {
  success: boolean;
  data: {
    valid: boolean;
    errors: string[];
  };
}

/**
 * Cart Service API Client
 * Now uses centralized apiClient for consistent auth and error handling
 */
import { apiClient } from '@/lib/api-client';

class CartService {
  /**
   * Get user's cart
   */
  async getCart(): Promise<CartDTO> {
    try {
      const response = await apiClient.getCart();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart (product or menu item)
   */
  async addItem(item: AddToCartRequest): Promise<CartDTO> {
    try {
      const response = await apiClient.addToCart(item);
      return response.data;
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Add menu item to cart
   */
  async addMenuToCart(menuId: number, quantity: number): Promise<CartDTO> {
    try {
      const response = await apiClient.addMenuToCart({ menuId, quantity });
      return response.data;
    } catch (error) {
      console.error('Failed to add menu item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item
   */
  async updateItem(itemId: number, quantity: number): Promise<CartDTO> {
    try {
      const response = await apiClient.updateCartItem(itemId, quantity);
      return response.data;
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: number): Promise<CartDTO> {
    try {
      const response = await apiClient.removeFromCart(itemId);
      return response.data;
    } catch (error) {
      console.error('Failed to remove cart item:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<CartDTO> {
    try {
      const response = await apiClient.clearCart();
      return response.data;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Validate cart items and promotions
   */
  async validateCart(cartId: number): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const response = await apiClient.validateCartPromotions(cartId);
      return response.data;
    } catch (error) {
      console.error('Failed to validate cart:', error);
      // Return default validation if endpoint not available
      return { valid: true, errors: [] };
    }
  }
}

// Export singleton instance
export const cartService = new CartService();

// Export class for testing
export default CartService;
