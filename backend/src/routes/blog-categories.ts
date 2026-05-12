import express, { Router } from 'express';
import {
  getAllBlogCategories,
  getBlogCategoryById,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '../controllers/blogCategoryController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/blog-categories:
 *   get:
 *     summary: Get all blog categories
 *     description: |
 *       Retrieve a paginated list of all blog categories with optional filtering and search.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports search across name, description, and slug, with customizable sorting and pagination.
 *     tags: [Blog Categories]
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
 *         description: Search term to filter categories by name, description, or slug
 *         example: "food"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, sortOrder, created_at]
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
 *         description: Blog categories retrieved successfully
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
 *                             example: "Food & Dining"
 *                           slug:
 *                             type: string
 *                             example: "food-dining"
 *                           description:
 *                             type: string
 *                             example: "Articles about food and dining experiences"
 *                           color:
 *                             type: string
 *                             example: "#F36B24"
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           sortOrder:
 *                             type: integer
 *                             example: 1
 *                           blogCount:
 *                             type: integer
 *                             example: 5
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
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
router.get('/', getAllBlogCategories);

/**
 * @swagger
 * /api/blog-categories/{id}:
 *   get:
 *     summary: Get blog category by ID
 *     description: |
 *       Retrieve a single blog category with full details and blog count.
 *
 *       **Access Control:** Public (no authentication required)
 *     tags: [Blog Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog category ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Blog category retrieved successfully
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Blog category not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getBlogCategoryById);

/**
 * @swagger
 * /api/blog-categories:
 *   post:
 *     summary: Create blog category
 *     description: |
 *       Create a new blog category with name, slug, description, and optional color.
 *
 *       **Access Control:** Admin users only
 *
 *       Slug will be auto-generated from name if not provided.
 *     tags: [Blog Categories]
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
 *                 example: "Food & Dining"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "food-dining"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Articles about food and dining experiences"
 *               color:
 *                 type: string
 *                 maxLength: 20
 *                 example: "#F36B24"
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
 *         description: Blog category created successfully
 *       400:
 *         description: Invalid category data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Category name or slug already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createBlogCategory);

/**
 * @swagger
 * /api/blog-categories/{id}:
 *   put:
 *     summary: Update blog category
 *     description: |
 *       Update an existing blog category with partial data.
 *
 *       **Access Control:** Admin users only
 *
 *       All fields are optional. Slug and name uniqueness is validated if provided.
 *     tags: [Blog Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog category ID
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
 *                 example: "Updated Food & Dining"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "updated-food-dining"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Updated description"
 *               color:
 *                 type: string
 *                 maxLength: 20
 *                 example: "#FF5733"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               sortOrder:
 *                 type: integer
 *                 minimum: 0
 *                 example: 2
 *     responses:
 *       200:
 *         description: Blog category updated successfully
 *       400:
 *         description: Invalid data or category ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Blog category not found
 *       409:
 *         description: Name or slug conflict
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateBlogCategory);

/**
 * @swagger
 * /api/blog-categories/{id}:
 *   delete:
 *     summary: Delete blog category
 *     description: |
 *       Remove a blog category permanently.
 *
 *       **Access Control:** Admin users only
 *
 *       Cannot delete category if it is being used by any blog posts.
 *     tags: [Blog Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog category ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Blog category deleted successfully
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Blog category not found
 *       409:
 *         description: Category is in use by blog posts
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteBlogCategory);

export default router;



















