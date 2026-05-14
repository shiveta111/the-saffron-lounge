import express from 'express';
import { 
  getMenus, 
  getMenuById, 
  getCategories,
  createMenu,
  updateMenu,
  deleteMenu,
  checkProductsAvailability
} from '../controllers/menusController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/menus/check-products
 * @desc    Check if products are available for menu creation
 * @access  Admin only
 */
router.get('/check-products', authenticate, checkProductsAvailability);

/**
 * @route   GET /api/menus
 * @desc    Get all menu items for public display
 * @access  Public
 * @query   category, type, isAvailable, search
 */
router.get('/', getMenus);

/**
 * @route   GET /api/menus/:id
 * @desc    Get single menu item by ID
 * @access  Public
 */
router.get('/:id', getMenuById);

/**
 * @route   POST /api/menus
 * @desc    Create new menu item
 * @access  Admin only
 */
router.post('/', authenticate, requireAdmin, createMenu);

/**
 * @route   PUT /api/menus/:id
 * @desc    Update menu item
 * @access  Admin only
 */
router.put('/:id', authenticate, requireAdmin, updateMenu);

/**
 * @route   DELETE /api/menus/:id
 * @desc    Delete menu item
 * @access  Admin only
 */
router.delete('/:id', authenticate, requireAdmin, deleteMenu);

/**
 * @route   GET /api/menus/categories/all
 * @desc    Get all categories
 * @access  Public
 */
router.get('/categories/all', getCategories);

export default router;
