/**
 * Product Model - Handles all product-related database operations
 * Provides CRUD operations for menu items, categories, and inventory management
 */

import { dbManager } from '../utils/database';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  categoryId: number | null;
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  categoryId?: number;
  category: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: number;
  category?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export class ProductModel {
  /**
   * Find product by ID
   */
  static async findById(id: number): Promise<Product | null> {
    try {
      const sql = `
        SELECT id, name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt
        FROM products WHERE id = ?
      `;
      const result = await dbManager.get(sql, [id]);
      return result ? this.mapRowToProduct(result) : null;
    } catch (error) {
      console.error('Error finding product by ID:', error);
      throw new Error('Failed to find product');
    }
  }

  /**
   * Get all products with pagination and filtering
   */
  static async findAll(options: {
    page?: number;
    limit?: number;
    category?: string;
    isAvailable?: boolean;
    search?: string;
  } = {}): Promise<{ products: Product[]; total: number }> {
    try {
      const { page = 1, limit = 10, category, isAvailable, search } = options;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const params: any[] = [];

      if (category) {
        whereConditions.push('category = ?');
        params.push(category);
      }

      if (isAvailable !== undefined) {
        whereConditions.push('isAvailable = ?');
        params.push(isAvailable);
      }

      if (search) {
        whereConditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM products ${whereClause}`;
      const countResult = await dbManager.get(countSql, params);
      const total = countResult.total;

      // Get products
      const sql = `
        SELECT id, name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt
        FROM products
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;

      const results = await dbManager.query(sql, [...params, limit, offset]);
      const products = results.map((row: any) => this.mapRowToProduct(row));

      return { products, total };
    } catch (error) {
      console.error('Error finding all products:', error);
      throw new Error('Failed to retrieve products');
    }
  }

  /**
   * Create new product
   */
  static async create(productData: CreateProductData): Promise<Product> {
    try {
      const sql = `
        INSERT INTO products (name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await dbManager.run(sql, [
        productData.name,
        productData.description || null,
        productData.price,
        productData.categoryId || null,
        productData.category,
        productData.imageUrl || null,
        productData.isAvailable !== undefined ? productData.isAvailable : true
      ]);

      if (!result.insertId) {
        throw new Error('Failed to create product');
      }

      const product = await this.findById(result.insertId);
      if (!product) {
        throw new Error('Failed to retrieve created product');
      }

      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  /**
   * Update product
   */
  static async update(id: number, updateData: UpdateProductData): Promise<Product | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (updateData.name !== undefined) {
        fields.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        fields.push('description = ?');
        values.push(updateData.description);
      }
      if (updateData.price !== undefined) {
        fields.push('price = ?');
        values.push(updateData.price);
      }
      if (updateData.categoryId !== undefined) {
        fields.push('categoryId = ?');
        values.push(updateData.categoryId);
      }
      if (updateData.category !== undefined) {
        fields.push('category = ?');
        values.push(updateData.category);
      }
      if (updateData.imageUrl !== undefined) {
        fields.push('imageUrl = ?');
        values.push(updateData.imageUrl);
      }
      if (updateData.isAvailable !== undefined) {
        fields.push('isAvailable = ?');
        values.push(updateData.isAvailable);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      fields.push('updatedAt = NOW()');
      values.push(id);

      const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      await dbManager.run(sql, values);

      return await this.findById(id);
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  /**
   * Delete product (soft delete by setting isAvailable = false)
   */
  static async delete(id: number): Promise<boolean> {
    try {
      const sql = 'UPDATE products SET isAvailable = false, updatedAt = NOW() WHERE id = ?';
      const result = await dbManager.run(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  /**
   * Get products by category
   */
  static async findByCategory(category: string, limit: number = 20): Promise<Product[]> {
    try {
      const sql = `
        SELECT id, name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt
        FROM products
        WHERE category = ? AND isAvailable = true
        ORDER BY createdAt DESC
        LIMIT ?
      `;

      const results = await dbManager.query(sql, [category, limit]);
      return results.map((row: any) => this.mapRowToProduct(row));
    } catch (error) {
      console.error('Error finding products by category:', error);
      throw new Error('Failed to find products by category');
    }
  }

  /**
   * Search products
   */
  static async search(query: string, limit: number = 20): Promise<Product[]> {
    try {
      const sql = `
        SELECT id, name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt
        FROM products
        WHERE (name LIKE ? OR description LIKE ?) AND isAvailable = true
        ORDER BY createdAt DESC
        LIMIT ?
      `;

      const searchTerm = `%${query}%`;
      const results = await dbManager.query(sql, [searchTerm, searchTerm, limit]);
      return results.map((row: any) => this.mapRowToProduct(row));
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  /**
   * Get available products only
   */
  static async findAvailable(limit: number = 50): Promise<Product[]> {
    try {
      const sql = `
        SELECT id, name, description, price, categoryId, category, imageUrl, isAvailable, createdAt, updatedAt
        FROM products
        WHERE isAvailable = true
        ORDER BY category, name
        LIMIT ?
      `;

      const results = await dbManager.query(sql, [limit]);
      return results.map((row: any) => this.mapRowToProduct(row));
    } catch (error) {
      console.error('Error finding available products:', error);
      throw new Error('Failed to find available products');
    }
  }

  /**
   * Get product categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const sql = `
        SELECT DISTINCT category
        FROM products
        WHERE isAvailable = true
        ORDER BY category
      `;

      const results = await dbManager.query(sql);
      return results.map((row: any) => row.category);
    } catch (error) {
      console.error('Error getting categories:', error);
      throw new Error('Failed to get categories');
    }
  }

  /**
   * Map database row to Product interface
   */
  private static mapRowToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      categoryId: row.categoryId,
      category: row.category,
      imageUrl: row.imageUrl,
      isAvailable: Boolean(row.isAvailable),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}