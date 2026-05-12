import express, { Router } from 'express';
import {
  getAllBlogs,
  getBlogBySlug,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { uploadBlogImage } from '../utils/upload';

const router: Router = express.Router();

/**
 * @swagger
 * /api/blog:
 *   get:
 *     summary: Get all blog posts
 *     description: |
 *       Retrieve a paginated list of all blog posts with optional filtering and search.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports search across title, content, and tags, with customizable sorting and pagination.
 *     tags: [Blog]
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
 *         description: Number of posts per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter posts by title, content, or tags
 *         example: "restaurant"
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, title]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Blog posts retrieved successfully
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
 *                     blogs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "The Art of Fine Dining"
 *                           slug:
 *                             type: string
 *                             example: "art-of-fine-dining"
 *                           content:
 *                             type: string
 *                             example: "Fine dining is more than just eating..."
 *                           featured_image:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/blog-image.jpg"
 *                           tags:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["dining", "food", "restaurant"]
 *                           published_status:
 *                             type: boolean
 *                             example: true
 *                           meta_title:
 *                             type: string
 *                             example: "The Art of Fine Dining | Restaurant Blog"
 *                           meta_description:
 *                             type: string
 *                             example: "Discover the secrets of fine dining..."
 *                           author:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               username:
 *                                 type: string
 *                                 example: "chef_mario"
 *                               email:
 *                                 type: string
 *                                 example: "mario@restaurant.com"
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
 *                           example: 25
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllBlogs);

/**
 * @swagger
 * /api/blog/slug/{slug}:
 *   get:
 *     summary: Get blog post by slug
 *     description: Retrieve a single blog post with full details and related posts by slug.
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Blog post slug
 *         example: art-of-fine-dining
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Server error
 */
router.get('/slug/:slug', getBlogBySlug);

/**
 * @swagger
 * /api/blog/{id}:
 *   get:
 *     summary: Get blog post by ID
 *     description: |
 *       Retrieve a single blog post with full details and related posts.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes author information and related posts based on tags.
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog post ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
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
 *                     blog:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         title:
 *                           type: string
 *                           example: "The Art of Fine Dining"
 *                         slug:
 *                           type: string
 *                           example: "art-of-fine-dining"
 *                         content:
 *                           type: string
 *                           example: "Fine dining is more than just eating..."
 *                         featured_image:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/blog-image.jpg"
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["dining", "food", "restaurant"]
 *                         published_status:
 *                           type: boolean
 *                           example: true
 *                         meta_title:
 *                           type: string
 *                           example: "The Art of Fine Dining | Restaurant Blog"
 *                         meta_description:
 *                           type: string
 *                           example: "Discover the secrets of fine dining..."
 *                         author:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             username:
 *                               type: string
 *                               example: "chef_mario"
 *                             email:
 *                               type: string
 *                               example: "mario@restaurant.com"
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *                     relatedPosts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           title:
 *                             type: string
 *                             example: "Wine Pairing Guide"
 *                           slug:
 *                             type: string
 *                             example: "wine-pairing-guide"
 *                           featured_image:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/wine-image.jpg"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid blog ID
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getBlogById);

/**
 * @swagger
 * /api/blog:
 *   post:
 *     summary: Create blog post
 *     description: |
 *       Create a new blog post with SEO metadata and tags.
 *
 *       **Access Control:** Authenticated users only
 *
 *       Supports rich content, SEO optimization, and tag-based categorization.
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "The Art of Fine Dining"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "art-of-fine-dining"
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 example: "Fine dining is more than just eating..."
 *               featured_image:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/blog-image.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["dining", "food", "restaurant"]
 *               published_status:
 *                 type: boolean
 *                 default: false
 *                 example: true
 *               meta_title:
 *                 type: string
 *                 maxLength: 60
 *                 example: "The Art of Fine Dining | Restaurant Blog"
 *               meta_description:
 *                 type: string
 *                 maxLength: 160
 *                 example: "Discover the secrets of fine dining..."
 *               author_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Blog post created successfully
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
 *                   example: "Blog post created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     blog:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         title:
 *                           type: string
 *                           example: "The Art of Fine Dining"
 *                         slug:
 *                           type: string
 *                           example: "art-of-fine-dining"
 *                         content:
 *                           type: string
 *                           example: "Fine dining is more than just eating..."
 *                         featured_image:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/blog-image.jpg"
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["dining", "food", "restaurant"]
 *                         published_status:
 *                           type: boolean
 *                           example: true
 *                         meta_title:
 *                           type: string
 *                           example: "The Art of Fine Dining | Restaurant Blog"
 *                         meta_description:
 *                           type: string
 *                           example: "Discover the secrets of fine dining..."
 *                         author:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             username:
 *                               type: string
 *                               example: "chef_mario"
 *                             email:
 *                               type: string
 *                               example: "mario@restaurant.com"
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid blog data
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Slug already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, uploadBlogImage.single('featuredImage'), createBlog);

/**
 * @swagger
 * /api/blog/{id}:
 *   put:
 *     summary: Update blog post
 *     description: |
 *       Update an existing blog post with partial data.
 *
 *       **Access Control:** Authenticated users only
 *
 *       All fields are optional. Slug uniqueness is validated if provided.
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog post ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Updated: The Art of Fine Dining"
 *               slug:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "updated-art-of-fine-dining"
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 example: "Updated content..."
 *               featured_image:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/updated-blog-image.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["dining", "food", "restaurant", "updated"]
 *               published_status:
 *                 type: boolean
 *                 example: true
 *               meta_title:
 *                 type: string
 *                 maxLength: 60
 *                 example: "Updated: The Art of Fine Dining | Restaurant Blog"
 *               meta_description:
 *                 type: string
 *                 maxLength: 160
 *                 example: "Updated description of fine dining..."
 *               author_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Blog post updated successfully
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
 *                   example: "Blog post updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     blog:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         title:
 *                           type: string
 *                           example: "Updated: The Art of Fine Dining"
 *                         slug:
 *                           type: string
 *                           example: "updated-art-of-fine-dining"
 *                         content:
 *                           type: string
 *                           example: "Updated content..."
 *                         featured_image:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/updated-blog-image.jpg"
 *                         tags:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["dining", "food", "restaurant", "updated"]
 *                         published_status:
 *                           type: boolean
 *                           example: true
 *                         meta_title:
 *                           type: string
 *                           example: "Updated: The Art of Fine Dining | Restaurant Blog"
 *                         meta_description:
 *                           type: string
 *                           example: "Updated description of fine dining..."
 *                         author:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 2
 *                             username:
 *                               type: string
 *                               example: "chef_luigi"
 *                             email:
 *                               type: string
 *                               example: "luigi@restaurant.com"
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or blog ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Blog post not found
 *       409:
 *         description: Slug conflict
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, uploadBlogImage.single('featuredImage'), updateBlog);

/**
 * @swagger
 * /api/blog/{id}:
 *   delete:
 *     summary: Delete blog post
 *     description: |
 *       Remove a blog post permanently.
 *
 *       **Access Control:** Admin users only
 *
 *       Permanently deletes the blog post and all associated data.
 *     tags: [Blog]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Blog post ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Blog post deleted successfully
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
 *                   example: "Blog post deleted successfully"
 *       400:
 *         description: Invalid blog ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Blog post not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteBlog);

export default router;