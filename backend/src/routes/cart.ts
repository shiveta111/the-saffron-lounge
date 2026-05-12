import { Router } from 'express';
import * as cartController from '../controllers/cartController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/cart
 * @desc    Get authenticated user's cart
 * @access  Private (requires authentication)
 */
router.get('/', authenticate, cartController.getCart);

/**
 * @route   POST /api/cart/items
 * @desc    Add product to cart (authenticated users only)
 * @access  Private (requires authentication)
 */
router.post('/items', authenticate, cartController.addItem);

/**
 * @route   PUT /api/cart/items/:id
 * @desc    Update cart item quantity
 * @access  Private (requires authentication)
 */
router.put('/items/:id', authenticate, cartController.updateItem);

/**
 * @route   DELETE /api/cart/items/:id
 * @desc    Remove product from cart
 * @access  Private (requires authentication)
 */
router.delete('/items/:id', authenticate, cartController.removeItem);

/**
 * @route   DELETE /api/cart
 * @desc    Clear entire cart
 * @access  Private (requires authentication)
 */
router.delete('/', authenticate, cartController.clearCart);

export default router;
