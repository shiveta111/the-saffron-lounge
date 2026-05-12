import { Request, Response } from 'express';
import * as Joi from 'joi';
import * as winston from 'winston';
import prisma from '../config/prisma';
import { JWTPayload } from '../utils/jwt';
import { wsManager } from '../utils/websocket';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cart-controller' },
  transports: [
    new winston.transports.File({ filename: 'logs/cart-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/cart.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Validation schemas
const addItemSchema = Joi.object({
  productId: Joi.number().integer().optional(),
  menuId: Joi.number().integer().optional(),
  quantity: Joi.number().integer().min(1).max(99).required(),
  notes: Joi.string().max(500).optional(),
}).or('productId', 'menuId'); // At least one must be provided

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(99).required(),
  notes: Joi.string().max(500).optional(),
});

// Tax rate constant
const TAX_RATE = 0.10; // 10% tax

// Helper function to calculate cart totals
const calculateCartTotals = (items: any[]) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
};

// Helper function to get or create cart (authenticated users only)
const getOrCreateCart = async (userId: number) => {
  if (!userId) {
    throw new Error('User authentication is required');
  }

  // Validate that the user exists before creating a cart
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new Error(`User with ID ${userId} does not exist. Please login again.`);
  }

  // Try to find existing cart
  let cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              isAvailable: true,
              category: true,
              availability: true,
              sku: true,
            },
          },
          menu: {
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
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Create new cart if not found
  if (!cart) {
    try {
      cart = await prisma.cart.create({
        data: {
          userId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                  isAvailable: true,
                  category: true,
                  availability: true,
                  sku: true,
                },
              },
              menu: {
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
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      // Handle foreign key constraint violation
      if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
        throw new Error(`User with ID ${userId} does not exist. Please login again.`);
      }
      throw error;
    }
  }

  return cart;
};

// Controller functions
export const getCart = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please login to view your cart.',
      });
    }

    const cart = await getOrCreateCart(userId);
    const totals = calculateCartTotals(cart.items);

    logger.info('Cart retrieved', {
      cartId: cart.id,
      userId,
      itemCount: cart.items.length,
    });

    res.json({
      success: true,
      data: {
        cart: {
          ...cart,
          ...totals,
          itemCount: cart.items.length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve cart', { error: error.message });
    
    // Handle specific error cases
    if (error.message?.includes('does not exist')) {
      return res.status(401).json({
        success: false,
        error: error.message || 'User account not found. Please login again.',
        requiresReauth: true,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve cart',
    });
  }
};

export const addItem = async (req: Request, res: Response) => {
  // Extract userId outside try-catch to ensure it's available in catch block
  const userId = (req.user as JWTPayload)?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login to add items to cart.',
      requiresAuth: true,
    });
  }

  try {

    // Validate request body
    const { error, value } = addItemSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid add item data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid item data',
        details: error.details?.[0]?.message,
      });
    }

    const { productId, menuId, quantity, notes } = value;

    // Get or create cart
    const cart = await getOrCreateCart(userId);

    let cartItem;
    let itemPrice: number;
    let itemName: string;

    if (productId) {
      // Handle product addition
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      if (!product.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `${product.name} is currently unavailable`,
        });
      }

      // Check stock availability
      if (product.availability < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Only ${product.availability} available`,
        });
      }

      itemPrice = product.price;
      itemName = product.name;

      // Check if item already exists in cart
      const existingItem = cart.items.find(item => item.productId === productId && !item.menuId);

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;

        if (product.availability < newQuantity) {
          return res.status(400).json({
            success: false,
            error: `Cannot add more. Only ${product.availability} available`,
          });
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            notes: notes || existingItem.notes,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
                category: true,
                availability: true,
                sku: true,
              },
            },
            menu: {
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
                      },
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
            price: itemPrice,
            notes,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
                category: true,
                availability: true,
                sku: true,
              },
            },
            menu: {
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
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
    } else if (menuId) {
      // Handle menu item (combo pack) addition
      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
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
                  availability: true,
                },
              },
            },
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          error: 'Menu item not found t',
        });
      }

      if (!menu.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `${menu.name} is currently unavailable`,
        });
      }

      itemPrice = menu.price;
      itemName = menu.name;

      // Check if item already exists in cart
      const existingItem = cart.items.find(item => item.menuId === menuId && !item.productId);

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            notes: notes || existingItem.notes,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
                category: true,
                availability: true,
                sku: true,
              },
            },
            menu: {
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
                      },
                    },
                  },
                },
              },
            },
          },
        });
      } else {
        // Create new cart item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            menuId,
            quantity,
            price: itemPrice,
            notes,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                isAvailable: true,
                category: true,
                availability: true,
                sku: true,
              },
            },
            menu: {
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
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either productId or menuId must be provided',
      });
    }

    // Get updated cart with totals
    const updatedCart = await getOrCreateCart(userId);
    const totals = calculateCartTotals(updatedCart.items);

    logger.info('Item added to cart', {
      cartId: cart.id,
      productId: productId || null,
      menuId: menuId || null,
      quantity,
      userId,
    });

    // Broadcast CART_UPDATED event via WebSocket
    try {
      if (wsManager && typeof wsManager.emitToUser === 'function') {
        wsManager.emitToUser(userId, 'CART_UPDATED', {
          cartId: cart.id,
          itemCount: updatedCart.items.length,
          total: totals.total,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      // WebSocket error shouldn't fail the request
      logger.warn('WebSocket broadcast failed', { error: wsError });
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        cartItem,
        cart: {
          ...updatedCart,
          ...totals,
          itemCount: updatedCart.items.length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to add item to cart', { 
      error: error.message, 
      stack: error.stack,
      body: req.body,
      userId: userId || 'not authenticated'
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to add item to cart';
    if (error.code === 'P2002') {
      errorMessage = 'Item already exists in cart';
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid product or menu item reference';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cart item ID',
      });
    }

    // Validate request body
    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
      logger.warn('Invalid update item data', { error: error.details?.[0]?.message });
      return res.status(400).json({
        success: false,
        error: 'Invalid item data',
        details: error.details?.[0]?.message,
      });
    }

    const { quantity, notes } = value;

    // Find cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(id) },
      include: {
        cart: true,
        product: true,
        menu: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found',
      });
    }

    // Verify cart ownership
    if (cartItem.cart.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check stock availability (for products only, menu items don't have stock)
    if (cartItem.productId && cartItem.product) {
      if (cartItem.product.availability < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Only ${cartItem.product.availability} available`,
        });
      }
    }
    
    // For menu items, check if menu is available
    if (cartItem.menuId && cartItem.menu) {
      if (!cartItem.menu.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `${cartItem.menu.name} is currently unavailable`,
        });
      }
    }

    // Update cart item
    const updatedItem = await prisma.cartItem.update({
      where: { id: Number(id) },
      data: {
        quantity,
        notes: notes !== undefined ? notes : cartItem.notes,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            isAvailable: true,
            category: true,
            availability: true,
            sku: true,
          },
        },
        menu: {
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
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get updated cart with totals
    const updatedCart = await getOrCreateCart(userId);
    const totals = calculateCartTotals(updatedCart.items);

    logger.info('Cart item updated', {
      cartItemId: id,
      quantity,
      userId,
    });

    // Broadcast CART_UPDATED event via WebSocket
    try {
      if (wsManager && typeof wsManager.emitToUser === 'function') {
        wsManager.emitToUser(userId, 'CART_UPDATED', {
          cartId: cartItem.cart.id,
          itemCount: updatedCart.items.length,
          total: totals.total,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      logger.warn('WebSocket broadcast failed', { error: wsError });
    }

    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        cartItem: updatedItem,
        cart: {
          ...updatedCart,
          ...totals,
          itemCount: updatedCart.items.length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to update cart item', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item',
    });
  }
};

export const removeItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cart item ID',
      });
    }

    // Find cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: Number(id) },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found',
      });
    }

    // Verify cart ownership
    if (cartItem.cart.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Delete cart item
    await prisma.cartItem.delete({
      where: { id: Number(id) },
    });

    // Get updated cart with totals
    const updatedCart = await getOrCreateCart(userId);
    const totals = calculateCartTotals(updatedCart.items);

    logger.info('Cart item removed', {
      cartItemId: id,
      userId,
    });

    // Broadcast CART_UPDATED event via WebSocket
    try {
      if (wsManager && typeof wsManager.emitToUser === 'function') {
        wsManager.emitToUser(userId, 'CART_UPDATED', {
          cartId: cartItem.cart.id,
          itemCount: updatedCart.items.length,
          total: totals.total,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      logger.warn('WebSocket broadcast failed', { error: wsError });
    }

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: {
          ...updatedCart,
          ...totals,
          itemCount: updatedCart.items.length,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to remove cart item', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to remove cart item',
    });
  }
};

export const clearCart = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JWTPayload)?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Find cart
    const cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: 'Cart not found',
      });
    }

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    logger.info('Cart cleared', {
      cartId: cart.id,
      userId,
    });

    // Broadcast CART_CLEARED event via WebSocket
    try {
      if (wsManager && typeof wsManager.emitToUser === 'function') {
        wsManager.emitToUser(userId, 'CART_CLEARED', {
          cartId: cart.id,
          itemCount: 0,
          total: 0,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (wsError) {
      logger.warn('WebSocket broadcast failed', { error: wsError });
    }

    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        cart: {
          id: cart.id,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          itemCount: 0,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to clear cart', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart',
    });
  }
};
