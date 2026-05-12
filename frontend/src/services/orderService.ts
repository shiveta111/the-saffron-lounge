// Order Service for Frontend
export interface CreateOrderRequest {
  items: Array<{
    productId: number;
    quantity: number;
    specialRequests?: string;
  }>;
  shippingDetails?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  paymentMethod?: string;
  notes?: string;
}

export interface OrderItemDTO {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  specialRequests?: string;
  product?: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
  };
}

export interface OrderDTO {
  id: number;
  customerId: number;
  total: number;
  status: string;
  orderType: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemDTO[];
  customer?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface OrderResponse {
  success: boolean;
  data: {
    order: OrderDTO;
    items: OrderItemDTO[];
  };
  message?: string;
}

export interface OrderListResponse {
  success: boolean;
  data: {
    orders: OrderDTO[];
    total: number;
  };
}

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Order Service API Client
 * Now uses centralized apiClient for consistent auth and error handling
 */
class OrderService {
  /**
   * Create new order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    try {
      const response = await apiClient.createOrder(orderData);
      return response;
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get user's orders
   */
  async getOrders(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    page?: number;
    customerId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<OrderListResponse> {
    try {
      const response = await apiClient.getOrders(params);
      return response;
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number): Promise<OrderResponse> {
    try {
      const response = await apiClient.getOrder(orderId);
      return response;
    } catch (error) {
      console.error(`Failed to fetch order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderId: number, status: string): Promise<OrderResponse> {
    try {
      const response = await apiClient.updateOrderStatus(orderId, { status });
      return response;
    } catch (error) {
      console.error(`Failed to update order ${orderId} status:`, error);
      throw error;
    }
  }

  /**
   * Process payment for order
   */
  async processPayment(orderId: number, paymentMethod: string, paymentMethodId?: string): Promise<any> {
    try {
      const response = await apiClient.processPayment(orderId, {
        paymentMethod,
        paymentMethodId,
      });
      return response;
    } catch (error) {
      console.error(`Failed to process payment for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: number): Promise<any> {
    try {
      const response = await apiClient.getPaymentStatus(paymentId);
      return response;
    } catch (error) {
      console.error(`Failed to get payment status ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const { tokens } = useAuthStore.getState();
    return !!tokens?.accessToken;
  }
}

// Export singleton instance
export const orderService = new OrderService();

// Export class for testing
export default OrderService;
