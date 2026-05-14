import { PrismaClient, Product } from '@prisma/client';
import { wsManager } from '../utils/websocket';

const prisma = new PrismaClient();

/**
 * Generate URL-friendly slug from product name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}


/**
 * Ensure slug is unique by appending numeric suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    // If no existing product or it's the same product being updated
    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    // Append counter and try again
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Validate category exists and return category details
 */
async function validateAndGetCategory(categoryId: number) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, isActive: true },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  if (!category.isActive) {
    throw new Error('Category is not active');
  }

  return category;
}

interface ProductFilters {
  category?: string;
  type?: string;
  isAvailable?: boolean;
  search?: string;
  menuId?: number; // Filter products by menuId via junction table
}

interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  categoryId: number;
  type?: string;
  imageUrl?: string;
  availability?: number;
  sku?: string;
  dietaryNotes?: any[];
  allergenCodes?: any[];
  isAvailable?: boolean;
}

interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: number;
  type?: string;
  imageUrl?: string;
  availability?: number;
  sku?: string;
  dietaryNotes?: any[];
  allergenCodes?: any[];
  isAvailable?: boolean;
}

class ProductService {
  /**
   * Attach menu details to products without relying on strict nested relation includes.
   * This avoids Prisma runtime errors when orphaned menu_products rows exist.
   */
  private async attachMenuDetailsToProducts(products: any[]) {
    if (!products || products.length === 0) {
      return products;
    }

    const menuIds = Array.from(
      new Set(
        products
          .flatMap(product => (product.menuProducts || []).map((mp: any) => mp.menuId))
          .filter((menuId: any) => Number.isInteger(menuId))
      )
    ) as number[];

    if (menuIds.length === 0) {
      return products.map(product => ({ ...product, menuProducts: product.menuProducts || [] }));
    }

    const menus = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        type: true,
        imageUrl: true,
        isAvailable: true,
      },
    });

    const menuMap = new Map(menus.map(menu => [menu.id, menu]));

    return products.map(product => ({
      ...product,
      menuProducts: (product.menuProducts || []).map((mp: any) => ({
        ...mp,
        menu: menuMap.get(mp.menuId) || null,
      })),
    }));
  }

  private async attachMenuDetailsToProduct(product: any) {
    if (!product) {
      return product;
    }

    const [hydrated] = await this.attachMenuDetailsToProducts([product]);
    return hydrated;
  }

  /**
   * Get all products with filtering and menu information
   */
  async getAllProducts(filters: ProductFilters = {}) {
    const where: any = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }

    if (filters.menuId) {
      // Filter products by menuId via junction table
      where.menuProducts = {
        some: {
          menuId: filters.menuId,
        },
      };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
        { sku: { contains: filters.search } },
      ];
    }

    try {
      const products = await prisma.product.findMany({
        where,
        include: {
          menuProducts: true,
          menuCategory: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
            },
          },
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });

      const hydratedProducts = await this.attachMenuDetailsToProducts(products);

      // Parse JSON fields
      return hydratedProducts.map(product => this.parseProductData(product));
    } catch (error: any) {
      // If menu relations are inconsistent (or Prisma client/schema is out of sync),
      // fallback to a menu-safe query so product listing still works.
      if (error.code === 'P2022' || error.code === 'P2009' || 
          (error.message && (
            error.message.includes('menuProducts') ||
            error.message.includes('menuId') ||
            error.message.includes('Unknown argument') ||
            error.message.includes('does not exist') ||
            error.message.includes('Inconsistent query result') ||
            error.message.includes('Field menu is required to return data')
          ))) {
        console.warn('Using fallback product query due to relation inconsistency:', error.message || error.code);
        const products = await prisma.product.findMany({
          where,
          include: {
                menuProducts: true,
            menuCategory: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
              },
            },
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
        });
        const hydratedProducts = await this.attachMenuDetailsToProducts(products);
        
        // Return products without menuProducts relation
        return hydratedProducts.map(product => this.parseProductData(product));
      }
      throw error;
    }
  }

  /**
   * Get single product by ID with menu details
   */
  async getProductById(id: number) {
    let product: any;
    try {
      product = await prisma.product.findUnique({
        where: { id },
        include: {
          menuProducts: true,
          menuCategory: true,
          inventory: true,
        },
      });
    } catch (error: any) {
      if (error.message && (
        error.message.includes('Inconsistent query result') ||
        error.message.includes('Field menu is required to return data')
      )) {
        // Fallback when orphaned menu relations exist.
        product = await prisma.product.findUnique({
          where: { id },
          include: {
            menuProducts: true,
            menuCategory: true,
            inventory: true,
          },
        });
      } else {
        throw error;
      }
    }

    if (!product) {
      return null;
    }

    product = await this.attachMenuDetailsToProduct(product);

    return this.parseProductData(product);
  }

  /**
   * Get single product by slug with menu details
   */
  async getProductBySlug(slug: string) {
    let product: any;
    try {
      product = await prisma.product.findUnique({
        where: { slug },
        include: {
          menuProducts: true,
          menuCategory: true,
          inventory: true,
        },
      });
    } catch (error: any) {
      if (error.message && (
        error.message.includes('Inconsistent query result') ||
        error.message.includes('Field menu is required to return data')
      )) {
        // Fallback when orphaned menu relations exist.
        product = await prisma.product.findUnique({
          where: { slug },
          include: {
            menuProducts: true,
            menuCategory: true,
            inventory: true,
          },
        });
      } else {
        throw error;
      }
    }

    if (!product) {
      return null;
    }

    product = await this.attachMenuDetailsToProduct(product);

    return this.parseProductData(product);
  }

  /**
   * Create new product with optional menu linkage
   */
  async createProduct(data: CreateProductData) {
    // Validate categoryId and get category details
    const category = await validateAndGetCategory(data.categoryId);

    // Generate unique slug from product name
    const slug = await ensureUniqueSlug(generateSlug(data.name));

    // Create product (products are created independently, linked to menus via junction table)
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        price: data.price,
        categoryId: data.categoryId,
        category: category.name, // Auto-populate from category relationship
        type: data.type || null,
        imageUrl: data.imageUrl || null,
        availability: data.availability || 10,
        sku: data.sku || null,
        dietaryNotes: data.dietaryNotes ? JSON.stringify(data.dietaryNotes) : null,
        allergenCodes: data.allergenCodes ? JSON.stringify(data.allergenCodes) : null,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      },
      include: {
        menuProducts: true,
        menuCategory: true,
      },
    });

    const hydratedProduct = await this.attachMenuDetailsToProduct(product);

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('products', 'PRODUCT_CREATED', {
      product: this.parseProductData(hydratedProduct),
    });

    return this.parseProductData(hydratedProduct);
  }

  /**
   * Update product
   */
  async updateProduct(id: number, data: UpdateProductData) {
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Prepare update data
    const updateData: any = {};

    // Handle category update
    if (data.categoryId !== undefined && data.categoryId !== existingProduct.categoryId) {
      const category = await validateAndGetCategory(data.categoryId);
      updateData.categoryId = data.categoryId;
      updateData.category = category.name; // Auto-update category string
    }

    // Handle name update - regenerate slug
    if (data.name !== undefined && data.name !== existingProduct.name) {
      updateData.name = data.name;
      updateData.slug = await ensureUniqueSlug(generateSlug(data.name), id);
    }

    // Note: imageUrl is uploaded separately via /api/upload/product-image endpoint
    // Here we just update the string path if provided
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.availability !== undefined) updateData.availability = data.availability;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    if (data.dietaryNotes !== undefined) {
      updateData.dietaryNotes = JSON.stringify(data.dietaryNotes);
    }

    if (data.allergenCodes !== undefined) {
      updateData.allergenCodes = JSON.stringify(data.allergenCodes);
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        menuProducts: true,
        menuCategory: true,
      },
    });

    const hydratedProduct = await this.attachMenuDetailsToProduct(product);

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('products', 'PRODUCT_UPDATED', {
      product: this.parseProductData(hydratedProduct),
    });

    return this.parseProductData(hydratedProduct);
  }

  /**
   * Delete product with order existence check
   */
  async deleteProduct(id: number) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if product has been ordered
    if (product.orderItems && product.orderItems.length > 0) {
      throw new Error('Cannot delete product that has been ordered. Consider marking it as unavailable instead.');
    }

    // Delete product
    await prisma.product.delete({
      where: { id },
    });

    // Broadcast WebSocket event
    wsManager.broadcastToRoom('products', 'PRODUCT_DELETED', {
      productId: id,
    });

    return true;
  }

  /**
   * Validate product availability
   */
  async validateProductAvailability(productId: number, quantity: number = 1): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        isAvailable: true,
        availability: true,
      },
    });

    if (!product) {
      return false;
    }

    if (!product.isAvailable) {
      return false;
    }

    if (product.availability < quantity) {
      return false;
    }

    return true;
  }

  /**
   * Search products
   */
  async searchProducts(query: string, filters: ProductFilters = {}) {
    return this.getAllProducts({
      ...filters,
      search: query,
    });
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, filters: ProductFilters = {}) {
    return this.getAllProducts({
      ...filters,
      category,
    });
  }

  /**
   * Get products by menu ID
   */
  async getProductsByMenuId(menuId: number) {
    return this.getAllProducts({
      menuId,
    });
  }

  /**
   * Safely parse JSON string to object/array, handling already parsed values and invalid JSON
   */
  private safeParseJson(value: any, defaultValue: any = null): any {
    if (!value) return defaultValue;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        // If JSON parsing fails, return default value
        console.warn('Failed to parse JSON:', error);
        return defaultValue;
      }
    }
    // If already an object/array, return as-is
    return value;
  }

  /**
   * Parse product data (convert JSON strings to objects and transform menuProducts)
   */
  private parseProductData(product: any) {
    // Transform menuProducts array to menus array for backward compatibility
    const menus = product.menuProducts?.map((mp: any) => mp.menu).filter(Boolean) || [];
    
    return {
      ...product,
      // Keep menuProducts for new structure
      menuProducts: product.menuProducts || [],
      // Add menus array for backward compatibility (first menu if exists)
      menu: menus.length > 0 ? menus[0] : null,
      menus: menus, // All menus this product belongs to
      dietaryNotes: this.safeParseJson(product.dietaryNotes, []),
      allergenCodes: this.safeParseJson(product.allergenCodes, []),
      nutritionalInfo: this.safeParseJson(product.nutritionalInfo, null),
    };
  }
}

export const productService = new ProductService();
export default productService;
