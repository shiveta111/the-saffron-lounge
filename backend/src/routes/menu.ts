import express, { Router } from 'express';
import {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuPrice,
  toggleMenuAvailability,
  getMenuPriceHistory,
  bulkUpdatePrices,
  getCategories,
  getAllMenuItemsNoPagination,
} from '../controllers/menuController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/menu:
 *   get:
 *     summary: Get all menu items
 *     description: |
 *       Retrieve a paginated list of all menu items with optional filtering.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports filtering by category and availability status.
 *     tags: [Menu]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by menu category
 *         example: "Main Course"
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability status
 *         example: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Grilled Salmon"
 *                           description:
 *                             type: string
 *                             example: "Fresh Atlantic salmon grilled to perfection"
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 24.99
 *                           category:
 *                             type: string
 *                             example: "Main Course"
 *                           imageUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/salmon.jpg"
 *                           isAvailable:
 *                             type: boolean
 *                             example: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/menu/all:
 *   get:
 *     summary: Get all menu items without pagination
 *     description: |
 *       Retrieve all menu items without pagination limits.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Returns all menu items in a single response for admin, shop, and menu pages.
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: All menu items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Grilled Salmon"
 *                           description:
 *                             type: string
 *                             example: "Fresh Atlantic salmon grilled to perfection"
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 24.99
 *                           category:
 *                             type: string
 *                             example: "Main Course"
 *                           imageUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/salmon.jpg"
 *                           isAvailable:
 *                             type: boolean
 *                             example: true
 *                     total:
 *                       type: integer
 *                       example: 154
 *       500:
 *         description: Server error
 */
router.get('/all', getAllMenuItemsNoPagination);

router.get('/', getAllMenuItems);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     description: |
 *       Retrieve a single menu item with full details including inventory information.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes inventory details and related data.
 *     tags: [Menu]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Menu item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     item:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Grilled Salmon"
 *                         description:
 *                           type: string
 *                           example: "Fresh Atlantic salmon grilled to perfection"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 24.99
 *                         category:
 *                           type: string
 *                           example: "Main Course"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/salmon.jpg"
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         inventory:
 *                           type: object
 *                           properties:
 *                             quantity:
 *                               type: integer
 *                               example: 15
 *                             minThreshold:
 *                               type: integer
 *                               example: 5
 *                             supplier:
 *                               type: string
 *                               example: "Ocean Fresh Seafood"
 *                             lastRestocked:
 *                               type: string
 *                               format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid menu item ID
 *       404:
 *         description: Menu item not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getMenuItemById);

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Create menu item
 *     description: |
 *       Create a new menu item with pricing, category, and availability settings.
 *
 *       **Access Control:** Admin users only
 *
 *       Supports image URLs, category classification, and availability management.
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Grilled Salmon"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Fresh Atlantic salmon grilled to perfection"
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 24.99
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Main Course"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/salmon.jpg"
 *               isAvailable:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Menu item created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     item:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Grilled Salmon"
 *                         description:
 *                           type: string
 *                           example: "Fresh Atlantic salmon grilled to perfection"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 24.99
 *                         category:
 *                           type: string
 *                           example: "Main Course"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/salmon.jpg"
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid menu item data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Menu item with this name already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Update menu item
 *     description: |
 *       Update an existing menu item with partial data.
 *
 *       **Access Control:** Admin users only
 *
 *       All fields are optional. Name uniqueness is validated if provided.
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Herb-Crusted Salmon"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Fresh Atlantic salmon with herb crust"
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 26.99
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Main Course"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/herb-salmon.jpg"
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Menu item updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     item:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Herb-Crusted Salmon"
 *                         description:
 *                           type: string
 *                           example: "Fresh Atlantic salmon with herb crust"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 26.99
 *                         category:
 *                           type: string
 *                           example: "Main Course"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/herb-salmon.jpg"
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or menu item ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Menu item not found
 *       409:
 *         description: Name conflict with another menu item
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateMenuItem);

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Delete menu item
 *     description: |
 *       Remove a menu item permanently.
 *
 *       **Access Control:** Admin users only
 *
 *       Cannot delete items that have been ordered. Consider marking as unavailable instead.
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu item ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Menu item deleted successfully"
 *       400:
 *         description: Invalid menu item ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Menu item not found
 *       409:
 *         description: Cannot delete item that has been ordered
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteMenuItem);

/**
 * @swagger
 * /api/menu/{id}/price:
 *   patch:
 *     summary: Update menu item price
 *     description: |
 *       Update price with history tracking and real-time broadcast.
 *
 *       **Access Control:** Admin only
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *             properties:
 *               price:
 *                 type: number
 *                 example: 29.99
 *               reason:
 *                 type: string
 *                 example: "Seasonal price adjustment"
 *     responses:
 *       200:
 *         description: Price updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.patch('/:id/price', authenticate, requireAdmin, updateMenuPrice);

/**
 * @swagger
 * /api/menu/{id}/availability:
 *   patch:
 *     summary: Toggle menu item availability
 *     description: |
 *       Toggle availability with real-time broadcast.
 *
 *       **Access Control:** Admin only
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.patch('/:id/availability', authenticate, requireAdmin, toggleMenuAvailability);

/**
 * @swagger
 * /api/menu/{id}/price-history:
 *   get:
 *     summary: Get price history
 *     description: |
 *       Get price change history for a menu item.
 *
 *       **Access Control:** Admin only
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Price history retrieved
 *       400:
 *         description: Invalid menu item ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/:id/price-history', authenticate, requireAdmin, getMenuPriceHistory);

/**
 * @swagger
 * /api/menu/bulk/update-prices:
 *   post:
 *     summary: Bulk update menu prices
 *     description: |
 *       Update multiple menu item prices at once.
 *
 *       **Access Control:** Admin only
 *     tags: [Menu]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menuId:
 *                       type: integer
 *                     newPrice:
 *                       type: number
 *                     reason:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk update completed
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.post('/bulk/update-prices', authenticate, requireAdmin, bulkUpdatePrices);

export default router;


/**
 * @swagger
 * /api/menu/categories:
 *   get:
 *     summary: Get all menu categories
 *     description: |
 *       Retrieve all active menu categories with their details.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Returns categories ordered by sortOrder.
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "Quick Bites - Vegetarian"
 *                           type:
 *                             type: string
 *                             example: "Vegetarian"
 *                           description:
 *                             type: string
 *                             example: "Irresistibly crisp, boldly spiced..."
 *                           imageUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/category.jpg"
 *                           sortOrder:
 *                             type: integer
 *                             example: 1
 *       500:
 *         description: Server error
 */
router.get('/categories', getCategories);
