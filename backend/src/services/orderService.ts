import * as winston from 'winston';
import prisma from '../config/prisma';
import { cartService } from './cartService';
import { discountService } from './discountService';
import { promotionService } from './promotionService';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'order-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/orders-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/orders.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface CreateOrderData {
  userId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentMethod: 'CASH' | 'CARD' | 'STRIPE' | 'PAYPAL' | 'PAY_IN_RESTAURANT' | 'PAY_ON_ARRIVAL';
  orderType?: 'DINE_IN' | 'PICKUP' | 'DELIVERY' | 'ONLINE';
  tableId?: number;
  notes?: string;
  discountCode?: string;
  deliveryFee?: number;
}

export interface OrderCalculations {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  appliedPromotionId?: number | null;
}

export class OrderService {
  /**
   * Create order from cart
   * @param orderData - Order creation data
   * @returns Created order with items
   */
  async createOrderFromCart(orderData: CreateOrderData): Promise<any> {
    try {
      // Get user's cart
      const cart = await cartService.getOrCreateCart(orderData.userId, null);

      // Validate cart
      const validation = await cartService.validateCart(cart.id);
      if (!validation.valid) {
        throw new Error(`Cart validation failed: ${validation.errors.join(', ')}`);
      }

      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate order totals
      const calculations = await this.calculateOrderTotals(
        cart,
        orderData.discountCode,
        orderData.deliveryFee || 0,
        orderData.userId
      );

      // Create order and order items in a transaction
      const result = await prisma.$transaction(async (tx: any) => {
        // Create the order
        const order = await tx.order.create({
          data: {
            customerId: orderData.userId,
            tableId: orderData.tableId || null,
            status: 'PENDING',
            orderType: orderData.orderType || 'ONLINE',
            total: calculations.total,
            discountCode: orderData.discountCode || null,
            discountAmount: calculations.discountAmount,
            deliveryFee: calculations.deliveryFee,
            notes: orderData.notes || null,
            // Save customer contact information
            customerName: orderData.customerName || null,
            customerEmail: orderData.customerEmail || null,
            customerPhone: orderData.customerPhone || null,
            deliveryAddress: orderData.deliveryAddress || null,
          },
        });

        // Track promotion usage if a promotion was applied
        if (calculations.appliedPromotionId && orderData.userId) {
          try {
            await promotionService.trackPromotionUsage(
              calculations.appliedPromotionId,
              orderData.userId,
              order.id
            );
          } catch (error) {
            logger.warn('Failed to track promotion usage', { error, promotionId: calculations.appliedPromotionId });
            // Don't fail the order if tracking fails
          }
        }

        // Create order items from cart items
        const orderItems = [];
        for (const cartItem of cart.items) {
          if (cartItem.productId) {
            // Handle product cart item
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: cartItem.productId,
                quantity: cartItem.quantity,
                price: cartItem.product?.price || cartItem.price, // Store current price
                specialRequests: cartItem.notes || null,
              },
            });
            orderItems.push(orderItem);

            // Update inventory
            if (cartItem.productId) {
              await tx.inventory.upsert({
                where: { productId: cartItem.productId },
                update: {
                  quantity: {
                    decrement: cartItem.quantity,
                  },
                },
                create: {
                  productId: cartItem.productId,
                  quantity: -cartItem.quantity,
                },
              });
            }
          } else if (cartItem.menuId && cartItem.menu) {
            // Handle menu item (combo pack) cart item
            // Create order item for the menu itself
            const orderItem = await tx.orderItem.create({
              data: {
                orderId: order.id,
                menuId: cartItem.menuId,
                productId: null, // Menu items don't have a direct productId
                quantity: cartItem.quantity,
                price: cartItem.menu.price || cartItem.price,
                specialRequests: cartItem.notes || null,
              },
            });
            orderItems.push(orderItem);

            // For combo packs, we can optionally create order items for each product in the combo
            // This depends on business logic - for now, we'll just create one order item for the combo
            // If needed, we can expand this to create individual items for each product in the combo
            if (cartItem.menu.menuProducts && cartItem.menu.menuProducts.length > 0) {
              // Update inventory for each product in the combo
              for (const menuProduct of cartItem.menu.menuProducts) {
                if (menuProduct.product) {
                  await tx.inventory.upsert({
                    where: { productId: menuProduct.product.id },
                    update: {
                      quantity: {
                        decrement: cartItem.quantity * (menuProduct.quantity || 1),
                      },
                    },
                    create: {
                      productId: menuProduct.product.id,
                      quantity: -(cartItem.quantity * (menuProduct.quantity || 1)),
                    },
                  });
                }
              }
            }
          }
        }

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: calculations.total,
            method: orderData.paymentMethod,
            status: orderData.paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
          },
        });

        // Update promotion usage if discount code was used
        if (orderData.discountCode) {
          await tx.promotion.updateMany({
            where: { code: orderData.discountCode },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        logger.info('Order created from cart', {
          orderId: order.id,
          customerId: orderData.userId,
          total: order.total,
          itemCount: orderItems.length,
        });

        return { order, orderItems, payment };
      });

      // Fetch complete order with relations
      const completeOrder = await this.getOrderById(result.order.id, orderData.userId);

      return completeOrder;
    } catch (error) {
      logger.error('Failed to create order from cart', { error, orderData });
      throw error;
    }
  }

  /**
   * Calculate order totals
   * @param cart - Cart with items
   * @param discountCode - Optional discount code
   * @param deliveryFee - Delivery fee
   * @param userId - User ID for discount validation
   * @returns Order calculations
   */
  async calculateOrderTotals(
    cart: any,
    discountCode?: string,
    deliveryFee: number = 0,
    userId?: number
  ): Promise<OrderCalculations> {
    try {
      // Calculate subtotal from cart items
      const subtotal = cart.items.reduce((sum: number, item: any) => {
        // Handle both products and menu items
        const itemPrice = item.menuId && item.menu 
          ? (item.menu.price || item.price)
          : (item.product?.price || item.price);
        return sum + (itemPrice * item.quantity);
      }, 0);

      // Calculate discount using promotion service
      let discountAmount = 0;
      let appliedPromotionId: number | null = null;

      // First, try auto-apply promotions
      const autoApplyResult = await promotionService.autoApplyPromotions(cart, userId);
      if (autoApplyResult && autoApplyResult.discountAmount > 0) {
        discountAmount = autoApplyResult.discountAmount;
        if (autoApplyResult.appliedPromotions.length > 0 && autoApplyResult.appliedPromotions[0]) {
          appliedPromotionId = autoApplyResult.appliedPromotions[0].id;
        }
      }

      // If discount code provided, check if it provides better discount
      if (discountCode && userId) {
        try {
          const promotion = await prisma.promotion.findUnique({
            where: { code: discountCode.toUpperCase() },
          });

          if (promotion && promotion.requiresCouponCode) {
            const isValid = await promotionService.validatePromotionApplicability(
              promotion,
              cart,
              userId,
              subtotal
            );

            if (isValid) {
              const codeDiscount = promotionService.calculateDiscountAmount(promotion, subtotal);
              // Use code discount if it's better than auto-applied
              if (codeDiscount > discountAmount) {
                discountAmount = codeDiscount;
                appliedPromotionId = promotion.id;
              }
            }
          }
        } catch (error) {
          logger.warn('Discount code validation failed', { discountCode, error });
          // Continue with auto-applied discount if available
        }
      }

      // Calculate tax (13% VAT)
      const taxableAmount = subtotal - discountAmount + deliveryFee;
      const tax = taxableAmount * 0.13;

      // Calculate total
      const total = subtotal - discountAmount + deliveryFee + tax;

      return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        deliveryFee: parseFloat(deliveryFee.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        appliedPromotionId: appliedPromotionId || null,
      };
    } catch (error) {
      logger.error('Failed to calculate order totals', { error });
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param orderId - Order ID
   * @param userId - User ID (for access control)
   * @param userRole - User role (for access control)
   * @returns Order with items and relations
   */
  async getOrderById(orderId: number, userId?: number, userRole?: string): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                  category: true,
                  type: true,
                  isAvailable: true,
                  availability: true,
                  sku: true,
                },
              },
              menu: {
                include: {
                  categoryRef: true,
                  menuProducts: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                          price: true,
                          description: true,
                          imageUrl: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payment: true,
          table: {
            select: {
              id: true,
              tableNumber: true,
              location: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Check access control
      if (userId && userRole !== 'ADMIN' && userRole !== 'SELLER' && order.customerId !== userId) {
        throw new Error('Access denied');
      }

      return order;
    } catch (error) {
      logger.error('Failed to get order by ID', { error, orderId });
      throw error;
    }
  }

  /**
   * Get orders with filtering
   * @param filters - Filter options
   * @returns Orders with pagination
   */
  async getOrders(filters: {
    userId?: number;
    userRole?: string;
    status?: string;
    customerId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ orders: any[]; total: number; pagination: any }> {
    try {
      const {
        userId,
        userRole,
        status,
        customerId,
        limit = 20,
        offset = 0,
        startDate,
        endDate,
      } = filters;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      // Non-admin users can only see their own orders
      if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
        where.customerId = userId;
      } else if (customerId) {
        where.customerId = customerId;
      }

      // Filter out orphaned orders: get valid customer IDs first (for admin/seller only)
      if (userRole === 'ADMIN' || userRole === 'SELLER') {
        try {
          const validCustomerIds = await prisma.user.findMany({
            select: { id: true },
          }).then((users: any[]) => users.map(u => u.id));
          
          // Only include orders with valid customerIds
          if (validCustomerIds.length > 0) {
            if (where.customerId) {
              // If filtering by specific customerId, check if it's valid
              if (!validCustomerIds.includes(where.customerId)) {
                // Invalid customerId, return empty result
                return {
                  orders: [],
                  total: 0,
                  pagination: {
                    total: 0,
                    page: Math.floor(offset / limit) + 1,
                    limit,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                  },
                };
              }
            } else {
              // Filter to only valid customerIds
              where.customerId = { in: validCustomerIds };
            }
          } else {
            // No valid customers, return empty result
            return {
              orders: [],
              total: 0,
              pagination: {
                total: 0,
                page: Math.floor(offset / limit) + 1,
                limit,
                totalPages: 0,
                hasNext: false,
                hasPrev: false,
              },
            };
          }
        } catch (userError) {
          logger.warn('Failed to fetch valid customer IDs, proceeding without filter', { error: userError });
        }
      }

      // Get orders
      let orders;
      try {
        orders = await prisma.order.findMany({
          where,
          select: {
            id: true,
            customerId: true,
            status: true,
            orderType: true,
            total: true,
            discountAmount: true,
            deliveryFee: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            customer: {
              select: {
                id: true,
                email: true,
                name: true,
                phone: true,
              },
            },
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                specialRequests: true,
                productId: true,
                menuId: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    description: true,
                    category: true,
                    isAvailable: true,
                  },
                },
                menu: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    description: true,
                    category: true,
                    isAvailable: true,
                    categoryRef: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    menuProducts: {
                      include: {
                        product: {
                          select: {
                            id: true,
                            name: true,
                            price: true,
                            description: true,
                            imageUrl: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            payment: {
              select: {
                id: true,
                status: true,
                method: true,
                amount: true,
              },
            },
            table: {
              select: {
                id: true,
                tableNumber: true,
                location: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        });
      } catch (error: any) {
        // Handle Prisma errors for orphaned data
        if (error.message?.includes('Field customer is required') || error.message?.includes('Inconsistent query result')) {
          logger.warn('Orphaned order data detected, retrying without customer relation', { error: error.message });
          // Retry without customer include, then manually fetch customers
          const ordersWithoutCustomer = await prisma.order.findMany({
            where,
            select: {
              id: true,
              customerId: true,
              status: true,
              orderType: true,
              total: true,
              discountAmount: true,
              deliveryFee: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  price: true,
                  specialRequests: true,
                  productId: true,
                  menuId: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      imageUrl: true,
                      description: true,
                      category: true,
                      isAvailable: true,
                    },
                  },
                  menu: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      imageUrl: true,
                      description: true,
                      category: true,
                      isAvailable: true,
                      categoryRef: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                      menuProducts: {
                        include: {
                          product: {
                            select: {
                              id: true,
                              name: true,
                              price: true,
                              description: true,
                              imageUrl: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              payment: {
                select: {
                  id: true,
                  status: true,
                  method: true,
                  amount: true,
                },
              },
              table: {
                select: {
                  id: true,
                  tableNumber: true,
                  location: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          });

          // Manually fetch customers for valid customerIds
          const customerIds = [...new Set(ordersWithoutCustomer.map((o: any) => o.customerId).filter(Boolean))];
          const customers = customerIds.length > 0 ? await prisma.user.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, email: true, name: true, phone: true },
          }) : [];
          const customerMap = new Map(customers.map((c: any) => [c.id, c]));

          orders = ordersWithoutCustomer.map((o: any) => ({
            ...o,
            customer: o.customerId ? customerMap.get(o.customerId) || null : null,
          }));
        } else {
          throw error;
        }
      }

      // Get total count
      const total = await prisma.order.count({ where });

      logger.info('Orders retrieved', {
        count: orders.length,
        total,
        filters,
      });

      return {
        orders,
        total,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      logger.error('Failed to get orders', { error, filters });
      throw error;
    }
  }

  /**
   * Update order status
   * @param orderId - Order ID
   * @param newStatus - New status
   * @param userId - User ID (for logging)
   * @returns Updated order
   */
  async updateOrderStatus(orderId: number, newStatus: string, userId: number): Promise<any> {
    try {
      // Get current order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        PENDING: ['PREPARING', 'CANCELLED'],
        PREPARING: ['READY', 'CANCELLED'],
        READY: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
      };

      const allowedTransitions = validTransitions[order.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(`Cannot change status from ${order.status} to ${newStatus}`);
      }

      // If cancelling, restore inventory
      if (newStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
        await prisma.$transaction(async (tx: any) => {
          for (const item of order.items) {
            await tx.inventory.upsert({
              where: { productId: item.productId },
              update: {
                quantity: {
                  increment: item.quantity,
                },
              },
              create: {
                productId: item.productId,
                quantity: item.quantity,
              },
            });
          }
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus as any },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                  category: true,
                  isAvailable: true,
                  availability: true,
                  sku: true,
                },
              },
              menu: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                  description: true,
                  category: true,
                  isAvailable: true,
                  categoryRef: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  menuProducts: {
                    include: {
                      product: {
                        select: {
                          id: true,
                          name: true,
                          price: true,
                          description: true,
                          imageUrl: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          payment: true,
          table: true,
        },
      });

      logger.info('Order status updated', {
        orderId,
        oldStatus: order.status,
        newStatus,
        updatedBy: userId,
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Failed to update order status', { error, orderId, newStatus });
      throw error;
    }
  }

  /**
   * Get order statistics
   * @param userId - Optional user ID for customer stats
   * @returns Order statistics
   */
  async getOrderStatistics(userId?: number): Promise<any> {
    try {
      const where: any = userId ? { customerId: userId } : {};

      const [
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
      ] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({ where: { ...where, status: 'PENDING' } }),
        prisma.order.count({ where: { ...where, status: 'PREPARING' } }),
        prisma.order.count({ where: { ...where, status: 'READY' } }),
        prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
        prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
        prisma.order.aggregate({
          where: { ...where, status: { not: 'CANCELLED' } },
          _sum: { total: true },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        preparingOrders,
        readyOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum.total || 0,
      };
    } catch (error) {
      logger.error('Failed to get order statistics', { error, userId });
      throw error;
    }
  }
}

export const orderService = new OrderService();
