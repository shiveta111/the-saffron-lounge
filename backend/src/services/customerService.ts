import prisma from '../config/prisma';
import * as winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/customer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/customer.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export interface CustomerFilters {
  search?: string;
  status?: string;
  orderBehavior?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CustomerStatistics {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
}

/**
 * Get all customers with order statistics and filtering
 */
export const getAllCustomers = async (
  page: number = 1,
  limit: number = 10,
  filters: CustomerFilters = {}
) => {
  try {
    const { search, status, orderBehavior, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    // Build where clause
    const where: any = {
      role: 'CUSTOMER',
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    // Get customers with order count
    const customers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            createdAt: true,
            items: {
              select: {
                quantity: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder as 'asc' | 'desc',
      },
    });

    // Calculate total quantity for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderStats = await prisma.orderItem.aggregate({
          where: {
            order: {
              customerId: customer.id,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: customer.role,
          isActive: customer.isActive,
          emailVerified: customer.emailVerified,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          orderCount: customer._count.orders,
          totalQuantity: orderStats._sum.quantity || 0,
          lastOrderDate: customer.orders[0]?.createdAt || null,
        };
      })
    );

    // Apply order behavior filters
    let filteredCustomers = customersWithStats;
    if (orderBehavior === 'frequent') {
      filteredCustomers = customersWithStats.filter((c) => c.orderCount >= 5);
    } else if (orderBehavior === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filteredCustomers = customersWithStats.filter(
        (c) => c.lastOrderDate && c.lastOrderDate >= thirtyDaysAgo
      );
    } else if (orderBehavior === 'inactive') {
      filteredCustomers = customersWithStats.filter((c) => c.orderCount === 0);
    }

    // Get total count
    const total = await prisma.user.count({ where });

    logger.info('Customers retrieved successfully', {
      page,
      limit,
      total,
      filters,
    });

    return {
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    logger.error('Failed to get customers', { error: error.message });
    throw error;
  }
};

/**
 * Get customer by ID with orders and reservations
 */
export const getCustomerById = async (customerId: number) => {
  try {
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        emailVerified: true,
        loyaltyPoints: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            status: true,
            orderType: true,
            total: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        reservations: {
          select: {
            id: true,
            guestName: true,
            partySize: true,
            reservationDate: true,
            reservationTime: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            reservationDate: 'desc',
          },
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate statistics
    const totalSpent = customer.orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = customer.orders.length;

    logger.info('Customer retrieved successfully', { customerId });

    return {
      ...customer,
      statistics: {
        totalOrders,
        totalSpent,
      },
    };
  } catch (error: any) {
    logger.error('Failed to get customer', { error: error.message, customerId });
    throw error;
  }
};

/**
 * Update customer details
 */
export const updateCustomer = async (customerId: number, data: any) => {
  try {
    const allowedFields = ['name', 'phone', 'address', 'emailVerified'];
    const updateData: any = {};

    // Filter only allowed fields
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const customer = await prisma.user.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        isActive: true,
        emailVerified: true,
        loyaltyPoints: true,
        updatedAt: true,
      },
    });

    logger.info('Customer updated successfully', { customerId, updateData });

    return customer;
  } catch (error: any) {
    logger.error('Failed to update customer', { error: error.message, customerId });
    throw error;
  }
};

/**
 * Update customer status (activate/deactivate)
 */
export const updateCustomerStatus = async (customerId: number, isActive: boolean) => {
  try {
    const customer = await prisma.user.update({
      where: { id: customerId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    logger.info('Customer status updated successfully', { customerId, isActive });

    return customer;
  } catch (error: any) {
    logger.error('Failed to update customer status', { error: error.message, customerId });
    throw error;
  }
};

/**
 * Get customer statistics
 */
export const getCustomerStatistics = async (customerId: number): Promise<CustomerStatistics> => {
  try {
    logger.info('Getting customer statistics', { customerId });
    
    const orders = await prisma.order.findMany({
      where: { customerId },
      select: {
        id: true,
        total: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Found orders for customer', { customerId, orderCount: orders.length, orderIds: orders.map(o => o.id) });

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const lastOrderDate = orders.length > 0 && orders[0] ? orders[0].createdAt : null;

    logger.info('Customer statistics calculated', { customerId, totalOrders, totalSpent, lastOrderDate });

    return {
      totalOrders,
      totalSpent,
      lastOrderDate,
    };
  } catch (error: any) {
    logger.error('Failed to get customer statistics', { error: error.message, customerId, stack: error.stack });
    throw error;
  }
};

/**
 * Search customers
 */
export const searchCustomers = async (query: string, limit: number = 10) => {
  try {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      take: limit,
    });

    logger.info('Customers searched successfully', { query, count: customers.length });

    return customers;
  } catch (error: any) {
    logger.error('Failed to search customers', { error: error.message, query });
    throw error;
  }
};
