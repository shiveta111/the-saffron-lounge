import express, { Router, Request, Response } from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productsController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { productSchemas } from '../validators/schemas';

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
 *         default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
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
 *                             example: "Margherita Pizza"
 *                           description:
 *                             type: string
 *                             example: "Classic pizza with tomato sauce and mozzarella"
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 12.99
 *                           category:
 *                             type: string
 *                             example: "Pizza"
 *                           imageUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/pizza.jpg"
 *                           isAvailable:
 *                             type: boolean
 *                             example: true
 *                           inventory:
 *                             type: object
 *                             properties:
 *                               quantity:
 *                                 type: integer
 *                                 example: 50
 *                               minThreshold:
 *                                 type: integer
 *                                 example: 10
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid query parameters"
 *                 details:
 *                   type: string
 *                   example: "limit must be a number"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve menu items"
 */
// Public endpoint - anyone can view products
// Temporarily removed query validation to debug 400 error - will add back after fixing
router.get('/', getProducts);

// Get product by slug - must come before /:id route to avoid conflicts
router.get('/by-slug/:slug', getProductBySlug);

/**
 * @swagger
 * /api/menu/{id}:
 *   get:
 *     summary: Get menu item by ID
 *     description: |
 *       Retrieve detailed information about a specific menu item.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes inventory information and full item details.
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
 *                           example: "Margherita Pizza"
 *                         description:
 *                           type: string
 *                           example: "Classic pizza with tomato sauce and mozzarella"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 12.99
 *                         category:
 *                           type: string
 *                           example: "Pizza"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/pizza.jpg"
 *                         isAvailable:
 *                           type: boolean
 *                           example: true
 *                         inventory:
 *                           type: object
 *                           properties:
 *                             quantity:
 *                               type: integer
 *                               example: 50
 *                             minThreshold:
 *                               type: integer
 *                               example: 10
 *                             supplier:
 *                               type: string
 *                               example: "Local Farm"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid menu item ID"
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Menu item not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to retrieve menu item"
 */
// Public endpoint - anyone can view a single product
router.get('/:id', validate(productSchemas.id, 'params'), getProductById);

/**
 * @swagger
 * /api/menu:
 *   post:
 *     summary: Create a new menu item
 *     description: |
 *       Add a new item to the menu.
 *
 *       **Access Control:** Admin users only
 *
 *       Requires authentication with admin role.
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
 *                 example: "Margherita Pizza"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Classic pizza with tomato sauce and mozzarella"
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 12.99
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Pizza"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/pizza.jpg"
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
 *                           example: "Margherita Pizza"
 *                         description:
 *                           type: string
 *                           example: "Classic pizza with tomato sauce and mozzarella"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 12.99
 *                         category:
 *                           type: string
 *                           example: "Pizza"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/pizza.jpg"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid menu item data"
 *                 details:
 *                   type: string
 *                   example: "name is required"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Insufficient permissions"
 *       409:
 *         description: Menu item name already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Menu item with this name already exists"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to create menu item"
 *
 */
router.post('/', authenticate, requireAdmin, validate(productSchemas.create), createProduct);

/**
 * @swagger
 * /api/menu/{id}:
 *   put:
 *     summary: Update menu item
 *     description: |
 *       Update an existing menu item.
 *
 *       **Access Control:** Admin users only
 *
 *       Requires authentication with admin role. All fields are optional.
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
 *                 example: "Updated Pizza Name"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Updated description"
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 14.99
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: "Specialty Pizza"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/updated-pizza.jpg"
 *               isAvailable:
 *                 type: boolean
 *                 example: false
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
 *                           example: "Updated Pizza Name"
 *                         description:
 *                           type: string
 *                           example: "Updated description"
 *                         price:
 *                           type: number
 *                           format: float
 *                           example: 14.99
 *                         category:
 *                           type: string
 *                           example: "Specialty Pizza"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/updated-pizza.jpg"
 *                         isAvailable:
 *                           type: boolean
 *                           example: false
 *                         inventory:
 *                           type: object
 *                           properties:
 *                             quantity:
 *                               type: integer
 *                               example: 50
 *                             minThreshold:
 *                               type: integer
 *                               example: 10
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid menu item ID"
 *                 details:
 *                   type: string
 *                   example: "price must be a positive number"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Menu item not found"
 *       409:
 *         description: Name conflict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Another menu item with this name already exists"
 *       500:
 *         description: Server error
 *     
 */
router.put('/:id', authenticate, requireAdmin, validate(productSchemas.id, 'params'), validate(productSchemas.update), updateProduct);

/**
 * @swagger
 * /api/menu/{id}:
 *   delete:
 *     summary: Delete menu item
 *     description: |
 *       Remove a menu item from the system.
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid menu item ID"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Menu item not found"
 *       409:
 *         description: Cannot delete ordered item
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Cannot delete menu item that has been ordered. Consider marking it as unavailable instead."
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to delete menu item"
 */
router.delete('/:id', authenticate, requireAdmin, validate(productSchemas.id, 'params'), deleteProduct);

export default router;