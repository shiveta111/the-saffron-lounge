import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with menu associations
 * @access  Admin only
 * @query   category, type, isAvailable, search, menuId
 */
router.get('/', authenticate, requireAdmin, getProducts);

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get single product by ID with menu details
 * @access  Admin only
 */
router.get('/:id', authenticate, requireAdmin, getProductById);

/**
 * @route   POST /api/admin/products
 * @desc    Create new product linked to menu
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, createProduct);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update product
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, updateProduct);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete product
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
