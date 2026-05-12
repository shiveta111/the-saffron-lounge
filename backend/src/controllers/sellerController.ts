import { Request, Response, NextFunction } from 'express';
import { dbManager } from '../utils/database';

/**
 * Create a new product (Seller and Admin only)
 */
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, price, category, stock = 0 } = req.body;

    // Validate required fields
    if (!name || !price || !category) {
      res.status(400).json({
        success: false,
        error: 'Name, price, and category are required',
      });
      return;
    }

    // Validate price and stock
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      res.status(400).json({
        success: false,
        error: 'Price must be a positive number',
      });
      return;
    }

    if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      res.status(400).json({
        success: false,
        error: 'Stock must be a non-negative integer',
      });
      return;
    }

    // Create product first
    const productResult = await dbManager.run(`
      INSERT INTO products (name, description, price, category, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [name, description, parseFloat(price), category]);

    const product = {
      id: (productResult as any).insertId,
      name,
      description,
      price: parseFloat(price),
      category,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create inventory record if stock is provided
    if (stock > 0) {
      await dbManager.run(`
        INSERT INTO inventory (productId, quantity, minThreshold, supplier, lastRestocked, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())
      `, [product.id, parseInt(stock), 10, 'Default Supplier']);
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
};

/**
 * Get products created by the seller
 */
export const getSellerProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sellerId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // For now, return all products since we don't have a seller field
    // In a real application, you'd filter by sellerId
    const products = await dbManager.query(`
      SELECT * FROM products
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `, [limit, skip]);

    const totalResult = await dbManager.get(`SELECT COUNT(*) as count FROM products`);
    const total = totalResult.count;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve products',
    });
  }
};

/**
 * Update product (Seller/Admin only)
 */
export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, stock } = req.body;

    if (!id || isNaN(parseInt(id))) {
      res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price) {
      if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Price must be a positive number',
        });
        return;
      }
      updateData.price = parseFloat(price);
    }
    if (categoryId) updateData.categoryId = parseInt(categoryId);
    if (stock !== undefined) {
      if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
        res.status(400).json({
          success: false,
          error: 'Stock must be a non-negative integer',
        });
        return;
      }
      updateData.stock = parseInt(stock);
    }

    if (Object.keys(updateData).length > 0) {
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      await dbManager.run(`
        UPDATE products
        SET ${setClause}, updatedAt = NOW()
        WHERE id = ?
      `, [...Object.values(updateData), parseInt(id)]);
    }

    const product = await dbManager.get(`
      SELECT * FROM products WHERE id = ?
    `, [parseInt(id)]);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
};