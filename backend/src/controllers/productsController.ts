import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/productService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import * as winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'products-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/products-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/products.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

/**
 * Get all products with menu associations
 */
export const getProducts = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { category, type, isAvailable, search, menuId, page, limit, sortBy, sortOrder } = req.query;

  const filters: any = {};

  if (category) filters.category = category as string;
  if (type) filters.type = type as string;
  if (isAvailable !== undefined && isAvailable !== '') filters.isAvailable = String(isAvailable) === 'true';
  if (menuId) filters.menuId = parseInt(menuId as string);
  if (search) filters.search = search as string;

  logger.info('Fetching products', { filters, userId: (req as any).user?.id });

  const products = await productService.getAllProducts(filters);

  res.json({
    success: true,
    data: products,
    count: products.length,
  });
});


export const getProductById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const productId = parseInt(id!);

  logger.info('Fetching product by ID', { productId, userId: (req as any).user?.id });

  const product = await productService.getProductById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json({
    success: true,
    data: product,
  });
});

/**
 * Get single product by slug with menu details
 */
export const getProductBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { slug } = req.params;

  if (!slug) {
    throw new AppError('Slug parameter is required', 400);
  }

  logger.info('Fetching product by slug', { slug, userId: (req as any).user?.id });

  const product = await productService.getProductBySlug(slug);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.json({
    success: true,
    data: product,
  });
});

/**
 * Create new product linked to menu (Admin only)
 */
export const createProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const productData = req.body; // Already validated by middleware

  logger.info('Creating product', {
    productData: { ...productData, price: '***' },
    userId: (req as any).user?.id
  });

  // Create product using service
  const product = await productService.createProduct(productData);

  logger.info('Product created successfully', {
    productId: product.id,
    userId: (req as any).user?.id
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

/**
 * Update product (Admin only)
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const productId = parseInt(id!);
  const updateData = req.body; // Already validated by middleware

  logger.info('Updating product', {
    productId,
    updateData: { ...updateData, price: updateData.price ? '***' : undefined },
    userId: (req as any).user?.id
  });

  const product = await productService.updateProduct(productId, updateData);

  logger.info('Product updated successfully', {
    productId,
    userId: (req as any).user?.id
  });

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

/**
 * Delete product (Admin only)
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const productId = parseInt(id!);

  logger.info('Deleting product', { productId, userId: (req as any).user?.id });

  await productService.deleteProduct(productId);

  logger.info('Product deleted successfully', { productId, userId: (req as any).user?.id });

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});
