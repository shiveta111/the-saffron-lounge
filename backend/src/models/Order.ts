/**
 * Order Model - Handles all order-related database operations
 * Provides CRUD operations for orders, order items, and payment processing
 */

import { dbManager } from '../utils/database';
import { UserModel } from './User';
import { ProductModel } from './Product';

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  specialRequests: string | null;
  product?: any; // Product details
}

export interface Order {
  id: number;
  customerId: number;
  status: OrderStatus;
  total: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer?: any; // Customer details
  items?: OrderItem[]; // Order items
}

export interface CreateOrderData {
  customerId: number;
  items: Array<{
    productId: number;
    quantity: number;
    specialRequests?: string;
  }>;
  notes?: string;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  notes?: string;
}

export class OrderModel {
  /**
   * Find order by ID with items
   */
  static async findById(id: number): Promise<Order | null> {
    try {
      const sql = `
        SELECT id, customerId, status, total, notes, createdAt, updatedAt
        FROM orders WHERE id = ?
      `;
      const result = await dbManager.get(sql, [id]);
      if (!result) return null;

      const order = this.mapRowToOrder(result);

      // Get order items
      order.items = await this.getOrderItems(id);

      // Get customer details
      order.customer = await UserModel.findById(order.customerId);

      return order;
    } catch (error) {
      console.error('Error finding order by ID:', error);
      throw new Error('Failed to find order');
    }
  }

  /**
   * Get all orders with pagination
   */
  static async findAll(options: {
    page?: number;
    limit?: number;
    customerId?: number;
    status?: OrderStatus;
  } = {}): Promise<{ orders: Order[]; total: number }> {
    try {
      const { page = 1, limit = 10, customerId, status } = options;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];

      if (customerId) {
        whereConditions.push('customerId = ?');
        params.push(customerId);
      }

      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
      const countResult = await dbManager.get(countSql, params);
      const total = countResult.total;

      // Get orders
      const sql = `
        SELECT id, customerId, status, total, notes, createdAt, updatedAt
        FROM orders
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;

      const results = await dbManager.query(sql, [...params, limit, offset]);
      const orders = await Promise.all(
        results.map(async (row: any) => {
          const order = this.mapRowToOrder(row);
          order.items = await this.getOrderItems(order.id);
          order.customer = await UserModel.findById(order.customerId);
          return order;
        })
      );

      return { orders, total };
    } catch (error) {
      console.error('Error finding all orders:', error);
      throw new Error('Failed to retrieve orders');
    }
  }

  /**
   * Create new order with items
   */
  static async create(orderData: CreateOrderData): Promise<Order> {
    try {
      // Calculate total and validate items
      let total = 0;
      const validatedItems: Array<{
        productId: number;
        quantity: number;
        price: number;
        specialRequests: string | null;
      }> = [];

      for (const item of orderData.items) {
        const product = await ProductModel.findById(item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        if (!product.isAvailable) {
          throw new Error(`Product ${product.name} is not available`);
        }

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          specialRequests: item.specialRequests || null,
        });
      }

      // Create order in transaction
      const orderResult = await dbManager.run(
        'INSERT INTO orders (customerId, status, total, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [orderData.customerId, OrderStatus.PENDING, total, orderData.notes || null]
      );

      if (!orderResult.insertId) {
        throw new Error('Failed to create order');
      }

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of validatedItems) {
        await dbManager.run(
          'INSERT INTO order_items (orderId, productId, quantity, price, specialRequests) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.productId, item.quantity, item.price, item.specialRequests]
        );
      }

      const order = await this.findById(orderId);
      if (!order) {
        throw new Error('Failed to retrieve created order');
      }

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  /**
   * Update order
   */
  static async update(id: number, updateData: UpdateOrderData): Promise<Order | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }
      if (updateData.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updateData.notes);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updatedAt = NOW()');
      values.push(id);

      const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
      await dbManager.run(sql, values);

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error('Failed to update order');
    }
  }

  /**
   * Delete order
   */
  static async delete(id: number): Promise<boolean> {
    try {
      // Delete order items first (cascade will handle this, but being explicit)
      await dbManager.run('DELETE FROM order_items WHERE orderId = ?', [id]);

      // Delete order
      const result = await dbManager.run('DELETE FROM orders WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error('Failed to delete order');
    }
  }

  /**
   * Get order items for an order
   */
  static async getOrderItems(orderId: number): Promise<OrderItem[]> {
    try {
      const sql = `
        SELECT oi.id, oi.orderId, oi.productId, oi.quantity, oi.price, oi.specialRequests,
               p.name as productName, p.description as productDescription, p.imageUrl as productImage
        FROM order_items oi
        LEFT JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
        ORDER BY oi.id
      `;

      const results = await dbManager.query(sql, [orderId]);
      return results.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        productId: row.productId,
        quantity: row.quantity,
        price: parseFloat(row.price),
        specialRequests: row.specialRequests,
        product: row.productName ? {
          name: row.productName,
          description: row.productDescription,
          imageUrl: row.productImage,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error getting order items:', error);
      throw new Error('Failed to get order items');
    }
  }

  /**
   * Get orders by customer
   */
  static async findByCustomer(customerId: number, limit: number = 20): Promise<Order[]> {
    try {
      const sql = `
        SELECT id, customerId, status, total, notes, createdAt, updatedAt
        FROM orders
        WHERE customerId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `;

      const results = await dbManager.query(sql, [customerId, limit]);
      return await Promise.all(
        results.map(async (row: any) => {
          const order = this.mapRowToOrder(row);
          order.items = await this.getOrderItems(order.id);
          return order;
        })
      );
    } catch (error) {
      console.error('Error finding orders by customer:', error);
      throw new Error('Failed to find orders by customer');
    }
  }

  /**
   * Get order statistics
   */
  static async getStatistics(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    try {
      const sql = `
        SELECT
          COUNT(*) as totalOrders,
          COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total ELSE 0 END), 0) as totalRevenue,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingOrders,
          COUNT(CASE WHEN status IN ('DELIVERED', 'READY') THEN 1 END) as completedOrders
        FROM orders
      `;

      const result = await dbManager.get(sql);
      return {
        totalOrders: result.totalOrders,
        totalRevenue: parseFloat(result.totalRevenue),
        pendingOrders: result.pendingOrders,
        completedOrders: result.completedOrders,
      };
    } catch (error) {
      console.error('Error getting order statistics:', error);
      throw new Error('Failed to get order statistics');
    }
  }

  /**
   * Update order status with validation
   */
  static async updateStatus(id: number, status: OrderStatus): Promise<Order | null> {
    try {
      // Validate status transition
      const currentOrder = await this.findById(id);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Validate status transitions
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
        [OrderStatus.READY]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
      };

      if (!validTransitions[currentOrder.status].includes(status)) {
        throw new Error(`Invalid status transition from ${currentOrder.status} to ${status}`);
      }

      return await this.update(id, { status });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Map database row to Order interface
   */
  private static mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      customerId: row.customerId,
      status: row.status as OrderStatus,
      total: parseFloat(row.total),
      notes: row.notes,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}