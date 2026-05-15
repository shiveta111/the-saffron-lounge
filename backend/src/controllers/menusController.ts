import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { menuService } from '../services/menuService';

const prisma = new PrismaClient();

/**
 * Get all menu items for public display
 * Supports filtering by category, type, availability, and search
 */
export const getMenus = async (req: Request, res: Response) => {
  try {
    const { category, type, isAvailable, search } = req.query;

    const where: any = {};

    // Only filter by availability when explicitly requested
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    if (category) {
      where.category = category as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    // Fetch menus with their linked products
    // Only include menu_products that have a valid productId (not null)
    const menus = await prisma.menu.findMany({
      where,
      include: {
        categoryRef: true,
        menuProducts: {
          where: {
            productId: { not: null }, // Only include records with valid product references
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                description: true,
                imageUrl: true,
                isAvailable: true,
                category: true,
                categoryId: true,
                type: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Parse JSON fields and transform menuProducts to products array
    // Also ensure all required fields are present for frontend compatibility
    const menusWithParsedData = menus.map(menu => {
      // Safely parse JSON fields
      let dietaryNotes: any[] = [];
      let allergenCodes: any[] = [];
      let nutritionalInfo: any = null;

      try {
        dietaryNotes = menu.dietaryNotes ? JSON.parse(menu.dietaryNotes) : [];
      } catch (e) {
        dietaryNotes = [];
      }

      try {
        allergenCodes = menu.allergenCodes ? JSON.parse(menu.allergenCodes) : [];
      } catch (e) {
        allergenCodes = [];
      }

      try {
        nutritionalInfo = menu.nutritionalInfo ? JSON.parse(menu.nutritionalInfo) : null;
      } catch (e) {
        nutritionalInfo = null;
      }

      return {
        ...menu,
        // Map categoryRef to match frontend expectations
        categoryRef: menu.categoryRef ? {
          id: menu.categoryRef.id,
          name: menu.categoryRef.name,
          type: menu.categoryRef.type,
          description: menu.categoryRef.description,
          imageUrl: menu.categoryRef.imageUrl,
          sortOrder: menu.categoryRef.sortOrder,
        } : null,
        // Transform menuProducts to products array for easier frontend consumption
        products: menu.menuProducts
          ?.map((mp: any) => mp.product)
          .filter((p: any) => p !== null && p !== undefined) || [],
        menuProducts: menu.menuProducts || [],
        dietaryNotes,
        allergenCodes,
        nutritionalInfo,
        // Ensure imageUrl is always a string (not null)
        imageUrl: menu.imageUrl || null,
      };
    });

    res.json({
      success: true,
      data: menusWithParsedData,
      count: menusWithParsedData.length,
    });
  } catch (error: any) {
    console.error('Error fetching menus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu items',
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get single menu item by ID
 */
export const getMenuById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id: parseInt(id!) },
      include: {
        categoryRef: true,
        menuProducts: {
          where: {
            productId: { not: null }, // Only include records with valid product references
          },
          include: {
            product: true,
          },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    // Parse JSON fields and transform menuProducts to products array
    const menuWithParsedData = {
      ...menu,
      products: menu.menuProducts
        ?.map((mp: any) => mp.product)
        .filter((p: any) => p !== null && p !== undefined) || [],
      dietaryNotes: menu.dietaryNotes ? JSON.parse(menu.dietaryNotes) : [],
      allergenCodes: menu.allergenCodes ? JSON.parse(menu.allergenCodes) : [],
      nutritionalInfo: menu.nutritionalInfo ? JSON.parse(menu.nutritionalInfo) : null,
    };

    res.json({
      success: true,
      data: menuWithParsedData,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item',
    });
  }
};

/**
 * Get all categories for public access
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;

    const where: any = {
      isActive: true,
    };

    if (type) {
      where.type = type as string;
    }

    if (search) {
      where.name = {
        contains: search as string,
      };
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: {
        sortOrder: 'asc',
      },
    });

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

/**
 * Create menu item (Admin only)
 */
export const createMenu = async (req: Request, res: Response) => {
  try {
    // Step 1: Check if any products exist in the system
    const productCount = await prisma.product.count();
    
    if (productCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create menu without products',
        message: 'Please create at least one product before creating a menu',
        code: 'NO_PRODUCTS_EXIST'
      });
    }

    const {
      name,
      description,
      price,
      category,
      categoryId,
      type,
      imageUrl,
      isAvailable,
      isSpecial,
      preparationTime,
      dietaryNotes,
      allergenCodes,
      nutritionalInfo,
      productIds,
    } = req.body;

    // Step 2: Validate productIds are provided and exist
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product IDs required',
        message: 'At least one product must be selected to create a menu',
        code: 'PRODUCT_IDS_REQUIRED'
      });
    }

    // Validate all product IDs exist and get their prices
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, name: true }
    });
    
    const existingIds = existingProducts.map(p => p.id);
    const invalidIds = productIds.filter((id: number) => !existingIds.includes(id));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product IDs',
        message: `The following product IDs do not exist: ${invalidIds.join(', ')}`,
        invalidIds,
        code: 'INVALID_PRODUCT_IDS'
      });
    }

    // Step 3: Calculate menu price from sum of product prices
    const calculatedPrice = existingProducts.reduce((sum, product) => sum + product.price, 0);
    const menuPrice = price ? parseFloat(price) : calculatedPrice;

    // Validate menu item data using service
    const validation = menuService.validateMenuItem({
      name,
      price: menuPrice,
      category,
      allergenCodes,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // Step 4: Create menu item with calculated price
    const menu = await prisma.menu.create({
      data: {
        name,
        description: description || '',
        price: menuPrice, // Use calculated price
        category,
        categoryId,
        type: type || 'All',
        imageUrl: imageUrl || '',
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        isSpecial: isSpecial || false,
        preparationTime,
        dietaryNotes: dietaryNotes ? JSON.stringify(dietaryNotes) : null,
        allergenCodes: allergenCodes ? JSON.stringify(allergenCodes) : null,
        nutritionalInfo: nutritionalInfo ? JSON.stringify(nutritionalInfo) : null,
      },
      include: {
        categoryRef: true,
        menuProducts: {
          include: {
            product: true,
          },
        },
      },
    });

    // Step 5: Link products to this menu via junction table
    const menuProductRecords = productIds.map((productId: number) => ({
      menuId: menu.id,
      productId,
      quantity: 1,
    }));

    await prisma.menuProduct.createMany({
      data: menuProductRecords,
      skipDuplicates: true,
    });

    // Fetch menu with products for response
    const menuWithProducts = await prisma.menu.findUnique({
      where: { id: menu.id },
      include: {
        categoryRef: true,
        menuProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
                isAvailable: true,
              },
            },
          },
        },
      },
    });

    // Invalidate cache
    menuService.invalidateMenuCache();

    // Parse JSON fields for response
    const menuWithParsedData = {
      ...menuWithProducts,
      products: menuWithProducts?.menuProducts?.map((mp: any) => mp.product) || [],
      calculatedPrice: calculatedPrice,
      dietaryNotes: menuWithProducts?.dietaryNotes ? JSON.parse(menuWithProducts.dietaryNotes) : [],
      allergenCodes: menuWithProducts?.allergenCodes ? JSON.parse(menuWithProducts.allergenCodes) : [],
      nutritionalInfo: menuWithProducts?.nutritionalInfo ? JSON.parse(menuWithProducts.nutritionalInfo) : null,
    };

    // Broadcast menu created event
    await menuService.broadcastMenuUpdate(menu.id, 'created', {
      id: menu.id,
      name: menu.name,
      category: menu.category,
      price: menu.price,
      isAvailable: menu.isAvailable,
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuWithParsedData,
    });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu item',
    });
  }
};

/**
 * Update menu item (Admin only)
 */
export const updateMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menuId = parseInt(id!);
    const { productIds, ...otherData } = req.body;
    const updateData: any = {};

    // Validate if fields are being updated
    const allowedFields = [
      'name', 'description', 'price', 'category', 'categoryId', 'type',
      'imageUrl', 'isAvailable', 'isSpecial', 'preparationTime',
      'dietaryNotes', 'allergenCodes', 'nutritionalInfo'
    ];

    // Build update data
    allowedFields.forEach(field => {
      if (otherData[field] !== undefined) {
        if (field === 'price') {
          updateData[field] = parseFloat(otherData[field]);
        } else if (field === 'dietaryNotes' || field === 'allergenCodes' || field === 'nutritionalInfo') {
          updateData[field] = JSON.stringify(otherData[field]);
        } else {
          updateData[field] = otherData[field];
        }
      }
    });

    // Handle productIds update - recalculate price if products change
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      // Validate product IDs exist
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true },
      });

      const existingIds = existingProducts.map(p => p.id);
      const invalidIds = productIds.filter((id: number) => !existingIds.includes(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid product IDs',
          message: `The following product IDs do not exist: ${invalidIds.join(', ')}`,
          invalidIds,
        });
      }

      // Calculate new price from products
      const calculatedPrice = existingProducts.reduce((sum, product) => sum + product.price, 0);
      if (!updateData.price) {
        updateData.price = calculatedPrice;
      }

      // Update junction table - delete old links and create new ones
      await prisma.menuProduct.deleteMany({
        where: { menuId },
      });

      await prisma.menuProduct.createMany({
        data: productIds.map((productId: number) => ({
          menuId,
          productId,
          quantity: 1,
        })),
      });
    }

    // Validate update data if critical fields are being changed
    if (updateData.name || updateData.price || updateData.category || otherData.allergenCodes) {
      const validation = menuService.validateMenuItem({
        name: updateData.name || otherData.name,
        price: updateData.price !== undefined ? updateData.price : 0,
        category: updateData.category || otherData.category,
        allergenCodes: otherData.allergenCodes,
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        });
      }
    }

    const menu = await prisma.menu.update({
      where: { id: menuId },
      data: updateData,
      include: {
        categoryRef: true,
        menuProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
                isAvailable: true,
              },
            },
          },
        },
      },
    });

    // Invalidate cache
    menuService.invalidateMenuCache(menuId);

    // Parse JSON fields for response
    const menuWithParsedData = {
      ...menu,
      products: menu.menuProducts?.map((mp: any) => mp.product) || [],
      dietaryNotes: menu.dietaryNotes ? JSON.parse(menu.dietaryNotes) : [],
      allergenCodes: menu.allergenCodes ? JSON.parse(menu.allergenCodes) : [],
      nutritionalInfo: menu.nutritionalInfo ? JSON.parse(menu.nutritionalInfo) : null,
    };

    // Broadcast menu updated event
    await menuService.broadcastMenuUpdate(menu.id, 'updated', {
      id: menu.id,
      name: menu.name,
      category: menu.category,
      price: menu.price,
      isAvailable: menu.isAvailable,
    });

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuWithParsedData,
    });
  } catch (error: any) {
    console.error('Error updating menu item:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update menu item',
    });
  }
};

/**
 * Delete menu item (Admin only)
 * Checks for linked products before deletion
 */
export const deleteMenu = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const menuId = parseInt(id!);

    // Check if menu item exists
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    // Check if there are any products linked to this menu item via junction table
    const linkedProducts = await prisma.menuProduct.count({
      where: { menuId },
    });

    // Note: With cascade delete, products will remain but menuProduct records will be deleted
    // This check is informational - we allow deletion as products are independent
    if (linkedProducts > 0) {
      console.log(`Menu ${menuId} has ${linkedProducts} linked products (will be unlinked on delete)`);
    }

    // Delete the menu item
    await prisma.menu.delete({
      where: { id: menuId },
    });

    // Invalidate cache
    menuService.invalidateMenuCache(menuId);

    // Broadcast menu deleted event
    await menuService.broadcastMenuUpdate(menuId, 'deleted', {
      id: menuId,
      name: menu.name,
    });

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting menu item:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete menu item',
    });
  }
};

/**
 * Check if products are available for menu creation
 * Returns product count and availability status
 */
export const checkProductsAvailability = async (req: Request, res: Response) => {
  try {
    const productCount = await prisma.product.count();
    const hasProducts = productCount > 0;
    
    res.json({
      success: true,
      data: {
        hasProducts,
        productCount,
        message: hasProducts 
          ? 'Products are available for menu creation' 
          : 'No products exist. Please create products first.'
      }
    });
  } catch (error) {
    console.error('Error checking products availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check products availability',
    });
  }
};
