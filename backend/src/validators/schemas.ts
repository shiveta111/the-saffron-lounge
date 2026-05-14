import * as Joi from 'joi';
import { customValidators } from '../middleware/validation';

/**
 * Menu validation schemas
 */
export const menuSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    price: customValidators.price().optional(), // Optional - will be calculated from products if not provided
    category: Joi.string().min(2).max(50).required(),
    categoryId: customValidators.id().optional(),
    type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional(),
    imageUrl: customValidators.url().optional().allow(''),
    dietaryNotes: Joi.array().items(Joi.string()).optional(),
    allergenCodes: Joi.array().items(Joi.string()).optional(),
    availability: Joi.number().integer().min(0).optional().default(10),
    isAvailable: Joi.boolean().optional().default(true),
    isSpecial: Joi.boolean().optional().default(false),
    productIds: Joi.array().items(customValidators.id()).min(1).required(), // At least one product required
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(''),
    price: customValidators.price().optional(),
    category: Joi.string().min(2).max(50).optional(),
    categoryId: customValidators.id().optional(),
    type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional(),
    imageUrl: customValidators.url().optional().allow(''),
    dietaryNotes: Joi.array().items(Joi.string()).optional(),
    allergenCodes: Joi.array().items(Joi.number().integer()).optional(),
    availability: Joi.number().integer().min(0).optional(),
    isAvailable: Joi.boolean().optional(),
    isSpecial: Joi.boolean().optional(),
  }).min(1), // At least one field must be provided

  query: Joi.object({
    category: Joi.string().optional(),
    type: Joi.string().optional(),
    isAvailable: Joi.boolean().optional(),
    search: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
    sortBy: Joi.string().valid('name', 'price', 'createdAt', 'category').optional().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Product validation schemas
 */
export const productSchemas = {
  create: Joi.object({
    // menuId removed - products are created independently, linked to menus via junction table
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional().allow('', null),
    price: customValidators.price().required(),
    // category removed - auto-populated from categoryId
    categoryId: customValidators.id().required(),
    type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional().allow('', null),
    imageUrl: customValidators.url().optional().allow('', null),
    availability: Joi.number().integer().min(0).optional().default(10),
    sku: Joi.string().max(50).optional().allow('', null),
    dietaryNotes: Joi.array().items(Joi.string()).optional().allow(null),
    allergenCodes: Joi.array().items(Joi.string()).optional().allow(null),
    isAvailable: Joi.boolean().optional().default(true),
    preparationTime: Joi.number().integer().min(0).optional().allow(null),
    nutritionalInfo: Joi.string().optional().allow('', null),
  }),

  update: Joi.object({
    // menuId removed - products are linked to menus via junction table
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(''),
    price: customValidators.price().optional(),
    // category removed - auto-populated from categoryId
    categoryId: customValidators.id().optional(),
    type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional(),
    imageUrl: customValidators.url().optional().allow(''),
    availability: Joi.number().integer().min(0).optional(),
    sku: Joi.string().max(50).optional(),
    dietaryNotes: Joi.array().items(Joi.string()).optional(),
    allergenCodes: Joi.array().items(Joi.string()).optional(),
    isAvailable: Joi.boolean().optional(),
  }).min(1),

  query: Joi.object({
    category: Joi.string().optional().allow('', null),
    type: Joi.string().optional().allow('', null),
    isAvailable: Joi.boolean().optional().allow('', null),
    search: Joi.string().optional().allow('', null),
    menuId: customValidators.id().optional().allow('', null),
    page: Joi.number().integer().min(1).optional().default(1).allow('', null),
    limit: Joi.number().integer().min(1).max(100).optional().default(20).allow('', null),
    sortBy: Joi.string().valid('name', 'price', 'createdAt', 'category').optional().default('createdAt').allow('', null),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc').allow('', null),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Cart validation schemas
 */
export const cartSchemas = {
  addItem: Joi.object({
    productId: customValidators.id().required(),
    quantity: Joi.number().integer().min(1).max(99).required(),
    notes: Joi.string().max(500).optional().allow(''),
  }),

  updateItem: Joi.object({
    quantity: Joi.number().integer().min(1).max(99).required(),
    notes: Joi.string().max(500).optional().allow(''),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Order validation schemas
 */
export const orderSchemas = {
  create: Joi.object({
    orderType: Joi.string().valid('DINE_IN', 'PICKUP', 'DELIVERY', 'ONLINE').required(),
    tableId: customValidators.id().optional(),
    deliveryAddress: Joi.string().max(500).when('orderType', {
      is: 'DELIVERY',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    deliveryPostcode: customValidators.postcode().when('orderType', {
      is: 'DELIVERY',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'STRIPE', 'PAYPAL').required(),
    notes: Joi.string().max(1000).optional().allow(''),
    discountCode: Joi.string().max(50).optional().allow(''),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED').required(),
  }),

  query: Joi.object({
    status: Joi.string().valid('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED').optional(),
    customerId: customValidators.id().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Category validation schemas
 */
export const categorySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(500).optional().allow(''),
    imageUrl: customValidators.url().optional().allow(''),
    type: Joi.string().max(50).optional(),
    sortOrder: Joi.number().integer().min(0).optional().default(0),
    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    description: Joi.string().max(500).optional().allow(''),
    imageUrl: customValidators.url().optional().allow(''),
    type: Joi.string().max(50).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Customer validation schemas
 */
export const customerSchemas = {
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: customValidators.email().optional(),
    phone: customValidators.phone().optional(),
    address: Joi.string().max(500).optional().allow(''),
  }).min(1),

  updateStatus: Joi.object({
    isActive: Joi.boolean().required(),
  }),

  query: Joi.object({
    search: Joi.string().optional(),
    isActive: Joi.boolean().optional(),
    role: Joi.string().valid('CUSTOMER', 'ADMIN').optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Reservation validation schemas
 */
export const reservationSchemas = {
  create: Joi.object({
    guestName: Joi.string().min(2).max(100).required(),
    guestEmail: customValidators.email().required(),
    guestPhone: customValidators.phone().required(),
    partySize: Joi.number().integer().min(1).max(20).required(),
    reservationDate: customValidators.futureDate().required(),
    reservationTime: customValidators.time().required(),
    specialRequests: Joi.string().max(1000).optional().allow(''),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED').required(),
  }),

  assignTable: Joi.object({
    tableId: customValidators.id().required(),
  }),

  availableSlots: Joi.object({
    date: Joi.date().required(),
    partySize: Joi.number().integer().min(1).max(20).required(),
  }),

  query: Joi.object({
    date: Joi.date().optional(),
    status: Joi.string().valid('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED').optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Table validation schemas
 */
export const tableSchemas = {
  create: Joi.object({
    tableNumber: Joi.string().min(1).max(20).required(),
    capacity: Joi.number().integer().min(1).max(20).required(),
    location: Joi.string().max(100).optional().allow(''),
    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    tableNumber: Joi.string().min(1).max(20).optional(),
    capacity: Joi.number().integer().min(1).max(20).optional(),
    location: Joi.string().max(100).optional().allow(''),
    isActive: Joi.boolean().optional(),
  }).min(1),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Delivery Zone validation schemas
 */
export const deliveryZoneSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    postcodes: Joi.string().required(), // Comma-separated postcodes
    deliveryFee: customValidators.price().required(),
    minOrderValue: customValidators.price().optional().default(0),
    freeDeliveryThreshold: customValidators.price().optional(),
    estimatedTime: Joi.number().integer().min(0).required(), // in minutes
    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    postcodes: Joi.string().optional(),
    deliveryFee: customValidators.price().optional(),
    minOrderValue: customValidators.price().optional(),
    freeDeliveryThreshold: customValidators.price().optional(),
    estimatedTime: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),

  validateAddress: Joi.object({
    postcode: customValidators.postcode().required(),
  }),

  calculateFee: Joi.object({
    postcode: customValidators.postcode().required(),
    orderTotal: customValidators.price().required(),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Promotion validation schemas
 */
export const promotionSchemas = {
  create: Joi.object({
    code: Joi.string().min(3).max(50).uppercase().required(),
    discountType: Joi.string().valid('PERCENTAGE', 'FIXED').required(),
    discountValue: customValidators.price().required(),
    validFrom: Joi.date().required(),
    validTo: Joi.date().greater(Joi.ref('validFrom')).required(),
    usageLimit: Joi.number().integer().min(0).optional(),
    userLimit: Joi.number().integer().min(0).optional(),
    minOrderValue: customValidators.price().optional(),
    maxDiscount: customValidators.price().optional(),
    firstOrderOnly: Joi.boolean().optional().default(false),
    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    code: Joi.string().min(3).max(50).uppercase().optional(),
    discountType: Joi.string().valid('PERCENTAGE', 'FIXED').optional(),
    discountValue: customValidators.price().optional(),
    validFrom: Joi.date().optional(),
    validTo: Joi.date().optional(),
    usageLimit: Joi.number().integer().min(0).optional(),
    userLimit: Joi.number().integer().min(0).optional(),
    minOrderValue: customValidators.price().optional(),
    maxDiscount: customValidators.price().optional(),
    firstOrderOnly: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),

  validate: Joi.object({
    code: Joi.string().required(),
    userId: customValidators.id().optional(),
    orderTotal: customValidators.price().required(),
    items: Joi.array().items(Joi.object({
      productId: customValidators.id().required(),
      quantity: Joi.number().integer().min(1).required(),
    })).optional(),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};

/**
 * Payment validation schemas
 */
export const paymentSchemas = {
  create: Joi.object({
    orderId: customValidators.id().required(),
    amount: customValidators.price().required(),
    method: Joi.string().valid('CASH', 'CARD', 'STRIPE', 'PAYPAL').required(),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED').required(),
  }),

  id: Joi.object({
    id: customValidators.id().required(),
  }),
};
