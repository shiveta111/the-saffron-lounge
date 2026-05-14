import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import * as categoryService from '../services/categoryService';
import { wsManager } from '../utils/websocket';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'categories-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/categories-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/categories.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  imageUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional().default(true),
  sortOrder: Joi.number().integer().min(0).optional().default(0),
  type: Joi.string().valid('MENU', 'PRODUCT', 'BLOG', 'GENERAL').optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  imageUrl: Joi.string().uri().optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  type: Joi.string().valid('MENU', 'PRODUCT', 'BLOG', 'GENERAL').optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  search: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  sort_by: Joi.string().valid('name', 'createdAt', 'sortOrder').optional().default('sortOrder'),
  order: Joi.string().valid('asc', 'desc').optional().default('asc'),
});

// Controller functions
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
      return;
    }

    const { page, limit, search, isActive, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Get categories with pagination
    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: { 
            products: true,
            menus: true,
          },
        },
      },
      orderBy: { [sort_by]: order },
      take: limit,
      skip: offset,
    });

    // Map categories to include item_count (from menus table)
    const categoriesWithCount = categories.map((cat: any) => ({
      ...cat,
      item_count: cat._count.menus,
      product_count: cat._count.products,
    }));

    // Get total count
    const total = await prisma.category.count({ where });

    logger.info('Categories retrieved successfully', {
      count: categories.length,
      total,
      page,
      limit,
      search,
    });

    res.json({
      success: true,
      data: {
        categories: categoriesWithCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve categories', { error, query: req.query });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve categories',
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid category ID',
      });
      return;
    }

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        menus: {
          select: {
            id: true,
            name: true,
            price: true,
            isAvailable: true,
            imageUrl: true,
            type: true,
          },
          where: { isAvailable: true },
          take: 20,
        },
        _count: {
          select: { 
            products: true,
            menus: true,
          },
        },
      },
    });

    if (!category) {
      logger.warn('Category not found', { id });
      res.status(404).json({
        success: false,
        error: 'Category not found',
      });
      return;
    }

    logger.info('Category retrieved successfully', { id, name: category.name });

    // Add item_count to response
    const categoryWithCount = {
      ...category,
      item_count: category._count.menus,
      product_count: category._count.products,
    };

    res.json({
      success: true,
      data: { category: categoryWithCount },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve category', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category',
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid category data', { error: error.details?.[0]?.message, body: req.body });
      res.status(400).json({
        success: false,
        error: 'Invalid category data',
        details: error.details?.[0]?.message,
      });
      return;
    }

    // Create the category using service
    const category = await categoryService.createCategory(value);

    logger.info('Category created successfully', {
      id: category.id,
      name: category.name,
      createdBy: (req.user as any)?.userId,
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('categories', 'CATEGORY_CREATED', {
      category,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
    } catch (error: any) {
    logger.error("Failed operation", { error: error?.message || error, id: req.params?.id, body: req.body });
    
    if (error?.code === "P2002" || (error?.meta && error?.meta?.target)) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: "Unique constraint violation",
      });
    }
    
    if (error?.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Resource not found",
      });
    }
    
    if (error?.message && (
      error.message.includes("already exists") || 
      error.message.includes("conflict") || 
      error.message.includes("Cannot delete")
    )) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Operation failed",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid category ID',
      });
      return;
    }

    // Validate request body
    const { error, value } = updateCategorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid category update data', { error: error.details?.[0]?.message, body: req.body });
      res.status(400).json({
        success: false,
        error: 'Invalid category update data',
        details: error.details?.[0]?.message,
      });
      return;
    }

    // Update the category using service
    const updatedCategory = await categoryService.updateCategory(Number(id), value);

    if (!updatedCategory) {
      logger.warn('Category not found for update', { id });
      res.status(404).json({
        success: false,
        error: 'Category not found',
      });
      return;
    }

    logger.info('Category updated successfully', {
      id,
      name: updatedCategory.name,
      updatedBy: (req.user as any)?.userId,
      changes: Object.keys(value),
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('categories', 'CATEGORY_UPDATED', {
      category: updatedCategory,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category: updatedCategory },
    });
    } catch (error: any) {
    logger.error("Failed operation", { error: error?.message || error, id: req.params?.id, body: req.body });
    
    if (error?.code === "P2002" || (error?.meta && error?.meta?.target)) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: "Unique constraint violation",
      });
    }
    
    if (error?.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Resource not found",
      });
    }
    
    if (error?.message && (
      error.message.includes("already exists") || 
      error.message.includes("conflict") || 
      error.message.includes("Cannot delete")
    )) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Operation failed",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid category ID',
      });
      return;
    }

    // Get category info before deletion for WebSocket event
    const categoryToDelete = await categoryService.getCategoryById(Number(id));

    if (!categoryToDelete) {
      logger.warn('Category not found for deletion', { id });
      res.status(404).json({
        success: false,
        error: 'Category not found',
      });
      return;
    }

    // Delete the category using service
    await categoryService.deleteCategory(Number(id));

    logger.info('Category deleted successfully', {
      id,
      name: categoryToDelete.name,
      deletedBy: (req.user as any)?.userId,
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('categories', 'CATEGORY_DELETED', {
      categoryId: Number(id),
      categoryName: categoryToDelete.name,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
    } catch (error: any) {
    logger.error("Failed operation", { error: error?.message || error, id: req.params?.id, body: req.body });
    
    if (error?.code === "P2002" || (error?.meta && error?.meta?.target)) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: "Unique constraint violation",
      });
    }
    
    if (error?.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Resource not found",
      });
    }
    
    if (error?.message && (
      error.message.includes("already exists") || 
      error.message.includes("conflict") || 
      error.message.includes("Cannot delete")
    )) {
      return res.status(409).json({
        success: false,
        error: "A conflict occurred. This resource may already exist or there's a data conflict.",
        details: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Operation failed",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
};