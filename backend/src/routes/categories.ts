import express, { Router } from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoriesController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all menu categories
 *     description: |
 *       Retrieve a paginated list of all menu categories with optional filtering.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports filtering by active status, search, and customizable sorting.
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of categories per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter categories by name
 *         example: "Pizza"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, createdAt, sortOrder]
 *           default: sortOrder
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
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
 *                             example: "Main Course"
 *                           description:
 *                             type: string
 *                             example: "Our signature main dishes"
 *                           imageUrl:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/main-course.jpg"
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           sortOrder:
 *                             type: integer
 *                             example: 1
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           _count:
 *                             type: object
 *                             properties:
 *                               products:
 *                                 type: integer
 *                                 example: 5
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 10
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *                         hasNext:
 *                           type: boolean
 *                           example: false
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: |
 *       Retrieve detailed information about a specific menu category.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes category details and associated products count.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Category retrieved successfully
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
 *                     category:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Main Course"
 *                         description:
 *                           type: string
 *                           example: "Our signature main dishes"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/main-course.jpg"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         sortOrder:
 *                           type: integer
 *                           example: 1
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "Margherita Pizza"
 *                               price:
 *                                 type: number
 *                                 format: float
 *                                 example: 12.99
 *                               isAvailable:
 *                                 type: boolean
 *                                 example: true
 *                         _count:
 *                           type: object
 *                           properties:
 *                             products:
 *                               type: integer
 *                               example: 5
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getCategoryById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create menu category
 *     description: |
 *     tags: [Categories]
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
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Main Course"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Our signature main dishes"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/main-course.jpg"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 example: 1
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *                   example: "Category created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Main Course"
 *                         description:
 *                           type: string
 *                           example: "Our signature main dishes"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/main-course.jpg"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         sortOrder:
 *                           type: integer
 *                           example: 1
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid category data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Category name already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update menu category
 *     description: |
 *       Update an existing menu category with partial data.
 *
 *       **Access Control:** Admin users only
 *
 *       All fields are optional. Name uniqueness is validated if provided.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
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
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Signature Dishes"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Updated description for main dishes"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/updated-main-course.jpg"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *     responses:
 *       200:
 *         description: Category updated successfully
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
 *                   example: "Category updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "Signature Dishes"
 *                         description:
 *                           type: string
 *                           example: "Updated description for main dishes"
 *                         imageUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/updated-main-course.jpg"
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         sortOrder:
 *                           type: integer
 *                           example: 2
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or category ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Category not found
 *       409:
 *         description: Name conflict
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete menu category
 *     description: |
 *       Remove a menu category from the system.
 *
 *       **Access Control:** Admin users only
 *
 *       Cannot delete categories that contain products. Consider deactivating instead.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *                   example: "Category deleted successfully"
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Category not found
 *       409:
 *         description: Cannot delete category with products
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;