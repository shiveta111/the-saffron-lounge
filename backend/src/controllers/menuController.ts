import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import { Prisma } from '@prisma/client';
import { JWTPayload } from '../utils/jwt';
import prisma from '../config/prisma';
import { menuService } from '../services/menuService';
import { wsManager } from '../utils/websocket';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'menu-controller' },
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

// Validation schemas
const createMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().min(0).precision(2).required(),
  category: Joi.string().min(2).max(50).required(),
  type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional(),
  categoryId: Joi.number().integer().min(1).optional(),
  imageUrl: Joi.string().optional().allow(''),
  dietaryNotes: Joi.array().items(Joi.string()).optional(),
  allergenCodes: Joi.array().items(Joi.number().integer()).optional(),
  availability: Joi.number().integer().min(0).optional().default(10),
  isAvailable: Joi.boolean().optional().default(true),
});

const updateMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().min(0).precision(2).optional(),
  category: Joi.string().min(2).max(50).optional(),
  type: Joi.string().valid('Vegetarian', 'Non-Vegetarian', 'All', 'Vegan').optional(),
  categoryId: Joi.number().integer().min(1).optional(),
  imageUrl: Joi.string().optional().allow(''),
  dietaryNotes: Joi.array().items(Joi.string()).optional(),
  allergenCodes: Joi.array().items(Joi.number().integer()).optional(),
  availability: Joi.number().integer().min(0).optional(),
  isAvailable: Joi.boolean().optional(),
});

const querySchema = Joi.object({
  category: Joi.string().optional(),
  type: Joi.string().optional(),
  isAvailable: Joi.boolean().optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(1000).optional().default(20),
  sortBy: Joi.string().valid('name', 'price', 'createdAt', 'category').optional().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
});

// Helper function for standardized error responses
const handleError = (
  res: Response,
  error: any,
  operation: string,
  context: Record<string, any> = {}
): Response => {
  // Log the error with full context
  logger.error(`Failed to ${operation}`, {
    error: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name,
    ...context,
  });

  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || [];
        const field = target.length > 0 ? target.join(', ') : 'field';
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: `A record with this ${field} already exists`,
          details: error.message,
        });
      }
      case 'P2025': {
        // Record not found
        return res.status(404).json({
          success: false,
          error: 'Record not found',
          message: 'The requested menu item does not exist',
          details: error.message,
        });
      }
      case 'P2003': {
        // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          error: 'Invalid reference',
          message: 'The referenced category does not exist',
          details: error.message,
        });
      }
      default: {
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'A database operation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid data provided to database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // Handle generic errors
  return res.status(500).json({
    success: false,
    error: `Failed to ${operation}`,
    message: error.message || 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
};

// Controller functions
export const getAllMenuItems = async (req: Request, res: Response) => {
  try {
    // Validate query parameters (but ignore pagination params)
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { 
        error: error.details?.[0]?.message, 
        query: req.query,
        validationErrors: error.details,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        message: error.details?.[0]?.message,
        details: error.details?.map(d => d.message).join(', '),
      });
    }

    const { category, type, isAvailable, search, sortBy, sortOrder } = value;

    logger.info('Fetching menu items', {
      filters: { category, type, isAvailable, search },
      sorting: { sortBy, sortOrder },
    });

    // Build where clause
    const where: any = {};
    if (category) where.category = category;
    if (type) where.type = type;
    if (isAvailable !== undefined) where.isAvailable = isAvailable;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get ALL menu items from Product table (no pagination)
    const menuItems = await prisma.product.findMany({
      where,
      include: {
        menuCategory: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy,
      // Remove take and skip to get all items
    });

    // Parse JSON fields and transform data
    const transformedItems = menuItems.map((item: any) => ({
      ...item,
      dietaryNotes: item.dietaryNotes ? JSON.parse(item.dietaryNotes) : [],
      allergenCodes: item.allergenCodes ? JSON.parse(item.allergenCodes) : [],
      allergens: item.allergens ? JSON.parse(item.allergens) : [],
      nutritionalInfo: item.nutritionalInfo ? JSON.parse(item.nutritionalInfo) : null,
    }));

    // Get total count
    const total = menuItems.length;

    logger.info('All menu items retrieved successfully (no pagination)', {
      count: menuItems.length,
      total,
      filters: { category, type, isAvailable, search },
    });

    res.json({
      success: true,
      data: {
        items: transformedItems,
        total,
      },
    });
  } catch (error) {
    return handleError(res, error, 'retrieve all menu items', {
      query: req.query,
    });
  }
};

export const getMenuItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID provided', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    logger.info('Received menu item ID', { id: Number(id) });

    const menuItem = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        menuCategory: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
    });

    // Log the menu item for debugging
    logger.info('Fetched menu item', { menuItem });

    if (!menuItem) {
      logger.warn('Menu item not found', { id: Number(id), requestedId: id, parsedId: Number(id) });
      
      // Get ID range to help with debugging
      const [minId, maxId] = await Promise.all([
        prisma.product.findFirst({ orderBy: { id: 'asc' }, select: { id: true } }),
        prisma.product.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
      ]);
      
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
        message: `No menu item exists with ID ${id}`,
        details: {
          requestedId: Number(id),
          availableRange: minId && maxId ? `${minId.id} - ${maxId.id}` : 'No items in database',
        },
      });
    }

    // Parse JSON fields
    const transformedItem = {
      ...menuItem,
      dietaryNotes: menuItem.dietaryNotes ? JSON.parse(menuItem.dietaryNotes) : [],
      allergenCodes: menuItem.allergenCodes ? JSON.parse(menuItem.allergenCodes) : [],
      nutritionalInfo: menuItem.nutritionalInfo ? JSON.parse(menuItem.nutritionalInfo) : null,
    };

    logger.info('Menu item retrieved successfully', { id: Number(id), name: menuItem.name });

    res.json({
      success: true,
      data: { item: transformedItem },
    });
  } catch (error) {
    return handleError(res, error, 'retrieve menu item', { id: req.params.id });
  }
};
export const createMenuItem = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createMenuItemSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid menu item data for creation', { 
        error: error.details?.[0]?.message,
        validationErrors: error.details,
        body: req.body,
        userId: (req.user as JWTPayload)?.userId,
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.details?.[0]?.message,
        details: error.details?.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    const { name, description, price, category, type, categoryId, imageUrl, dietaryNotes, allergenCodes, availability, isAvailable } = value;

    logger.info('Creating menu item', {
      name,
      category,
      categoryId,
      price,
      userId: (req.user as JWTPayload)?.userId,
    });

    // Check if item with same name and category already exists in Product table
    const existingItem = await prisma.product.findFirst({
      where: { 
        name: { equals: name },
        category: { equals: category }
      },
    });

    if (existingItem) {
      logger.warn('Duplicate menu item detected', {
        name,
        category,
        existingItemId: existingItem.id,
        requestBody: req.body,
      });
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: `Menu item "${name}" already exists in category "${category}"`,
        details: `An item with this name already exists (ID: ${existingItem.id})`,
      });
    }

    // Create the menu item in Product table
    const menuItem = await prisma.product.create({
      data: {
        name,
        description,
        price,
        category,
        type,
        categoryId: categoryId || null,
        imageUrl,
        dietaryNotes: dietaryNotes ? JSON.stringify(dietaryNotes) : null,
        allergenCodes: allergenCodes ? JSON.stringify(allergenCodes) : null,
        isAvailable,
        availability: availability || 10,
      },
      include: {
        menuCategory: true,
      },
    });

    // Parse JSON fields for response
    const transformedItem = {
      ...menuItem,
      dietaryNotes: menuItem.dietaryNotes ? JSON.parse(menuItem.dietaryNotes) : [],
      allergenCodes: menuItem.allergenCodes ? JSON.parse(menuItem.allergenCodes) : [],
    };

    logger.info('Menu item created successfully', {
      id: menuItem.id,
      name: menuItem.name,
      category: menuItem.category,
      price: menuItem.price,
      createdBy: (req.user as JWTPayload)?.userId,
      createdAt: menuItem.createdAt,
    });

    // Broadcast menu creation to all connected clients
    wsManager.broadcastToRoom('menu', 'menu:created', {
      item: transformedItem,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: { item: transformedItem },
    });
  } catch (error) {
    return handleError(res, error, 'create menu item', {
      body: req.body,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID for update', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    // Validate request body
    const { error, value } = updateMenuItemSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid update data', { 
        error: error.details?.[0]?.message,
        validationErrors: error.details,
        body: req.body,
        id,
        userId: (req.user as JWTPayload)?.userId,
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error.details?.[0]?.message,
        details: error.details?.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    logger.info('Updating menu item', {
      id: Number(id),
      changes: Object.keys(value),
      userId: (req.user as JWTPayload)?.userId,
    });

    // Check if menu item exists in Product table
    const existingItem = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!existingItem) {
      logger.warn('Menu item not found for update', { 
        id: Number(id),
        requestedChanges: value,
      });
      
      // Get ID range to help with debugging
      const [minId, maxId] = await Promise.all([
        prisma.product.findFirst({ orderBy: { id: 'asc' }, select: { id: true } }),
        prisma.product.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
      ]);
      
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
        message: `No menu item exists with ID ${id}`,
        details: {
          requestedId: Number(id),
          availableRange: minId && maxId ? `${minId.id} - ${maxId.id}` : 'No items in database',
        },
      });
    }

    // Check for name conflict if name is being updated
    if (value.name && value.name !== existingItem.name) {
      const nameConflict = await prisma.product.findFirst({
        where: {
          name: { equals: value.name },
          category: { equals: value.category || existingItem.category },
          id: { not: Number(id) },
        },
      });

      if (nameConflict) {
        logger.warn('Name conflict detected during update', {
          id: Number(id),
          newName: value.name,
          category: value.category || existingItem.category,
          conflictingItemId: nameConflict.id,
        });
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry',
          message: `Another menu item named "${value.name}" already exists in this category`,
          details: `Conflicting item ID: ${nameConflict.id}`,
        });
      }
    }

    // Prepare update data with JSON stringification for arrays
    const updateData: any = { ...value };
    if (value.dietaryNotes) {
      updateData.dietaryNotes = JSON.stringify(value.dietaryNotes);
    }
    if (value.allergenCodes) {
      updateData.allergenCodes = JSON.stringify(value.allergenCodes);
    }

    // Update the menu item in Product table
    const updatedItem = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        menuCategory: true,
      },
    });

    // Parse JSON fields for response
    const transformedItem = {
      ...updatedItem,
      dietaryNotes: updatedItem.dietaryNotes ? JSON.parse(updatedItem.dietaryNotes) : [],
      allergenCodes: updatedItem.allergenCodes ? JSON.parse(updatedItem.allergenCodes) : [],
    };

    logger.info('Menu item updated successfully', {
      id: Number(id),
      name: updatedItem.name,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
      previousValues: {
        name: existingItem.name,
        price: existingItem.price,
        category: existingItem.category,
      },
      newValues: {
        name: updatedItem.name,
        price: updatedItem.price,
        category: updatedItem.category,
      },
    });

    // Broadcast menu update to all connected clients
    wsManager.broadcastToRoom('menu', 'menu:updated', {
      item: transformedItem,
      changes: Object.keys(value),
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: { item: transformedItem },
    });
  } catch (error) {
    return handleError(res, error, 'update menu item', {
      id: req.params.id,
      body: req.body,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Support force delete via query parameter

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID for deletion', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    const forceDelete = force === 'true' || force === '1';

    logger.info('Attempting to delete menu item', {
      id: Number(id),
      userId: (req.user as JWTPayload)?.userId,
      forceDelete,
    });

    // Check if menu item exists in Menu table (not Product table)
    const existingItem = await prisma.menu.findUnique({
      where: { id: Number(id) },
      include: {
        menuProducts: {
          select: { 
            productId: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!existingItem) {
      logger.warn('Menu item not found for deletion', { 
        id: Number(id),
      });
      
      // Get ID range to help with debugging (checking Menu table, not Product)
      const [minId, maxId] = await Promise.all([
        prisma.menu.findFirst({ orderBy: { id: 'asc' }, select: { id: true } }),
        prisma.menu.findFirst({ orderBy: { id: 'desc' }, select: { id: true } }),
      ]);
      
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
        message: `No menu item exists with ID ${id} in Menu table`,
        details: {
          requestedId: Number(id),
          availableRange: minId && maxId ? `${minId.id} - ${maxId.id}` : 'No items in Menu table',
          note: 'This endpoint deletes from Menu table (legacy). For products, use /api/v1/products/:id',
        },
      });
    }

    // Check if menu has associated products
    const hasProducts = existingItem.menuProducts && existingItem.menuProducts.length > 0;

    if (hasProducts && !forceDelete) {
      logger.warn('Cannot delete menu item with associated products', {
        id: Number(id),
        name: existingItem.name,
        productCount: existingItem.menuProducts.length,
      });
      return res.status(409).json({
        success: false,
        error: 'Cannot delete menu item',
        message: `This menu item has ${existingItem.menuProducts.length} associated product(s)`,
        details: 'Consider marking it as unavailable instead of deleting, or use force=true to delete all associated products',
        products: existingItem.menuProducts
          .filter(mp => mp.product !== null)
          .map(mp => ({ id: mp.product!.id, name: mp.product!.name })),
      });
    }

    // If force delete, first delete all associated menu products (junction table entries)
    if (forceDelete && hasProducts) {
      logger.info('Force deleting associated menu products', {
        menuId: Number(id),
        productCount: existingItem.menuProducts.length,
      });

      // Delete all menu product associations (junction table entries)
      await prisma.menuProduct.deleteMany({
        where: { menuId: Number(id) },
      });

      logger.info('Associated menu products deleted', {
        menuId: Number(id),
        deletedCount: existingItem.menuProducts.length,
      });
    }

    // Delete the menu item from Menu table
    await prisma.menu.delete({
      where: { id: Number(id) },
    });

    logger.info('Menu item deleted successfully', {
      id: Number(id),
      name: existingItem.name,
      category: existingItem.category,
      price: existingItem.price,
      deletedBy: (req.user as JWTPayload)?.userId,
      deletedAt: new Date().toISOString(),
    });

    // Broadcast menu deletion to all connected clients
    wsManager.broadcastToRoom('menu', 'menu:deleted', {
      id: Number(id),
      name: existingItem.name,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    return handleError(res, error, 'delete menu item', {
      id: req.params.id,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};

/**
 * Update menu item price with history tracking
 */
export const updateMenuPrice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, reason } = req.body;
    const userId = (req.user as JWTPayload)?.userId;

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID for price update', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    if (!price || price < 0) {
      logger.warn('Invalid price value', { price, id, userId });
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'Price must be a positive number',
        details: `Received: ${price}`,
      });
    }

    if (!userId) {
      logger.warn('Unauthenticated price update attempt', { id });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to update prices',
      });
    }

    logger.info('Updating menu item price', {
      id: Number(id),
      newPrice: price,
      reason,
      userId,
    });

    const updatedMenu = await menuService.updatePrice(
      Number(id),
      price,
      userId,
      reason
    );

    logger.info('Menu item price updated successfully', {
      id: Number(id),
      newPrice: price,
      userId,
    });

    res.json({
      success: true,
      message: 'Price updated successfully',
      data: { menu: updatedMenu },
    });
  } catch (error) {
    return handleError(res, error, 'update menu price', {
      id: req.params.id,
      price: req.body.price,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};

/**
 * Toggle menu item availability
 */
export const toggleMenuAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    const userId = (req.user as JWTPayload)?.userId;

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID for availability toggle', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    if (isAvailable === undefined) {
      logger.warn('Missing isAvailable field', { id, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'isAvailable field is required',
        details: 'Expected boolean value (true or false)',
      });
    }

    if (!userId) {
      logger.warn('Unauthenticated availability toggle attempt', { id });
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to update availability',
      });
    }

    logger.info('Toggling menu item availability', {
      id: Number(id),
      isAvailable,
      userId,
    });

    const updatedMenu = await menuService.toggleAvailability(
      Number(id),
      isAvailable,
      userId
    );

    logger.info('Menu item availability updated successfully', {
      id: Number(id),
      name: updatedMenu.name,
      isAvailable,
      userId,
    });

    // Broadcast availability change
    wsManager.broadcastToRoom('menu', 'menu:availability:changed', {
      id: Number(id),
      name: updatedMenu.name,
      isAvailable,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: { menu: updatedMenu },
    });
  } catch (error) {
    return handleError(res, error, 'toggle menu availability', {
      id: req.params.id,
      isAvailable: req.body.isAvailable,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};

/**
 * Get price history for menu item
 */
export const getMenuPriceHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    if (!id || isNaN(Number(id))) {
      logger.warn('Invalid menu item ID for price history', { id, params: req.params });
      return res.status(400).json({
        success: false,
        error: 'Invalid menu item ID',
        message: 'Menu item ID must be a valid number',
        details: `Received: ${id}`,
      });
    }

    logger.info('Fetching price history', {
      id: Number(id),
      limit: Number(limit),
    });

    const history = await menuService.getPriceHistory(
      Number(id),
      Number(limit)
    );

    logger.info('Price history retrieved successfully', {
      id: Number(id),
      recordCount: history.length,
    });

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    return handleError(res, error, 'get price history', {
      id: req.params.id,
      limit: req.query.limit,
    });
  }
};

/**
 * Bulk update menu prices
 */
export const bulkUpdatePrices = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    const userId = (req.user as JWTPayload)?.userId;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      logger.warn('Invalid bulk update request', { updates, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Updates array is required and must not be empty',
        details: 'Expected array of update objects with id and price fields',
      });
    }

    if (!userId) {
      logger.warn('Unauthenticated bulk price update attempt');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to update prices',
      });
    }

    logger.info('Starting bulk price update', {
      updateCount: updates.length,
      userId,
    });

    const result = await menuService.bulkUpdatePrices(updates, userId);

    logger.info('Bulk price update completed', {
      updateCount: updates.length,
      result,
      userId,
    });

    res.json({
      success: true,
      message: 'Bulk price update completed',
      data: result,
    });
  } catch (error) {
    return handleError(res, error, 'bulk update prices', {
      updateCount: req.body.updates?.length,
      userId: (req.user as JWTPayload)?.userId,
    });
  }
};


/**
 * Get all menu items without pagination
 */
export const getAllMenuItemsNoPagination = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all menu items without pagination');

    // Get all menu items without pagination from Product table
    const menuItems = await prisma.product.findMany({
      include: {
        menuCategory: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields and transform data
    const transformedItems = menuItems.map((item: any) => ({
      ...item,
      dietaryNotes: item.dietaryNotes ? JSON.parse(item.dietaryNotes) : [],
      allergenCodes: item.allergenCodes ? JSON.parse(item.allergenCodes) : [],
      allergens: item.allergens ? JSON.parse(item.allergens) : [],
      nutritionalInfo: item.nutritionalInfo ? JSON.parse(item.nutritionalInfo) : null,
    }));

    logger.info('All menu items retrieved successfully (no pagination)', {
      count: menuItems.length,
      total: menuItems.length,
    });

    res.json({
      success: true,
      data: {
        items: transformedItems,
        total: menuItems.length,
      },
    });
  } catch (error) {
    return handleError(res, error, 'retrieve all menu items (no pagination)', {});
  }
};

/**
 * Get all menu categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    logger.info('Fetching menu categories');

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
    });

    logger.info('Categories retrieved successfully', {
      count: categories.length,
    });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    return handleError(res, error, 'retrieve categories', {});
  }
};
