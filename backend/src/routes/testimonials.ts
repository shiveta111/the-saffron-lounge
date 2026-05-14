import express, { Router } from 'express';
import {
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../controllers/testimonialsController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { uploadTestimonialPhoto } from '../utils/upload';

const router: Router = express.Router();

/**
 * @swagger
 * /api/testimonials:
 *   get:
 *     summary: Get all testimonials
 *     description: |
 *       Retrieve a paginated list of all testimonials with optional filtering.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports filtering by rating and customizable sorting.
 *     tags: [Testimonials]
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
 *         description: Number of testimonials per page
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, rating, client_name]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: rating_filter
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating (1-5)
 *     responses:
 *       200:
 *         description: Testimonials retrieved successfully
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
 *                     testimonials:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           client_name:
 *                             type: string
 *                             example: "John Smith"
 *                           designation:
 *                             type: string
 *                             example: "CEO"
 *                           feedback:
 *                             type: string
 *                             example: "Excellent service and amazing food!"
 *                           rating:
 *                             type: integer
 *                             minimum: 1
 *                             maximum: 5
 *                             example: 5
 *                           photo:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/john-smith.jpg"
 *                           company:
 *                             type: string
 *                             example: "Tech Corp"
 *                           date_given:
 *                             type: string
 *                             format: date-time
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
router.get('/', getAllTestimonials);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   get:
 *     summary: Get testimonial by ID
 *     description: |
 *       Retrieve a single testimonial with full details.
 *
 *       **Access Control:** Public (no authentication required)
 *     tags: [Testimonials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Testimonial ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Testimonial retrieved successfully
 *       400:
 *         description: Invalid testimonial ID
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getTestimonialById);

/**
 * @swagger
 * /api/testimonials:
 *   post:
 *     summary: Create testimonial
 *     description: |
 *       Add a new testimonial with client feedback and rating.
 *
 *       **Access Control:** Admin users only
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_name
 *               - feedback
 *             properties:
 *               client_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "John Smith"
 *               designation:
 *                 type: string
 *                 maxLength: 100
 *                 example: "CEO"
 *               feedback:
 *                 type: string
 *                 minLength: 1
 *                 example: "Excellent service and amazing food!"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/john-smith.jpg"
 *               company:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Tech Corp"
 *               date_given:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:30:00.000Z"
 *     responses:
 *       201:
 *         description: Testimonial created successfully
 *       400:
 *         description: Invalid testimonial data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, uploadTestimonialPhoto.single('photo'), createTestimonial);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   put:
 *     summary: Update testimonial
 *     description: |
 *       Update an existing testimonial.
 *
 *       **Access Control:** Admin users only
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Testimonial ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client_name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Jane Smith"
 *               designation:
 *                 type: string
 *                 maxLength: 100
 *                 example: "CTO"
 *               feedback:
 *                 type: string
 *                 minLength: 1
 *                 example: "Updated feedback with more details"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/jane-smith.jpg"
 *               company:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Tech Solutions Inc"
 *               date_given:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-01T14:20:00.000Z"
 *     responses:
 *       200:
 *         description: Testimonial updated successfully
 *       400:
 *         description: Invalid data or testimonial ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, uploadTestimonialPhoto.single('photo'), updateTestimonial);

/**
 * @swagger
 * /api/testimonials/{id}:
 *   delete:
 *     summary: Delete testimonial
 *     description: |
 *       Remove a testimonial from the system.
 *
 *       **Access Control:** Admin users only
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Testimonial ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Testimonial deleted successfully
 *       400:
 *         description: Invalid testimonial ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Testimonial not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteTestimonial);

export default router;