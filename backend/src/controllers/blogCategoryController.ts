import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'blog-category-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/blog-category-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/blog-category.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Validation schemas
const createBlogCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  color: Joi.string().max(20).optional().allow(''),
  isActive: Joi.boolean().optional().default(true),
  sortOrder: Joi.number().integer().min(0).optional().default(0),
});

const updateBlogCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  slug: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  color: Joi.string().max(20).optional().allow(''),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
});

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  search: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  sort_by: Joi.string().valid('name', 'sortOrder', 'created_at').optional().default('sortOrder'),
  order: Joi.string().valid('asc', 'desc').optional().default('asc'),
});

// Controller functions
export const getAllBlogCategories = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      logger.warn('Invalid query parameters', { error: error.details?.[0]?.message, query: req.query });
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { page, limit, search, isActive, sort_by, order } = value;
    const offset = (page - 1) * limit;

    // Check if blogs.category_id column exists, if not add it
    try {
      await (prisma as any).$queryRawUnsafe(`SELECT category_id FROM blogs LIMIT 1`);
    } catch (colError: any) {
      // Column doesn't exist, add it
      logger.warn('blogs.category_id column does not exist, attempting to add it...');
      try {
        await (prisma as any).$executeRawUnsafe(`
          ALTER TABLE blogs 
          ADD COLUMN category_id INTEGER NULL,
          ADD INDEX blogs_category_id_idx (category_id)
        `);
        logger.info('blogs.category_id column added successfully');
      } catch (addColError: any) {
        logger.error('Failed to add category_id column to blogs table', { error: addColError.message });
        // Continue anyway, we'll use raw SQL
      }
    }

    // Check if Prisma client has blogCategory model
    if ((prisma as any).blogCategory) {
      // Build where clause
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get categories with pagination
      let categories;
      try {
        categories = await (prisma as any).blogCategory.findMany({
          where,
          orderBy: { [sort_by]: order },
          take: limit,
          skip: offset,
          include: {
            _count: {
              select: { blogs: true },
            },
          },
        });
      } catch (prismaError: any) {
        // If Prisma fails (e.g., blog count issue), fall back to raw SQL
        logger.warn('Prisma query failed, using raw SQL fallback', { error: prismaError.message });
        categories = await getCategoriesWithRawSQL(where, search, isActive, sort_by, order, limit, offset);
      }

      // Get total count
      const total = await (prisma as any).blogCategory.count({ where });

      logger.info('Blog categories retrieved successfully', {
        count: categories.length,
        total,
        page,
        limit,
        search,
      });

      res.json({
        success: true,
        data: {
          categories: categories.map((cat: any) => ({
            ...cat,
            blogCount: cat._count?.blogs || 0,
          })),
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
    } else {
      // Use raw SQL fallback
      const where: any = {};
      if (search) {
        where.search = search;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      const categories = await getCategoriesWithRawSQL(where, search, isActive, sort_by, order, limit, offset);
      const total = await getCategoriesCountWithRawSQL(where);

      logger.info('Blog categories retrieved successfully (raw SQL)', {
        count: categories.length,
        total,
        page,
        limit,
      });

      res.json({
        success: true,
        data: {
          categories,
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
    }
  } catch (error: any) {
    // If error is about missing column, try to add it and retry
    if (error.code === 'P2022' && error.meta?.column?.includes('category_id')) {
      logger.warn('blogs.category_id column missing, attempting to add it...');
      try {
        await (prisma as any).$executeRawUnsafe(`
          ALTER TABLE blogs 
          ADD COLUMN category_id INTEGER NULL
        `);
        try {
          await (prisma as any).$executeRawUnsafe(`CREATE INDEX blogs_category_id_idx ON blogs(category_id)`);
        } catch (idxError: any) {
          // Index might already exist, ignore
        }
        logger.info('blogs.category_id column added, retrying query...');
        // Retry the function
        return getAllBlogCategories(req, res);
      } catch (addColError: any) {
        logger.error('Failed to add category_id column', { error: addColError.message });
        // Fall back to raw SQL
        return getAllBlogCategoriesRawSQL(req, res);
      }
    }
    
    logger.error('Failed to retrieve blog categories', { error: error.message, code: error.code, query: req.query });
    // Try raw SQL as fallback
    try {
      return getAllBlogCategoriesRawSQL(req, res);
    } catch (fallbackError: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blog categories',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
};

// Helper function to get categories using raw SQL
async function getCategoriesWithRawSQL(where: any, search: string | undefined, isActive: boolean | undefined, sort_by: string, order: string, limit: number, offset: number) {
  let query = 'SELECT bc.*, COUNT(b.id) as blogCount FROM blog_categories bc';
  query += ' LEFT JOIN blogs b ON bc.id = b.category_id';
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (search) {
    conditions.push('(bc.name LIKE ? OR bc.description LIKE ? OR bc.slug LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (isActive !== undefined) {
    conditions.push('bc.isActive = ?');
    params.push(isActive ? 1 : 0);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' GROUP BY bc.id';
  query += ` ORDER BY bc.${sort_by} ${order.toUpperCase()}`;
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const results = await (prisma as any).$queryRawUnsafe(query, ...params);
  
  return results.map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    isActive: row.isActive === 1 || row.isActive === true,
    sortOrder: row.sortOrder,
    created_at: row.created_at,
    updated_at: row.updated_at,
    blogCount: Number(row.blogCount) || 0,
  }));
}

// Helper function to get categories count using raw SQL
async function getCategoriesCountWithRawSQL(where: any) {
  let query = 'SELECT COUNT(DISTINCT bc.id) as total FROM blog_categories bc';
  
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (where.search) {
    conditions.push('(bc.name LIKE ? OR bc.description LIKE ? OR bc.slug LIKE ?)');
    const searchTerm = `%${where.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (where.isActive !== undefined) {
    conditions.push('bc.isActive = ?');
    params.push(where.isActive ? 1 : 0);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  const results = await (prisma as any).$queryRawUnsafe(query, ...params);
  return results[0]?.total || 0;
}

// Fallback function using raw SQL
async function getAllBlogCategoriesRawSQL(req: Request, res: Response) {
  try {
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.details?.[0]?.message,
      });
    }

    const { page, limit, search, isActive, sort_by, order } = value;
    const offset = (page - 1) * limit;

    let query = 'SELECT bc.*, COUNT(b.id) as blogCount FROM blog_categories bc';
    query += ' LEFT JOIN blogs b ON bc.id = b.category_id';
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (search) {
      conditions.push('(bc.name LIKE ? OR bc.description LIKE ? OR bc.slug LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (isActive !== undefined) {
      conditions.push('bc.isActive = ?');
      params.push(isActive ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY bc.id';
    query += ` ORDER BY bc.${sort_by} ${order.toUpperCase()}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const categories = await (prisma as any).$queryRawUnsafe(query, ...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(DISTINCT bc.id) as total FROM blog_categories bc';
    const countParams: any[] = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      countParams.push(...params.slice(0, params.length - 2)); // Remove limit and offset
    }
    const countResult = await (prisma as any).$queryRawUnsafe(countQuery, ...countParams);
    const total = Number(countResult[0]?.total) || 0;

    const normalizedCategories = categories.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      color: row.color,
      isActive: row.isActive === 1 || row.isActive === true,
      sortOrder: row.sortOrder,
      created_at: row.created_at,
      updated_at: row.updated_at,
      blogCount: Number(row.blogCount) || 0,
    }));

    res.json({
      success: true,
      data: {
        categories: normalizedCategories,
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
    logger.error('Failed to retrieve blog categories (raw SQL fallback)', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blog categories',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

export const getBlogCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog category ID',
      });
    }

    const category = await (prisma as any).blogCategory.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!category) {
      logger.warn('Blog category not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog category not found',
      });
    }

    logger.info('Blog category retrieved successfully', { id, name: category.name });

    res.json({
      success: true,
      data: {
        category: {
          ...category,
          blogCount: category._count?.blogs || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve blog category', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve blog category',
    });
  }
};

export const createBlogCategory = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createBlogCategorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid blog category data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid blog category data',
        details: error.details?.[0]?.message,
      });
    }

    const { name, slug, description, color, isActive, sortOrder } = value;

    // Generate slug if not provided
    const categorySlug = slug || generateSlug(name);

    // Check if table exists, if not create it and use raw SQL
    let tableExists = false;
    try {
      await (prisma as any).$queryRaw`SELECT 1 FROM blog_categories LIMIT 1`;
      tableExists = true;
    } catch (tableError: any) {
      // Table doesn't exist, create it
      logger.warn('blog_categories table does not exist, attempting to create it...');
      try {
        await (prisma as any).$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS blog_categories (
            id INTEGER NOT NULL AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT NULL,
            color VARCHAR(20) NULL,
            isActive BOOLEAN NOT NULL DEFAULT true,
            sortOrder INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (id),
            UNIQUE KEY blog_categories_name_key (name),
            UNIQUE KEY blog_categories_slug_key (slug),
            INDEX blog_categories_slug_idx (slug),
            INDEX blog_categories_isActive_idx (isActive),
            INDEX blog_categories_sortOrder_idx (sortOrder)
          ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        logger.info('blog_categories table created successfully');
        tableExists = true;
      } catch (createError: any) {
        logger.error('Failed to create blog_categories table', { error: createError.message, stack: createError.stack });
        return res.status(500).json({
          success: false,
          error: 'Database table does not exist and could not be created automatically. Please run: npx prisma generate && npx prisma db push',
          details: process.env.NODE_ENV === 'development' ? createError.message : undefined,
        });
      }
    }

    // Always use raw SQL for duplicate check and creation to avoid Prisma client issues
    let category;
    
    // Check if slug or name already exists using raw SQL (more reliable)
    try {
      const existing = await (prisma as any).$queryRawUnsafe(
        `SELECT id, name, slug FROM blog_categories WHERE LOWER(slug) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1`,
        categorySlug,
        name
      );
      
      if (Array.isArray(existing) && existing.length > 0) {
        const existingItem = existing[0];
        if (existingItem.slug && existingItem.slug.toLowerCase() === categorySlug.toLowerCase()) {
          return res.status(409).json({
            success: false,
            error: `Blog category with slug "${existingItem.slug}" already exists`,
          });
        }
        if (existingItem.name && existingItem.name.toLowerCase() === name.toLowerCase()) {
          return res.status(409).json({
            success: false,
            error: `Blog category with name "${existingItem.name}" already exists`,
          });
        }
      }
    } catch (checkError: any) {
      // If check fails, log but continue (might be first time creating)
      logger.warn('Duplicate check failed, continuing anyway', { error: checkError.message });
    }

    // Try Prisma first if available
    if (tableExists && (prisma as any).blogCategory) {
      try {
        // Create the blog category using Prisma
        category = await (prisma as any).blogCategory.create({
          data: {
            name,
            slug: categorySlug,
            description: description || null,
            color: color || null,
            isActive: isActive !== undefined ? isActive : true,
            sortOrder: sortOrder || 0,
          },
        });
      } catch (prismaError: any) {
        // If Prisma fails, fall back to raw SQL
        logger.warn('Prisma create failed, using raw SQL fallback', { error: prismaError.message });
        category = null; // Will trigger raw SQL path
      }
    }
    
    // Use raw SQL if Prisma failed or model doesn't exist
    if (!category) {
      // Use raw SQL as fallback
      logger.info('Using raw SQL for blog category creation');
      
      // Insert using raw SQL (duplicate check already done above)
      const isActiveValue = isActive !== undefined ? (isActive ? 1 : 0) : 1;
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO blog_categories (name, slug, description, color, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?)`,
        name,
        categorySlug,
        description || null,
        color || null,
        isActiveValue,
        sortOrder || 0
      );
      
      // Fetch the created category
      const created = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM blog_categories WHERE slug = ? LIMIT 1`,
        categorySlug
      );
      
      if (Array.isArray(created) && created.length > 0) {
        category = created[0];
      } else {
        throw new Error('Failed to retrieve created category');
      }
    }

    logger.info('Blog category created successfully', {
      id: category.id,
      name: category.name,
      slug: category.slug,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    // Normalize category object (handle both Prisma and raw SQL responses)
    const normalizedCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      color: category.color,
      isActive: category.isActive !== undefined ? category.isActive : (category.isActive === 1 || category.isActive === true),
      sortOrder: category.sortOrder,
      created_at: category.created_at || category.created_at,
      updated_at: category.updated_at || category.updated_at,
    };

    res.status(201).json({
      success: true,
      message: 'Blog category created successfully',
      data: { category: normalizedCategory },
    });
  } catch (error: any) {
    logger.error('Failed to create blog category', { 
      error: error.message, 
      stack: error.stack,
      code: error.code,
      meta: error.meta,
      body: req.body 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create blog category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateBlogCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog category ID',
      });
    }

    // Validate request body
    const { error, value } = updateBlogCategorySchema.validate(req.body);
    if (error) {
      logger.warn('Invalid blog category update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid blog category update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if category exists
    const existingCategory = await (prisma as any).blogCategory.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCategory) {
      logger.warn('Blog category not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog category not found',
      });
    }

    // Handle slug uniqueness if being updated
    let categorySlug = value.slug;
    if (value.name && !value.slug) {
      // Generate slug from name if name changed but slug not provided
      categorySlug = generateSlug(value.name);
    } else if (!value.slug && !value.name) {
      categorySlug = existingCategory.slug;
    }

    if (categorySlug && categorySlug !== existingCategory.slug) {
      const slugConflict = await (prisma as any).blogCategory.findUnique({
        where: { slug: categorySlug },
      });

      if (slugConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another blog category with this slug already exists',
        });
      }
    }

    // Handle name uniqueness if being updated
    if (value.name && value.name !== existingCategory.name) {
      const nameConflict = await (prisma as any).blogCategory.findUnique({
        where: { name: value.name },
      });

      if (nameConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another blog category with this name already exists',
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (value.name !== undefined) updateData.name = value.name;
    if (categorySlug) updateData.slug = categorySlug;
    if (value.description !== undefined) updateData.description = value.description || null;
    if (value.color !== undefined) updateData.color = value.color || null;
    if (value.isActive !== undefined) updateData.isActive = value.isActive;
    if (value.sortOrder !== undefined) updateData.sortOrder = value.sortOrder;

    // Update the blog category
    const updatedCategory = await (prisma as any).blogCategory.update({
      where: { id: Number(id) },
      data: updateData,
    });

    logger.info('Blog category updated successfully', {
      id,
      name: updatedCategory.name,
      slug: updatedCategory.slug,
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: Object.keys(value),
    });

    res.json({
      success: true,
      message: 'Blog category updated successfully',
      data: { category: updatedCategory },
    });
  } catch (error) {
    logger.error('Failed to update blog category', { error, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update blog category',
    });
  }
};

export const deleteBlogCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid blog category ID',
      });
    }

    // Check if category exists
    const existingCategory = await (prisma as any).blogCategory.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!existingCategory) {
      logger.warn('Blog category not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Blog category not found',
      });
    }

    // Check if category is being used by any blogs
    const blogCount = existingCategory._count?.blogs || 0;
    if (blogCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete category. It is being used by ${blogCount} blog post(s). Please reassign or remove those posts first.`,
      });
    }

    // Delete the blog category
    await (prisma as any).blogCategory.delete({
      where: { id: Number(id) },
    });

    logger.info('Blog category deleted successfully', {
      id,
      name: existingCategory.name,
      slug: existingCategory.slug,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Blog category deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete blog category', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog category',
    });
  }
};

