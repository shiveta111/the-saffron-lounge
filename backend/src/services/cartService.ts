import * as winston from 'winston';
import prisma from '../config/prisma';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cart-service' },
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

// Tax rate (13% VAT for Ireland)
const TAX_RATE = 0.13;

export interface CartCalculations {
  subtotal: number;
  tax: number;
  total: number;
}

export interface CartItemData {
  productId: number;
  quantity: number;
  notes?: string;
}

export class CartService {
  /**
   * Get or create cart for user or guest
   * @param userId - User ID (null for guest)
   * @param sessionId - Session ID for guest users
   * @returns Cart with items
   */
  async getOrCreateCart(userId: number | null, sessionId: string | null): Promise<any> {
    try {
      let cart;

      if (userId) {
        // Find cart by userId
        cart = await prisma.cart.findFirst({
          where: { userId },
          include: {
            items: {
              include: {
                product: true,
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

        // Create cart if doesn't exist
        if (!cart) {
          cart = await prisma.cart.create({
            data: {
              userId,
              sessionId: null,
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
          logger.info('Cart created for user', { userId, cartId: cart.id });
        }
      } else if (sessionId) {
        // Find cart by sessionId
        cart = await prisma.cart.findFirst({
          where: { sessionId },
          include: {
            items: {
              include: {
                product: true,
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

        // Create cart if doesn't exist
        if (!cart) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

          cart = await prisma.cart.create({
            data: {
              sessionId,
              userId: null,
              expiresAt,
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
          logger.info('Cart created for guest', { sessionId, cartId: cart.id });
        }
      } else {
        throw new Error('Either userId or sessionId must be provided');
      }

      // Calculate totals
      const cartWithCalculations = this.addCalculations(cart);

      return cartWithCalculations;
    } catch (error) {
      logger.error('Failed to get or create cart', { error, userId, sessionId });
      throw new Error(`Failed to get cart: ${(error as Error).message}`);
    }
  }

  /**
   * Add item to cart
   * @param cartId - Cart ID
   * @param itemData - Item data
   * @returns Updated cart
   */
  async addItem(cartId: number, itemData: CartItemData): Promise<any> {
    try {
      // Validate product exists and is available
      const product = await prisma.product.findUnique({
        where: { id: itemData.productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (!product.isAvailable) {
        throw new Error('Product is not available');
      }

      // Check stock availability
      if (product.availability < itemData.quantity) {
        throw new Error(`Only ${product.availability} items available in stock`);
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId,
          productId: itemData.productId,
        },
      });

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + itemData.quantity;

        // Check stock for new quantity
        if (product.availability < newQuantity) {
          throw new Error(`Only ${product.availability} items available in stock`);
        }

        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            notes: itemData.notes || existingItem.notes,
          },
        });

        logger.info('Cart item quantity updated', { cartId, productId: itemData.productId, newQuantity });
      } else {
        // Add new item
        await prisma.cartItem.create({
          data: {
            cartId,
            productId: itemData.productId,
            quantity: itemData.quantity,
            price: product.price, // Store price at time of adding
            notes: itemData.notes || null,
          },
        });

        logger.info('Item added to cart', { cartId, productId: itemData.productId, quantity: itemData.quantity });
      }

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      return updatedCart;
    } catch (error) {
      logger.error('Failed to add item to cart', { error, cartId, itemData });
      throw error;
    }
  }

  /**
   * Update cart item
   * @param itemId - Cart item ID
   * @param quantity - New quantity
   * @param notes - Optional notes
   * @returns Updated cart
   */
  async updateItem(itemId: number, quantity: number, notes?: string): Promise<any> {
    try {
      // Get cart item
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
        include: {
          product: true,
        },
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Check stock availability
      if (!cartItem.product) {
        throw new Error('Product not found for cart item');
      }
      if (cartItem.product.availability < quantity) {
        throw new Error(`Only ${cartItem.product.availability} items available in stock`);
      }

      // Update item
      await prisma.cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          notes: notes !== undefined ? notes : cartItem.notes,
        },
      });

      logger.info('Cart item updated', { itemId, quantity, notes });

      // Get updated cart
      const updatedCart = await this.getCart(cartItem.cartId);

      return updatedCart;
    } catch (error) {
      logger.error('Failed to update cart item', { error, itemId, quantity });
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param itemId - Cart item ID
   * @returns Updated cart
   */
  async removeItem(itemId: number): Promise<any> {
    try {
      // Get cart item to get cartId
      const cartItem = await prisma.cartItem.findUnique({
        where: { id: itemId },
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      const cartId = cartItem.cartId;

      // Delete item
      await prisma.cartItem.delete({
        where: { id: itemId },
      });

      logger.info('Item removed from cart', { itemId, cartId });

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      return updatedCart;
    } catch (error) {
      logger.error('Failed to remove cart item', { error, itemId });
      throw error;
    }
  }

  /**
   * Clear entire cart
   * @param cartId - Cart ID
   * @returns Empty cart
   */
  async clearCart(cartId: number): Promise<any> {
    try {
      // Delete all items
      await prisma.cartItem.deleteMany({
        where: { cartId },
      });

      logger.info('Cart cleared', { cartId });

      // Get updated cart
      const updatedCart = await this.getCart(cartId);

      return updatedCart;
    } catch (error) {
      logger.error('Failed to clear cart', { error, cartId });
      throw error;
    }
  }

  /**
   * Sync guest cart to user account
   * @param guestSessionId - Guest session ID
   * @param userId - User ID
   * @returns User cart with merged items
   */
  async syncGuestCart(guestSessionId: string, userId: number): Promise<any> {
    try {
      // Get guest cart
      const guestCart = await prisma.cart.findFirst({
        where: { sessionId: guestSessionId },
        include: {
          items: true,
        },
      });

      if (!guestCart || guestCart.items.length === 0) {
        // No guest cart or empty, just return user cart
        return this.getOrCreateCart(userId, null);
      }

      // Get or create user cart
      let userCart = await prisma.cart.findFirst({
        where: { userId },
      });

      if (!userCart) {
        userCart = await prisma.cart.create({
          data: {
            userId,
            sessionId: null,
          },
        });
      }

      // Merge items from guest cart to user cart
      for (const guestItem of guestCart.items) {
        // Check if item already exists in user cart
        const existingItem = await prisma.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            productId: guestItem.productId,
          },
        });

        if (existingItem) {
          // Update quantity (add guest quantity to existing)
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + guestItem.quantity,
              notes: guestItem.notes || existingItem.notes,
            },
          });
        } else {
          // Add new item to user cart
          await prisma.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: guestItem.productId,
              quantity: guestItem.quantity,
              price: guestItem.price,
              notes: guestItem.notes,
            },
          });
        }
      }

      // Delete guest cart
      await prisma.cart.delete({
        where: { id: guestCart.id },
      });

      logger.info('Guest cart synced to user account', { guestSessionId, userId, userCartId: userCart.id });

      // Get updated user cart
      const updatedCart = await this.getCart(userCart.id);

      return updatedCart;
    } catch (error) {
      logger.error('Failed to sync guest cart', { error, guestSessionId, userId });
      throw error;
    }
  }

  /**
   * Get cart by ID
   * @param cartId - Cart ID
   * @returns Cart with items and calculations
   */
  async getCart(cartId: number): Promise<any> {
    try {
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
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

      if (!cart) {
        throw new Error('Cart not found');
      }

      return this.addCalculations(cart);
    } catch (error) {
      logger.error('Failed to get cart', { error, cartId });
      throw error;
    }
  }

  /**
   * Add calculations to cart
   * @param cart - Cart with items
   * @returns Cart with calculations
   */
  private addCalculations(cart: any): any {
    const subtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    return {
      ...cart,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      itemCount: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    };
  }

  /**
   * Validate cart before checkout
   * @param cartId - Cart ID
   * @returns Validation result
   */
  async validateCart(cartId: number): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const cart = await this.getCart(cartId);
      const errors: string[] = [];

      if (cart.items.length === 0) {
        errors.push('Cart is empty');
      }

      // Check each item for availability and stock
      for (const item of cart.items) {
        // Handle products
        if (item.productId && item.product) {
          if (!item.product.isAvailable) {
            errors.push(`${item.product.name} is no longer available`);
          }

          if (item.product.availability < item.quantity) {
            errors.push(`Only ${item.product.availability} of ${item.product.name} available in stock`);
          }

          // Check if price has changed
          if (item.price !== item.product.price) {
            errors.push(`Price of ${item.product.name} has changed from €${item.price} to €${item.product.price}`);
          }
        }
        
        // Handle menu items (combo packs)
        if (item.menuId && item.menu) {
          if (!item.menu.isAvailable) {
            errors.push(`${item.menu.name} is no longer available`);
          }

          // Check if price has changed
          if (item.price !== item.menu.price) {
            errors.push(`Price of ${item.menu.name} has changed from €${item.price} to €${item.menu.price}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      logger.error('Failed to validate cart', { error, cartId });
      throw error;
    }
  }

  /**
   * Clean up expired guest carts
   */
  async cleanupExpiredCarts(): Promise<void> {
    try {
      const result = await prisma.cart.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info('Expired carts cleaned up', { count: result.count });
    } catch (error) {
      logger.error('Failed to cleanup expired carts', { error });
    }
  }
}

export const cartService = new CartService();
