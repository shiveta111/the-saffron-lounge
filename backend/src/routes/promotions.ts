import express, { Router } from 'express';
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validateDiscount,
  getActivePromotions,
  getExpiredPromotions,
  toggleActive,
  uploadBannerHandler,
  uploadBanner,
  validateCartPromotions,
  getPromotionSettings,
  togglePromotionsGlobally,
} from '../controllers/promotionsController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     summary: Get all promotions
 *     description: |
 *       Retrieve a paginated list of all promotions with optional filtering.
 *
 *       **Access Control:** Public (no authentication required for viewing)
 *
 *       Supports filtering by active status.
 *     tags: [Promotions]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 20
 *         description: Number of promotions per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         default: 0
 *         description: Number of promotions to skip
 *     responses:
 *       200:
 *         description: Promotions retrieved successfully
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
 *                     promotions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           code:
 *                             type: string
 *                             example: "SAVE20"
 *                           discountType:
 *                             type: string
 *                             enum: [PERCENTAGE, FIXED]
 *                             example: "PERCENTAGE"
 *                           discountValue:
 *                             type: number
 *                             format: float
 *                             example: 20
 *                           validFrom:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-01T00:00:00.000Z"
 *                           validTo:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-12-31T23:59:59.000Z"
 *                           applicableItems:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 1
 *                                 name:
 *                                   type: string
 *                                   example: "Margherita Pizza"
 *                                 price:
 *                                   type: number
 *                                   format: float
 *                                   example: 12.99
 *                           usageLimit:
 *                             type: integer
 *                             example: 100
 *                           usedCount:
 *                             type: integer
 *                             example: 15
 *                           isActive:
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
 *                           example: 5
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllPromotions);

/**
 * @swagger
 * /api/promotions/active:
 *   get:
 *     summary: Get active promotions (customer-facing)
 *     description: |
 *       Retrieve all currently active promotions for display to customers.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Returns promotions that are:
 *       - Currently active (isActive = true)
 *       - Within their validity period (validFrom <= now <= validTo)
 *       - Enabled globally (if promotions are disabled globally, returns empty array)
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: Active promotions retrieved successfully
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
 *                     promotions:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Server error
 */
router.get('/active', getActivePromotions);

/**
 * @swagger
 * /api/promotions/expired:
 *   get:
 *     summary: Get expired promotions (admin)
 *     description: Retrieve all expired or inactive promotions for admin review
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired promotions retrieved successfully
 */
router.get('/expired', authenticate, requireAdmin, getExpiredPromotions);

/**
 * @swagger
 * /api/promotions/settings:
 *   get:
 *     summary: Get promotion settings
 *     description: Check if promotions are enabled globally
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
router.get('/settings', getPromotionSettings);

/**
 * @swagger
 * /api/promotions/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     description: |
 *       Retrieve detailed information about a specific promotion.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes applicable items and usage statistics.
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Promotion retrieved successfully
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
 *                     promotion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         code:
 *                           type: string
 *                           example: "SAVE20"
 *                         discountType:
 *                           type: string
 *                           enum: [PERCENTAGE, FIXED]
 *                           example: "PERCENTAGE"
 *                         discountValue:
 *                           type: number
 *                           format: float
 *                           example: 20
 *                         validFrom:
 *                           type: string
 *                           format: date-time
 *                         validTo:
 *                           type: string
 *                           format: date-time
 *                         applicableItems:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                                 format: float
 *                         usageLimit:
 *                           type: integer
 *                           example: 100
 *                         usedCount:
 *                           type: integer
 *                           example: 15
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid promotion ID
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getPromotionById);

/**
 * @swagger
 * /api/promotions:
 *   post:
 *     summary: Create a new promotion
 *     description: |
 *       Add a new promotional discount code.
 *
 *       **Access Control:** Admin users only
 *
 *       Creates percentage or fixed amount discounts with optional item restrictions and usage limits.
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *               - validFrom
 *               - validTo
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 example: "SAVE20"
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *                 example: "PERCENTAGE"
 *               discountValue:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Percentage (0-100) or fixed amount
 *                 example: 20
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-01T00:00:00.000Z"
 *               validTo:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T23:59:59.000Z"
 *               applicableItems:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Product IDs this promotion applies to (empty = all products)
 *                 example: [1, 2, 3]
 *               usageLimit:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of times this promotion can be used
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Promotion created successfully
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
 *                   example: "Promotion created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         code:
 *                           type: string
 *                           example: "SAVE20"
 *                         discountType:
 *                           type: string
 *                           example: "PERCENTAGE"
 *                         discountValue:
 *                           type: number
 *                           example: 20
 *                         validFrom:
 *                           type: string
 *                           format: date-time
 *                         validTo:
 *                           type: string
 *                           format: date-time
 *                         applicableItems:
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
 *                         usageLimit:
 *                           type: integer
 *                           example: 100
 *                         usedCount:
 *                           type: integer
 *                           example: 0
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid promotion data or dates
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
 *                   example: "Valid to date must be after valid from date"
 *                 details:
 *                   type: string
 *                   example: "code is required"
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Promotion code already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createPromotion);

/**
 * @swagger
 * /api/promotions/{id}:
 *   put:
 *     summary: Update promotion
 *     description: |
 *       Update an existing promotion.
 *
 *       **Access Control:** Admin users only
 *
 *       All fields are optional. Use carefully as changes affect existing usage.
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 example: "NEWCODE"
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *                 example: "FIXED"
 *               discountValue:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 example: 5.00
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-02-01T00:00:00.000Z"
 *               validTo:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T23:59:59.000Z"
 *               applicableItems:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3, 4]
 *               usageLimit:
 *                 type: integer
 *                 minimum: 1
 *                 example: 50
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Promotion updated successfully
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
 *                   example: "Promotion updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         code:
 *                           type: string
 *                           example: "NEWCODE"
 *                         discountType:
 *                           type: string
 *                           example: "FIXED"
 *                         discountValue:
 *                           type: number
 *                           example: 5.00
 *                         validFrom:
 *                           type: string
 *                           format: date-time
 *                         validTo:
 *                           type: string
 *                           format: date-time
 *                         applicableItems:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                         usageLimit:
 *                           type: integer
 *                           example: 50
 *                         usedCount:
 *                           type: integer
 *                           example: 15
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or dates
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Promotion not found
 *       409:
 *         description: Code conflict
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updatePromotion);

/**
 * @swagger
 * /api/promotions/{id}:
 *   delete:
 *     summary: Delete promotion
 *     description: |
 *       Remove a promotion from the system.
 *
 *       **Access Control:** Admin users only
 *
 *       Permanently deletes the promotion. Use with caution.
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Promotion ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Promotion deleted successfully
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
 *                   example: "Promotion deleted successfully"
 *       400:
 *         description: Invalid promotion ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Promotion not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deletePromotion);

/**
 * @swagger
 * /api/promotions/validate:
 *   post:
 *     summary: Validate discount code
 *     description: |
 *       Validate a discount code for checkout.
 *
 *       **Access Control:** Authenticated users
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - orderTotal
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SAVE20"
 *               orderTotal:
 *                 type: number
 *                 example: 50.00
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Discount validated successfully
 *       400:
 *         description: Invalid or inapplicable discount code
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
// Allow coupon validation without authentication (for guest users)
router.post('/validate', validateDiscount);

/**
 * @swagger
 * /api/promotions/{id}/toggle:
 *   patch:
 *     summary: Toggle promotion active status
 *     description: Activate or deactivate a promotion
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Promotion status toggled successfully
 */
router.patch('/:id/toggle', authenticate, requireAdmin, toggleActive);

/**
 * @swagger
 * /api/promotions/{id}/banner:
 *   post:
 *     summary: Upload promotion banner image
 *     description: Upload a banner image for a promotion
 *     tags: [Promotions]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 */
router.post('/:id/banner', authenticate, requireAdmin, uploadBanner.single('banner'), uploadBannerHandler);

/**
 * @swagger
 * /api/promotions/validate-cart:
 *   post:
 *     summary: Validate cart promotions
 *     description: Get applicable promotions for a cart and calculate best discount
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cartId
 *             properties:
 *               cartId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cart promotions validated successfully
 */
router.post('/validate-cart', authenticate, validateCartPromotions);

/**
 * @swagger
 * /api/promotions/settings/toggle:
 *   patch:
 *     summary: Toggle promotions globally
 *     description: Enable or disable promotions site-wide (admin only)
 *     tags: [Promotions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Promotions toggled successfully
 */
router.patch('/settings/toggle', authenticate, requireAdmin, togglePromotionsGlobally);

export default router;