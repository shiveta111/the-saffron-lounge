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
  defaultMeta: { service: 'category-service' },
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

export interface CategoryData {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  type?: string;
}

export interface CategoryFilters {
  search?: string;
  isActive?: boolean;
  type?: string;
}

/**
 * Get all categories with optional filtering and pagination
 */
export const getAllCategories = async (
  page: number = 1,
  limit: number = 10,
  filters: CategoryFilters = {},
  sortBy: string = 'sortOrder',
  order: 'asc' | 'desc' = 'asc'
) => {
  try {
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.type) {
      where.type = filters.type;
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
      orderBy: { [sortBy]: order },
      take: limit,
      skip: offset,
    });

    // Get total count
    const total = await prisma.category.count({ where });

    logger.info('Categories retrieved', {
      count: categories.length,
      total,
      page,
      limit,
      filters,
    });

    return {
      categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error('Failed to retrieve categories', { error, filters });
    throw error;
  }
};

/**
 * Get category by ID
 */
export const getCategoryById = async (id: number) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
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
        products: {
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
      return null;
    }

    logger.info('Category retrieved', { id, name: category.name });
    return category;
  } catch (error) {
    logger.error('Failed to retrieve category', { error, id });
    throw error;
  }
};

/**
 * Create a new category
 */
export const createCategory = async (data: CategoryData) => {
  try {
    // Check if name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existingCategory) {
      logger.warn('Category name already exists', { name: data.name });
      throw new Error('Category with this name already exists');
    }

    // Create the category
    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        type: data.type || null,
      },
    });

    logger.info('Category created', {
      id: category.id,
      name: category.name,
    });

    return category;
  } catch (error) {
    logger.error('Failed to create category', { error, data });
    throw error;
  }
};

/**
 * Update an existing category
 */
export const updateCategory = async (id: number, data: Partial<CategoryData>) => {
  try {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      logger.warn('Category not found for update', { id });
      return null;
    }

    // Check name uniqueness if being updated
    if (data.name && data.name !== existingCategory.name) {
      const nameConflict = await prisma.category.findUnique({
        where: { name: data.name },
      });

      if (nameConflict) {
        logger.warn('Category name conflict', { name: data.name });
        throw new Error('Another category with this name already exists');
      }
    }

    // Update the category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
    });

    logger.info('Category updated', {
      id,
      name: updatedCategory.name,
      changes: Object.keys(data),
    });

    return updatedCategory;
  } catch (error) {
    logger.error('Failed to update category', { error, id, data });
    throw error;
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: number) => {
  try {
    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            products: true,
            menus: true,
          },
        },
      },
    });

    if (!existingCategory) {
      logger.warn('Category not found for deletion', { id });
      return null;
    }

    // Check if category has associated menus or products
    if (existingCategory._count.menus > 0 || existingCategory._count.products > 0) {
      logger.warn('Cannot delete category with associated items', {
        id,
        menuCount: existingCategory._count.menus,
        productCount: existingCategory._count.products,
      });
      throw new Error('Cannot delete category that contains menu items or products. Please reassign or remove items first.');
    }

    // Delete the category
    await prisma.category.delete({
      where: { id },
    });

    logger.info('Category deleted', {
      id,
      name: existingCategory.name,
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete category', { error, id });
    throw error;
  }
};

/**
 * Check if a category has associated items
 */
export const hasAssociatedItems = async (id: number): Promise<{ hasItems: boolean; menuCount: number; productCount: number }> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            products: true,
            menus: true,
          },
        },
      },
    });

    if (!category) {
      return { hasItems: false, menuCount: 0, productCount: 0 };
    }

    const hasItems = category._count.menus > 0 || category._count.products > 0;
    return {
      hasItems,
      menuCount: category._count.menus,
      productCount: category._count.products,
    };
  } catch (error) {
    logger.error('Failed to check associated items', { error, id });
    throw error;
  }
};
