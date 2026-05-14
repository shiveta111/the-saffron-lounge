import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { discountService } from '../services/discountService';
import { promotionService } from '../services/promotionService';
import { wsManager } from '../utils/websocket';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper function to check if a column exists in a table
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
    `;
    return result.length > 0;
  } catch (error) {
    logger.warn('Could not check column existence', { tableName, columnName, error });
    return false;
  }
}

// Helper function to filter promotion data to only include existing columns
async function filterPromotionData(data: any): Promise<any> {
  const filtered: any = {};
  const columnsToCheck = [
    'name', 'code', 'type', 'discountType', 'discountValue', 'validFrom', 'validTo',
    'usageLimit', 'minOrderValue', 'maxDiscount', 'userLimit', 'firstOrderOnly',
    'description', 'isActive', 'applicableType', 'categoryIds', 'productIds',
    'bannerImageUrl', 'priority', 'happyHourStart', 'happyHourEnd', 'happyHourDays',
    'bogoBuyQuantity', 'bogoGetQuantity', 'bogoProductId', 'requiresCouponCode', 'autoApply'
  ];

  for (const column of columnsToCheck) {
    if (data[column] !== undefined) {
      const exists = await checkColumnExists('promotions', column);
      if (exists) {
        filtered[column] = data[column];
      } else {
        logger.warn(`Column ${column} does not exist in promotions table, skipping`);
      }
    }
  }

  return filtered;
}

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'promotions-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/promotions-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/promotions.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// In-memory storage for promotions enabled setting (persists during server runtime)
// In production, this should be stored in database
let promotionsEnabledSetting: boolean | null = null;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/promotions');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `promotion-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadBanner = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Validation schemas
const createPromotionSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  code: Joi.string().min(3).max(50).optional().allow(null, ''),
  type: Joi.string().valid('PERCENTAGE', 'FIXED', 'BOGO', 'PRODUCT_BASED', 'CATEGORY_BASED', 'MIN_ORDER_BASED', 'FIRST_ORDER', 'COUPON_CODE', 'HAPPY_HOURS').optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED').required(),
  discountValue: Joi.number().min(0).when('discountType', {
    is: 'PERCENTAGE',
    then: Joi.number().max(100),
  }).required(),
  validFrom: Joi.date().iso().required(),
  validTo: Joi.date().iso().when('validFrom', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('validFrom')),
  }).optional().allow(null),
  applicableType: Joi.string().valid('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES').optional(),
  productIds: Joi.array().items(Joi.number().integer()).optional(),
  categoryIds: Joi.array().items(Joi.number().integer()).optional(),
  usageLimit: Joi.number().integer().min(1).optional().allow(null),
  minOrderValue: Joi.number().min(0).optional().allow(null),
  maxDiscount: Joi.number().min(0).optional().allow(null),
  userLimit: Joi.number().integer().min(1).optional().allow(null),
  firstOrderOnly: Joi.boolean().optional(),
  requiresCouponCode: Joi.boolean().optional(),
  autoApply: Joi.boolean().optional(),
  priority: Joi.number().integer().optional(),
  description: Joi.string().optional().allow(null, ''),
  bannerImageUrl: Joi.string().optional().allow(null, ''),
  happyHourStart: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  happyHourEnd: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  happyHourDays: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  bogoBuyQuantity: Joi.number().integer().min(1).optional().allow(null),
  bogoGetQuantity: Joi.number().integer().min(1).optional().allow(null),
  bogoProductId: Joi.number().integer().optional().allow(null),
  isActive: Joi.boolean().optional().default(true),
});

const updatePromotionSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  code: Joi.string().min(3).max(50).optional().allow(null, ''),
  type: Joi.string().valid('PERCENTAGE', 'FIXED', 'BOGO', 'PRODUCT_BASED', 'CATEGORY_BASED', 'MIN_ORDER_BASED', 'FIRST_ORDER', 'COUPON_CODE', 'HAPPY_HOURS').optional(),
  discountType: Joi.string().valid('PERCENTAGE', 'FIXED').optional(),
  discountValue: Joi.number().min(0).optional(),
  validFrom: Joi.date().iso().optional(),
  validTo: Joi.date().iso().optional().allow(null),
  applicableType: Joi.string().valid('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES').optional(),
  productIds: Joi.array().items(Joi.number().integer()).optional(),
  categoryIds: Joi.array().items(Joi.number().integer()).optional(),
  usageLimit: Joi.number().integer().min(1).optional().allow(null),
  minOrderValue: Joi.number().min(0).optional().allow(null),
  maxDiscount: Joi.number().min(0).optional().allow(null),
  userLimit: Joi.number().integer().min(1).optional().allow(null),
  firstOrderOnly: Joi.boolean().optional(),
  requiresCouponCode: Joi.boolean().optional(),
  autoApply: Joi.boolean().optional(),
  priority: Joi.number().integer().optional(),
  description: Joi.string().optional().allow(null, ''),
  bannerImageUrl: Joi.string().optional().allow(null, ''),
  happyHourStart: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  happyHourEnd: Joi.string().pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  happyHourDays: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  bogoBuyQuantity: Joi.number().integer().min(1).optional().allow(null),
  bogoGetQuantity: Joi.number().integer().min(1).optional().allow(null),
  bogoProductId: Joi.number().integer().optional().allow(null),
  isActive: Joi.boolean().optional(),
});

const querySchema = Joi.object({
  isActive: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'expired', 'all').optional(),
  type: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  offset: Joi.number().integer().min(0).optional().default(0),
});

// Helper function to validate promotion dates
const validatePromotionDates = (validFrom: Date, validTo: Date): void => {
  const now = new Date();
  if (validTo <= validFrom) {
    throw new Error('Valid to date must be after valid from date');
  }
  if (validTo <= now) {
    throw new Error('Valid to date must be in the future');
  }
};

// Helper function to check if promotion is applicable to items
const isPromotionApplicable = async (promotionId: number, productIds: number[]): Promise<boolean> => {
  const promotion = await (prisma as any).promotion.findUnique({
    where: { id: promotionId },
    include: { applicableItems: true },
  });

  if (!promotion || !promotion.isActive) {
    return false;
  }

  const now = new Date();
  if (now < promotion.validFrom || now > promotion.validTo) {
    return false;
  }

  if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
    return false;
  }

  // If no specific items are defined, promotion applies to all
  if (promotion.applicableItems.length === 0) {
    return true;
  }

  // Check if any of the order items match the applicable items
  return productIds.some(id => promotion.applicableItems.some((item: any) => item.id === id));
};

// Helper function to calculate discount
const calculateDiscount = (promotion: any, orderTotal: number): number => {
  if (promotion.discountType === 'PERCENTAGE') {
    return (orderTotal * promotion.discountValue) / 100;
  } else {
    return Math.min(promotion.discountValue, orderTotal);
  }
};

// Controller functions
export const getAllPromotions = async (req: Request, res: Response) => {
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

    const { isActive, status, type, limit, offset } = value;

    // Build where clause - use simple where clause that works with current schema
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const now = new Date();
    if (status === 'active') {
      where.isActive = true;
      where.validFrom = { lte: now };
      where.OR = [
        { validTo: null },
        { validTo: { gte: now } },
      ];
    } else if (status === 'expired') {
      where.OR = [
        { validTo: { lt: now } },
        { isActive: false },
      ];
    }

    // Check if name column exists to determine query method
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    
    // Get promotions - use raw SQL if columns don't exist, otherwise use Prisma
    let promotions: any[];
    let total: number;
    
    if (!nameColumnExists) {
      // Use raw SQL when columns don't exist
      try {
        // Build WHERE clause for raw SQL
        let whereClause = '1=1';
        const whereParams: any[] = [];
        
        if (isActive !== undefined) {
          whereClause += ' AND `isActive` = ?';
          whereParams.push(isActive ? 1 : 0);
        }
        
        if (status === 'active') {
          whereClause += ' AND `isActive` = 1 AND `validFrom` <= NOW() AND (`validTo` IS NULL OR `validTo` >= NOW())';
        } else if (status === 'expired') {
          whereClause += ' AND (`validTo` < NOW() OR `isActive` = 0)';
        }
        
        // Get promotions using raw SQL
        const promotionsQuery = `SELECT * FROM \`promotions\` WHERE ${whereClause} ORDER BY \`createdAt\` DESC LIMIT ? OFFSET ?`;
        const countQuery = `SELECT COUNT(*) as count FROM \`promotions\` WHERE ${whereClause}`;
        
        promotions = await prisma.$queryRawUnsafe(promotionsQuery, ...whereParams, limit, offset) as any[];
        const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(countQuery, ...whereParams) as any[];
        total = Number(countResult[0]?.count || 0);
        
        // Add empty products array to each promotion
        promotions = promotions.map((p: any) => ({ ...p, products: [] }));
      } catch (rawError: any) {
        logger.error('Raw SQL query failed', { error: rawError.message });
        throw rawError;
      }
    } else {
      // Use Prisma when all columns exist
      try {
        promotions = await prisma.promotion.findMany({
          where,
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        });
        total = await prisma.promotion.count({ where });
      } catch (error: any) {
        // If junction table doesn't exist, query without products relation
        if (error.message?.includes('_promotionapplicableitems') || error.message?.includes('does not exist')) {
          logger.warn('Junction table not found, querying without products relation', { error: error.message });
          promotions = await prisma.promotion.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
          });
          // Add empty products array to each promotion
          promotions = promotions.map((p: any) => ({ ...p, products: [] }));
          total = await prisma.promotion.count({ where });
        } else {
          throw error;
        }
      }
    }

    logger.info('Promotions retrieved successfully', {
      count: promotions.length,
      total,
      filters: { isActive, status, type },
    });

    res.json({
      success: true,
      data: {
        promotions,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve promotions', { 
      error: error.message, 
      stack: error.stack,
      query: req.query 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve promotions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getPromotionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID',
      });
    }

    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotion: any;
    
    if (!nameColumnExists) {
      // Use raw SQL when columns don't exist
      try {
        const promotions = await prisma.$queryRawUnsafe(
          `SELECT * FROM \`promotions\` WHERE id = ?`,
          Number(id)
        ) as any[];
        promotion = promotions && promotions.length > 0 ? { ...promotions[0], products: [] } : null;
      } catch (rawError: any) {
        logger.error('Raw SQL query failed for getPromotionById', { error: rawError.message });
        throw rawError;
      }
    } else {
      try {
        promotion = await prisma.promotion.findUnique({
          where: { id: Number(id) },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        });
      } catch (error: any) {
        // If junction table doesn't exist, query without products relation
        if (error.message?.includes('_promotionapplicableitems') || error.message?.includes('does not exist')) {
          promotion = await prisma.promotion.findUnique({
            where: { id: Number(id) },
          });
          if (promotion) {
            promotion = { ...promotion, products: [] };
          }
        } else {
          throw error;
        }
      }
    }

    if (!promotion) {
      logger.warn('Promotion not found', { id });
      return res.status(404).json({
        success: false,
        error: 'Promotion not found',
      });
    }

    logger.info('Promotion retrieved successfully', { id, code: promotion.code });

    res.json({
      success: true,
      data: { promotion },
    });
  } catch (error) {
    logger.error('Failed to retrieve promotion', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve promotion',
    });
  }
};

export const createPromotion = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createPromotionSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid promotion data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion data',
        details: error.details?.[0]?.message,
      });
    }

    const {
      name,
      code,
      type,
      discountType,
      discountValue,
      validFrom,
      validTo,
      applicableType,
      productIds,
      categoryIds,
      usageLimit,
      minOrderValue,
      maxDiscount,
      userLimit,
      firstOrderOnly,
      requiresCouponCode,
      autoApply,
      priority,
      description,
      bannerImageUrl,
      happyHourStart,
      happyHourEnd,
      happyHourDays,
      bogoBuyQuantity,
      bogoGetQuantity,
      bogoProductId,
      isActive,
    } = value;

    // Validate dates if validTo is provided
    if (validTo && validFrom) {
      const fromDate = new Date(validFrom);
      const toDate = new Date(validTo);
      if (toDate <= fromDate) {
        return res.status(400).json({
          success: false,
          error: 'Valid to date must be after valid from date',
        });
      }
    }

    // Check if code already exists (if provided)
    if (code && code.trim()) {
      try {
        // Use raw SQL to check code existence to avoid Prisma validation issues
        const codeExists = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM \`promotions\` WHERE \`code\` = ?`,
          code.toUpperCase().trim()
        );
        
        if (codeExists && codeExists.length > 0 && codeExists[0] && Number(codeExists[0].count) > 0) {
          return res.status(409).json({
            success: false,
            error: 'Promotion code already exists',
          });
        }
      } catch (error: any) {
        // If code column doesn't exist in DB yet, skip this check
        if (error.message?.includes('does not exist') || error.message?.includes('Unknown column')) {
          logger.warn('Code column does not exist, skipping duplicate check', { error: error.message });
        } else {
          logger.warn('Error checking code existence', { error: error.message });
          // Don't throw - allow creation to proceed
        }
      }
    }

    // Validate products exist if specified
    if (productIds && productIds.length > 0) {
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const existingProductIds = existingProducts.map((p) => p.id);
      const invalidProducts = productIds.filter((id: number) => !existingProductIds.includes(id));

      if (invalidProducts.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid product IDs: ${invalidProducts.join(', ')}`,
        });
      }
    }

    // Validate categories exist if specified
    if (categoryIds && categoryIds.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true },
      });

      const existingCategoryIds = existingCategories.map((c) => c.id);
      const invalidCategories = categoryIds.filter((id: number) => !existingCategoryIds.includes(id));

      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid category IDs: ${invalidCategories.join(', ')}`,
        });
      }
    }

    // Prepare promotion data
    const promotionData: any = {
      name,
      code: code ? code.toUpperCase() : null,
      type: type || 'PERCENTAGE',
      discountType,
      discountValue,
      validFrom: new Date(validFrom),
      validTo: validTo ? new Date(validTo) : null,
      applicableType: applicableType || 'ALL_PRODUCTS',
      productIds: productIds ? JSON.stringify(productIds) : null,
      categoryIds: categoryIds ? JSON.stringify(categoryIds) : null,
      usageLimit: usageLimit || null,
      minOrderValue: minOrderValue || null,
      maxDiscount: maxDiscount || null,
      userLimit: userLimit || null,
      firstOrderOnly: firstOrderOnly || false,
      requiresCouponCode: requiresCouponCode || false,
      autoApply: autoApply || false,
      priority: priority || 0,
      description: description || null,
      bannerImageUrl: bannerImageUrl || null,
      happyHourStart: happyHourStart || null,
      happyHourEnd: happyHourEnd || null,
      happyHourDays: happyHourDays ? JSON.stringify(happyHourDays) : null,
      bogoBuyQuantity: bogoBuyQuantity || null,
      bogoGetQuantity: bogoGetQuantity || null,
      bogoProductId: bogoProductId || null,
      isActive: isActive !== undefined ? isActive : true,
    };

    // Connect products if specified (only if junction table exists)
    // Note: This will work after migration creates the junction table
    if (productIds && productIds.length > 0) {
      try {
        promotionData.products = {
          connect: productIds.map((id: number) => ({ id })),
        };
      } catch (error) {
        // If junction table doesn't exist, products will be stored in productIds JSON field
        logger.warn('Products relation not available, using productIds JSON field', { error });
      }
    }

    // Filter promotion data to only include columns that exist in the database
    const filteredPromotionData = await filterPromotionData(promotionData);
    
    // Check if name column exists before trying to use it
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    
    // If name column exists but name is missing, use code as name (backward compatibility)
    if (nameColumnExists && !filteredPromotionData.name && filteredPromotionData.code) {
      filteredPromotionData.name = filteredPromotionData.code;
    }
    
    // Ensure name is removed if column doesn't exist (double-check)
    if (!nameColumnExists && filteredPromotionData.name !== undefined) {
      delete filteredPromotionData.name;
      logger.warn('Removed name field as column does not exist in database');
    }

    // Create promotion
    let promotion;
    try {
      // Remove products relation if it exists (will be handled separately if junction table exists)
      const { products, ...dataWithoutProducts } = filteredPromotionData;
      
      // Final safety check: remove name if it somehow still exists but column doesn't
      if (!nameColumnExists && (dataWithoutProducts as any).name !== undefined) {
        delete (dataWithoutProducts as any).name;
      }
      
      // Try Prisma create first, fallback to raw SQL if validation fails
      try {
        promotion = await prisma.promotion.create({
          data: dataWithoutProducts,
        });
      } catch (prismaError: any) {
        // If Prisma validation fails because required field is missing (like 'name'),
        // use raw SQL to insert only columns that exist
        if (prismaError.message?.includes('Argument') && prismaError.message?.includes('is missing')) {
          logger.warn('Prisma validation failed, using raw SQL fallback', { error: prismaError.message });
          
          // Build raw SQL insert with only existing columns
          const columns: string[] = [];
          const values: any[] = [];
          
          for (const [key, value] of Object.entries(dataWithoutProducts)) {
            if (value !== undefined && value !== null) {
              const columnExists = await checkColumnExists('promotions', key);
              if (columnExists) {
                columns.push(`\`${key}\``);
                values.push(value instanceof Date ? value.toISOString().slice(0, 19).replace('T', ' ') : value);
              }
            }
          }
          
          // Add timestamps
          columns.push('`createdAt`', '`updatedAt`');
          
          const placeholders = columns.map((_, i) => i < columns.length - 2 ? '?' : 'NOW()').join(', ');
          const sql = `INSERT INTO \`promotions\` (${columns.join(', ')}) VALUES (${placeholders})`;
          
          // Execute with only the non-timestamp values
          const sqlValues = values;
          await prisma.$executeRawUnsafe(sql, ...sqlValues);
          
          // Get the inserted promotion
          const insertedResult = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
            `SELECT id FROM \`promotions\` ORDER BY id DESC LIMIT 1`
          );
          
          if (insertedResult && insertedResult.length > 0 && insertedResult[0]) {
            const promotionId = insertedResult[0].id;
            const promotionRows = await prisma.$queryRawUnsafe<any[]>(
              `SELECT * FROM \`promotions\` WHERE id = ?`,
              promotionId
            );
            
            if (promotionRows && promotionRows.length > 0) {
              promotion = { ...promotionRows[0], products: [] };
            } else {
              throw new Error('Failed to retrieve created promotion');
            }
          } else {
            throw new Error('Failed to retrieve created promotion ID');
          }
        } else {
          throw prismaError;
        }
      }

      // Try to connect products if junction table exists
      if (products && productIds && productIds.length > 0) {
        try {
          await prisma.promotion.update({
            where: { id: promotion.id },
            data: {
              products: {
                connect: productIds.map((id: number) => ({ id })),
              },
            },
          });
          // Reload promotion with products
          promotion = await prisma.promotion.findUnique({
            where: { id: promotion.id },
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          }) || promotion;
        } catch (relationError: any) {
          // Junction table doesn't exist, that's okay - products are stored in productIds JSON field
          logger.warn('Products relation not available, using productIds JSON field', { error: relationError.message });
        }
      }
    } catch (error: any) {
      // Check if column doesn't exist error
      if (error.message?.includes('does not exist') || error.message?.includes('Unknown column')) {
        logger.error('Database column missing', {
          error: error.message,
          suggestion: 'Run database migration',
        });
        return res.status(500).json({
          success: false,
          error: 'Database schema is missing required columns. Migration required.',
          details: error.message,
          fix: 'Stop the backend server and run: cd backend && npx prisma generate && npx prisma migrate dev --name add_promotions_module',
          migrationGuide: 'See backend/PROMOTIONS_MIGRATION_GUIDE.md for detailed instructions',
        });
      }

      // Check if Prisma client is out of sync (missing fields)
      if (error.message?.includes('Unknown argument') || error.message?.includes('Did you mean')) {
        logger.error('Prisma client is out of sync with schema', {
          error: error.message,
          suggestion: 'Run: npx prisma generate',
        });
        return res.status(500).json({
          success: false,
          error: 'Prisma client is out of sync. Please regenerate Prisma client.',
          details: error.message,
          fix: 'Stop the backend server and run: cd backend && npx prisma generate',
        });
      }
      
      // If junction table doesn't exist, that's already handled above
      logger.error('Failed to create promotion', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        error: 'Failed to create promotion',
        details: error.message,
      });
    }

    logger.info('Promotion created successfully', {
      id: promotion.id,
      name: (promotion as any).name || (promotion as any).code || 'Unknown',
      code: (promotion as any).code || null,
      createdBy: (req.user as JWTPayload)?.userId,
    });

    // Broadcast PROMOTION_CREATED event to admin users
    wsManager.broadcastToRoom('admin', 'PROMOTION_CREATED', {
      promotion,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Promotion created successfully',
      data: { promotion },
    });
  } catch (error: any) {
    logger.error('Failed to create promotion', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create promotion',
    });
  }
};

export const updatePromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID',
      });
    }

    // Validate request body
    const { error, value } = updatePromotionSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid update data', { error: error.details?.[0]?.message, body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: error.details?.[0]?.message,
      });
    }

    // Check if promotion exists
    const existingPromotion = await (prisma as any).promotion.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPromotion) {
      logger.warn('Promotion not found for update', { id });
      return res.status(404).json({
        success: false,
        error: 'Promotion not found',
      });
    }

    // Validate dates if being updated
    if (value.validFrom || value.validTo) {
      const validFrom = value.validFrom ? new Date(value.validFrom) : existingPromotion.validFrom;
      const validTo = value.validTo ? new Date(value.validTo) : existingPromotion.validTo;
      
      // Check if validTo date is actually being changed
      const existingValidTo = new Date(existingPromotion.validTo);
      const newValidTo = value.validTo ? new Date(value.validTo) : null;
      const isChangingValidTo = newValidTo && newValidTo.getTime() !== existingValidTo.getTime();
      
      // For updates, only validate date order (validTo > validFrom)
      if (validTo <= validFrom) {
        throw new Error('Valid to date must be after valid from date');
      }
      // Only check "must be in future" if user is actually changing the validTo date to a new value
      if (isChangingValidTo) {
        const now = new Date();
        if (validTo <= now) {
          throw new Error('Valid to date must be in the future');
        }
      }
    }

    // Check for code conflict if code is being updated
    if (value.code && value.code.toUpperCase() !== existingPromotion.code) {
      const codeConflict = await (prisma as any).promotion.findUnique({
        where: { code: value.code.toUpperCase() },
      });

      if (codeConflict) {
        return res.status(409).json({
          success: false,
          error: 'Another promotion with this code already exists',
        });
      }
    }

    // Validate applicable items if being updated
    if (value.applicableItems) {
      const existingItems = await (prisma as any).product.findMany({
        where: { id: { in: value.applicableItems } },
        select: { id: true },
      });

      const existingItemIds = existingItems.map((item: any) => item.id);
      const invalidItems = value.applicableItems.filter((id: number) => !existingItemIds.includes(id));

      if (invalidItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid product IDs: ${invalidItems.join(', ')}`,
        });
      }
    }

    // Prepare update data
    const updateData: any = { ...value };
    if (value.code) updateData.code = value.code.toUpperCase();
    if (value.validFrom) updateData.validFrom = new Date(value.validFrom);
    if (value.validTo) updateData.validTo = new Date(value.validTo);
    
    // Convert arrays to JSON strings (or null if empty) before filtering
    if (value.productIds !== undefined) {
      updateData.productIds = Array.isArray(value.productIds) && value.productIds.length > 0 
        ? JSON.stringify(value.productIds) 
        : null;
    }
    if (value.categoryIds !== undefined) {
      updateData.categoryIds = Array.isArray(value.categoryIds) && value.categoryIds.length > 0 
        ? JSON.stringify(value.categoryIds) 
        : null;
    }
    if (value.happyHourDays !== undefined) {
      updateData.happyHourDays = Array.isArray(value.happyHourDays) && value.happyHourDays.length > 0 
        ? JSON.stringify(value.happyHourDays) 
        : null;
    }
    
    // Filter update data to only include columns that exist
    const filteredUpdateData = await filterPromotionData(updateData);
    
    // Remove products relation if it exists (will be handled separately)
    const { products, applicableItems, ...dataWithoutRelations } = filteredUpdateData;
    
    if (applicableItems) {
      dataWithoutRelations.applicableItems = {
        set: [], // Clear existing connections
        connect: applicableItems.map((id: number) => ({ id })),
      };
    }

    // Update promotion
    let updatedPromotion;
    try {
      updatedPromotion = await prisma.promotion.update({
        where: { id: Number(id) },
        data: dataWithoutRelations,
      });

      // Try to update products relation if junction table exists
      if (products && value.productIds && value.productIds.length > 0) {
        try {
          await prisma.promotion.update({
            where: { id: Number(id) },
            data: {
              products: {
                set: [],
                connect: value.productIds.map((id: number) => ({ id })),
              },
            },
          });
          // Reload with products
          updatedPromotion = await prisma.promotion.findUnique({
            where: { id: Number(id) },
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          }) || updatedPromotion;
        } catch (relationError: any) {
          // Junction table doesn't exist, that's okay
          logger.warn('Products relation not available', { error: relationError.message });
        }
      }
    } catch (error: any) {
      // Check if column doesn't exist error
      if (error.message?.includes('does not exist') || error.message?.includes('Unknown column')) {
        logger.error('Database column missing', {
          error: error.message,
          suggestion: 'Run database migration',
        });
        return res.status(500).json({
          success: false,
          error: 'Database schema is missing required columns. Migration required.',
          details: error.message,
          fix: 'Stop the backend server and run: cd backend && npx prisma generate && npx prisma migrate dev --name add_promotions_module',
          migrationGuide: 'See backend/PROMOTIONS_MIGRATION_GUIDE.md for detailed instructions',
        });
      }
      throw error;
    }

    logger.info('Promotion updated successfully', {
      id,
      code: (updatedPromotion as any).code || null,
      name: (updatedPromotion as any).name || (updatedPromotion as any).code || 'Unknown',
      updatedBy: (req.user as JWTPayload)?.userId,
      changes: value,
    });

    // Broadcast PROMOTION_UPDATED event to admin users
    wsManager.broadcastToRoom('admin', 'PROMOTION_UPDATED', {
      promotion: updatedPromotion,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Promotion updated successfully',
      data: { promotion: updatedPromotion },
    });
  } catch (error: any) {
    logger.error('Failed to update promotion', { error: error.message, id: req.params.id, body: req.body });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update promotion',
    });
  }
};

export const deletePromotion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID',
      });
    }

    // Check if promotion exists
    const existingPromotion = await (prisma as any).promotion.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPromotion) {
      logger.warn('Promotion not found for deletion', { id });
      return res.status(404).json({
        success: false,
        error: 'Promotion not found',
      });
    }

    // Delete promotion
    await (prisma as any).promotion.delete({
      where: { id: Number(id) },
    });

    logger.info('Promotion deleted successfully', {
      id,
      code: existingPromotion.code,
      deletedBy: (req.user as JWTPayload)?.userId,
    });

    // Broadcast PROMOTION_DELETED event to admin users
    wsManager.broadcastToRoom('admin', 'PROMOTION_DELETED', {
      promotionId: Number(id),
      code: existingPromotion.code,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete promotion', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete promotion',
    });
  }
};

// Function to apply promotion to order (called from orders controller)
export const applyPromotionToOrder = async (promotionCode: string, productIds: number[], orderTotal: number): Promise<{ discount: number; promotion: any } | null> => {
  try {
    const promotion = await (prisma as any).promotion.findUnique({
      where: { code: promotionCode.toUpperCase() },
    });

    if (!promotion || !promotion.isActive) {
      return null;
    }

    // Check if promotion is applicable
    const applicable = await isPromotionApplicable(promotion.id, productIds);
    if (!applicable) {
      return null;
    }

    // Calculate discount
    const discount = calculateDiscount(promotion, orderTotal);

    // Increment usage count
    await (prisma as any).promotion.update({
      where: { id: promotion.id },
      data: { usedCount: { increment: 1 } },
    });

    logger.info('Promotion applied to order', {
      code: promotionCode,
      discount,
      orderTotal,
    });

    return { discount, promotion };
  } catch (error) {
    logger.error('Failed to apply promotion', { error, code: promotionCode });
    return null;
  }
};

/**
 * Get active promotions (customer-facing)
 */
export const getActivePromotions = async (req: Request, res: Response) => {
  try {
    // Check if promotions are enabled globally
    // First check in-memory setting, then fall back to environment variable, then default to true
    let promotionsEnabled: boolean;
    if (promotionsEnabledSetting !== null) {
      promotionsEnabled = promotionsEnabledSetting;
    } else {
      promotionsEnabled = process.env.PROMOTIONS_ENABLED !== 'false';
    }
    
    if (!promotionsEnabled) {
      logger.info('Promotions are disabled globally, returning empty array');
      return res.json({
        success: true,
        data: { promotions: [] },
      });
    }
    
    const now = new Date();
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotions: any[];
    
    if (!nameColumnExists) {
      // Use raw SQL when columns don't exist
      // More lenient query - show promotions that are active and within date range
      // First, let's check all promotions for debugging
      const allPromotionsQuery = `SELECT id, code, name, isActive, validFrom, validTo, discountType, discountValue FROM \`promotions\` ORDER BY \`createdAt\` DESC LIMIT 10`;
      const allPromotions = await prisma.$queryRawUnsafe(allPromotionsQuery) as any[];
      logger.info('All promotions in database (for debugging)', { 
        count: allPromotions.length,
        promotions: allPromotions,
      });
      
      // Simplified query - just check isActive, dates will be checked in application logic
      // This ensures we get all active promotions, then filter by date in code
      const query = `SELECT * FROM \`promotions\` 
        WHERE \`isActive\` = 1 
        ORDER BY \`createdAt\` DESC`;
      const allActivePromotions = await prisma.$queryRawUnsafe(query) as any[];
      
      // Filter by date in application code for more reliable date comparison
      promotions = allActivePromotions.filter((p: any) => {
        const validFrom = p.validFrom ? new Date(p.validFrom) : null;
        const validTo = p.validTo ? new Date(p.validTo) : null;
        
        // Check if promotion is within valid date range
        const isAfterStart = !validFrom || validFrom <= now;
        const isBeforeEnd = !validTo || validTo >= now;
        
        const isValid = isAfterStart && isBeforeEnd;
        
        // Log all promotions for debugging
        logger.info('Promotion date check', {
          id: p.id,
          code: p.code,
          validFrom: p.validFrom,
          validTo: p.validTo,
          validFromDate: validFrom?.toISOString(),
          validToDate: validTo?.toISOString(),
          now: now.toISOString(),
          isAfterStart,
          isBeforeEnd,
          isValid,
        });
        
        return isValid;
      });
      
      // Ensure name field exists (use code or description as fallback)
      promotions = promotions.map((p: any) => ({
        ...p,
        name: p.name || p.description || p.code || 'Special Offer',
        products: [],
      }));
      
      logger.info('Active promotions fetched (raw SQL)', { 
        count: promotions.length,
        now: now.toISOString(),
        query: query,
        activePromotions: promotions.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          isActive: p.isActive,
          validFrom: p.validFrom,
          validTo: p.validTo,
          discountType: p.discountType,
          discountValue: p.discountValue,
        })),
      });
    } else {
      try {
        promotions = await prisma.promotion.findMany({
          where: {
            isActive: true,
            AND: [
              {
                OR: [
                  { validFrom: { lte: now } },
                ],
              },
              {
                OR: [
                  { validTo: null },
                  { validTo: { gte: now } },
                ],
              },
            ],
          },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        
        logger.info('Active promotions fetched (Prisma)', { 
          count: promotions.length,
          now: now.toISOString(),
        });
      } catch (error: any) {
        // If junction table doesn't exist, query without products relation
        if (error.message?.includes('_promotionapplicableitems') || error.message?.includes('does not exist')) {
          promotions = await prisma.promotion.findMany({
            where: {
              isActive: true,
              AND: [
                {
                  OR: [
                    { validFrom: { lte: now } },
                  ],
                },
                {
                  OR: [
                    { validTo: null },
                    { validTo: { gte: now } },
                  ],
                },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
          promotions = promotions.map((p: any) => ({ ...p, products: [] }));
          
          logger.info('Active promotions fetched (Prisma, no products)', { 
            count: promotions.length,
            now: now.toISOString(),
          });
        } else {
          throw error;
        }
      }
    }

    // Log for debugging
    logger.info('Returning active promotions', {
      count: promotions.length,
      promotionIds: promotions.map((p: any) => p.id),
      promotionsEnabled,
      now: now.toISOString(),
      samplePromotion: promotions.length > 0 ? {
        id: promotions[0].id,
        code: promotions[0].code,
        name: promotions[0].name,
        isActive: promotions[0].isActive,
        validFrom: promotions[0].validFrom,
        validTo: promotions[0].validTo,
        discountType: promotions[0].discountType,
        discountValue: promotions[0].discountValue,
      } : null,
      allPromotions: promotions.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name || p.code,
        isActive: p.isActive,
        validFrom: p.validFrom,
        validTo: p.validTo,
      })),
    });

    res.json({
      success: true,
      data: { promotions },
    });
  } catch (error: any) {
    logger.error('Failed to get active promotions', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to get active promotions',
      details: error.message,
    });
  }
};

/**
 * Get expired promotions (admin)
 */
export const getExpiredPromotions = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotions: any[];
    
    if (!nameColumnExists) {
      // Use raw SQL when columns don't exist
      const query = `SELECT * FROM \`promotions\` 
        WHERE (\`validTo\` < ? OR \`isActive\` = 0)
        ORDER BY \`createdAt\` DESC`;
      promotions = await prisma.$queryRawUnsafe(query, now) as any[];
      promotions = promotions.map((p: any) => ({ ...p, products: [], _count: { usages: 0 } }));
    } else {
      try {
        promotions = await prisma.promotion.findMany({
          where: {
            OR: [
              { validTo: { lt: now } },
              { isActive: false },
            ],
          },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (error: any) {
        // If junction table doesn't exist, query without products relation
        if (error.message?.includes('_promotionapplicableitems') || error.message?.includes('does not exist')) {
          promotions = await prisma.promotion.findMany({
            where: {
              OR: [
                { validTo: { lt: now } },
                { isActive: false },
              ],
            },
            orderBy: { createdAt: 'desc' },
          });
          promotions = promotions.map((p: any) => ({ ...p, products: [], _count: { usages: 0 } }));
        } else {
          throw error;
        }
      }
    }

    res.json({
      success: true,
      data: { promotions },
    });
  } catch (error) {
    logger.error('Failed to get expired promotions', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get expired promotions',
    });
  }
};

/**
 * Toggle promotion active status
 */
export const toggleActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID',
      });
    }

    // Check if promotion exists using raw SQL if needed
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotion: any;
    
    if (!nameColumnExists) {
      const promotions = await prisma.$queryRawUnsafe(
        `SELECT * FROM \`promotions\` WHERE id = ?`,
        Number(id)
      ) as any[];
      promotion = promotions && promotions.length > 0 ? promotions[0] : null;
    } else {
      promotion = await prisma.promotion.findUnique({
        where: { id: Number(id) },
      });
    }

    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found',
      });
    }

    // Toggle isActive status
    const newActiveStatus = !promotion.isActive;
    let updatedPromotion: any;
    
    if (!nameColumnExists) {
      // Use raw SQL to update
      await prisma.$executeRawUnsafe(
        `UPDATE \`promotions\` SET \`isActive\` = ?, \`updatedAt\` = NOW() WHERE id = ?`,
        newActiveStatus ? 1 : 0,
        Number(id)
      );
      // Fetch updated promotion
      const updated = await prisma.$queryRawUnsafe(
        `SELECT * FROM \`promotions\` WHERE id = ?`,
        Number(id)
      ) as any[];
      updatedPromotion = updated && updated.length > 0 ? updated[0] : promotion;
    } else {
      updatedPromotion = await prisma.promotion.update({
        where: { id: Number(id) },
        data: { isActive: newActiveStatus },
      });
    }

    logger.info('Promotion status toggled', {
      id,
      isActive: updatedPromotion.isActive,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    wsManager.broadcastToRoom('admin', 'PROMOTION_UPDATED', {
      promotion: updatedPromotion,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Promotion ${updatedPromotion.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { promotion: updatedPromotion },
    });
  } catch (error: any) {
    logger.error('Failed to toggle promotion status', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle promotion status',
    });
  }
};

/**
 * Upload promotion banner
 */
export const uploadBannerHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Check if promotion exists using raw SQL if needed
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotion: any;
    
    if (!nameColumnExists) {
      const promotions = await prisma.$queryRawUnsafe(
        `SELECT * FROM \`promotions\` WHERE id = ?`,
        Number(id)
      ) as any[];
      promotion = promotions && promotions.length > 0 ? promotions[0] : null;
    } else {
      promotion = await prisma.promotion.findUnique({
        where: { id: Number(id) },
      });
    }

    if (!promotion) {
      // Delete uploaded file if promotion doesn't exist
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Promotion not found',
      });
    }

    // Delete old banner if exists
    if (promotion.bannerImageUrl) {
      const oldPath = path.join(__dirname, '../../public', promotion.bannerImageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update promotion with new banner URL
    const bannerUrl = `/promotions/${req.file.filename}`;
    const bannerColumnExists = await checkColumnExists('promotions', 'bannerImageUrl');
    
    let updatedPromotion: any;
    if (!bannerColumnExists) {
      // If bannerImageUrl column doesn't exist, just return success (can't update)
      logger.warn('bannerImageUrl column does not exist, skipping update');
      updatedPromotion = promotion;
    } else {
      updatedPromotion = await prisma.promotion.update({
        where: { id: Number(id) },
        data: { bannerImageUrl: bannerUrl },
      });
    }

    logger.info('Promotion banner uploaded', {
      id,
      bannerUrl,
      updatedBy: (req.user as JWTPayload)?.userId,
    });

    res.json({
      success: true,
      message: 'Banner uploaded successfully',
      data: {
        promotion: updatedPromotion,
        bannerUrl,
      },
    });
  } catch (error: any) {
    logger.error('Failed to upload banner', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload banner',
    });
  }
};

/**
 * Validate cart promotions
 */
export const validateCartPromotions = async (req: Request, res: Response) => {
  try {
    const { cartId } = req.body;
    const userId = (req.user as JWTPayload)?.userId;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: 'Cart ID is required',
      });
    }

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                menuCategory: true,
              },
            },
            menu: {
              include: {
                categoryRef: true,
                menuProducts: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
    }

    // Get applicable promotions
    const applicablePromotions = await promotionService.getApplicablePromotions(cart, userId);
    const calculation = await promotionService.calculateBestDiscount(cart, userId);

    res.json({
      success: true,
      data: {
        applicablePromotions,
        bestDiscount: calculation,
      },
    });
  } catch (error: any) {
    logger.error('Failed to validate cart promotions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate cart promotions',
    });
  }
};

/**
 * Validate discount code for checkout
 */
export const validateDiscount = async (req: Request, res: Response) => {
  try {
    const { code, orderTotal, items } = req.body;
    const userId = (req.user as JWTPayload)?.userId || null;

    if (!code || !orderTotal) {
      return res.status(400).json({
        success: false,
        error: 'Code and orderTotal are required',
      });
    }

    // Check if promotions are enabled globally
    const promotionsEnabled = process.env.PROMOTIONS_ENABLED !== 'false';
    if (!promotionsEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Promotions are currently disabled',
      });
    }

    // Find promotion by code - handle missing columns
    const nameColumnExists = await checkColumnExists('promotions', 'name');
    let promotion: any;
    
    if (!nameColumnExists) {
      const promotions = await prisma.$queryRawUnsafe(
        `SELECT * FROM \`promotions\` WHERE \`code\` = ? AND \`isActive\` = 1`,
        code.toUpperCase()
      ) as any[];
      promotion = promotions && promotions.length > 0 ? promotions[0] : null;
    } else {
      promotion = await prisma.promotion.findUnique({
        where: { code: code.toUpperCase() },
      });
    }

    if (!promotion) {
      return res.status(400).json({
        success: false,
        error: 'Invalid discount code',
      });
    }

    // Check if promotion is active
    if (!promotion.isActive) {
      return res.status(400).json({
        success: false,
        error: 'This discount code is no longer active',
      });
    }

    // Check validity period
    const now = new Date();
    if (promotion.validFrom && new Date(promotion.validFrom) > now) {
      return res.status(400).json({
        success: false,
        error: 'This discount code is not yet valid',
      });
    }

    if (promotion.validTo && new Date(promotion.validTo) < now) {
      return res.status(400).json({
        success: false,
        error: 'This discount code has expired',
      });
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'This discount code has reached its usage limit',
      });
    }

    // Check minimum order value
    if (promotion.minOrderValue && orderTotal < promotion.minOrderValue) {
      return res.status(400).json({
        success: false,
        error: `Minimum order value of ₹${promotion.minOrderValue.toFixed(2)} required`,
      });
    }

    // Check per-user limit (only if user is authenticated)
    if (userId && promotion.userLimit) {
      try {
        const userUsageCount = await prisma.order.count({
          where: {
            customerId: userId,
            discountCode: code.toUpperCase(),
            status: { not: 'CANCELLED' },
          },
        });

        if (userUsageCount >= promotion.userLimit) {
          return res.status(400).json({
            success: false,
            error: 'You have already used this discount code the maximum number of times',
          });
        }
      } catch (error: any) {
        // If discountCode column doesn't exist, skip this check
        logger.warn('Could not check user usage limit', { error: error.message });
      }
    }

    // Check first order only restriction (only if user is authenticated)
    if (userId && promotion.firstOrderOnly) {
      try {
        const userOrderCount = await prisma.order.count({
          where: {
            customerId: userId,
            status: { not: 'CANCELLED' },
          },
        });

        if (userOrderCount > 0) {
          return res.status(400).json({
            success: false,
            error: 'This discount is only valid for first-time orders',
          });
        }
      } catch (error: any) {
        logger.warn('Could not check first order restriction', { error: error.message });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promotion.discountType === 'PERCENTAGE') {
      discountAmount = (orderTotal * promotion.discountValue) / 100;
    } else if (promotion.discountType === 'FIXED') {
      discountAmount = promotion.discountValue;
    }

    // Apply maximum discount limit if set
    if (promotion.maxDiscount && discountAmount > promotion.maxDiscount) {
      discountAmount = promotion.maxDiscount;
    }

    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    discountAmount = Math.round(discountAmount * 100) / 100; // Round to 2 decimal places

    logger.info('Discount code validated successfully', {
      code,
      userId: userId || 'guest',
      orderTotal,
      discountAmount,
    });

    res.json({
      success: true,
      data: {
        valid: true,
        discountAmount,
        promotion: {
          id: promotion.id,
          code: promotion.code,
          name: promotion.name || promotion.code,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          description: promotion.description,
        },
      },
    });
  } catch (error: any) {
    const code = req.body?.code || 'unknown';
    const orderTotal = req.body?.orderTotal || 0;
    logger.error('Failed to validate discount', { error: error.message, code, orderTotal });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate discount',
      details: error.message,
    });
  }
};

/**
 * Get promotion settings (whether promotions are enabled globally)
 */
export const getPromotionSettings = async (req: Request, res: Response) => {
  try {
    // Check if promotions are enabled
    // First check in-memory setting, then fall back to environment variable, then default to true
    let promotionsEnabled: boolean;
    if (promotionsEnabledSetting !== null) {
      promotionsEnabled = promotionsEnabledSetting;
    } else {
      promotionsEnabled = process.env.PROMOTIONS_ENABLED !== 'false';
    }
    
    res.json({
      success: true,
      data: {
        enabled: promotionsEnabled,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get promotion settings', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get promotion settings',
    });
  }
};

/**
 * Toggle promotions globally (admin only)
 */
export const togglePromotionsGlobally = async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean',
      });
    }
    
    // Store in memory (persists during server runtime)
    // In production, this should be saved to database settings table
    promotionsEnabledSetting = enabled;
    
    logger.info('Promotions globally toggled', {
      enabled,
      updatedBy: (req.user as JWTPayload)?.userId,
    });
    
    res.json({
      success: true,
      message: `Promotions ${enabled ? 'enabled' : 'disabled'} globally`,
      data: {
        enabled,
      },
    });
  } catch (error: any) {
    logger.error('Failed to toggle promotions globally', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to toggle promotions globally',
    });
  }
};