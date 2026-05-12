import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadMedia } from '../utils/mediaUpload';
import { uploadMedia as uploadMediaController, getAllMedia, deleteMedia } from '../controllers/mediaController';

const router = express.Router();

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload media file to Cloudinary
 *     description: Upload an image file to Cloudinary and create a media record in the database
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, GIF, WebP - Max 5MB)
 *     responses:
 *       200:
 *         description: Media uploaded successfully
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
 *                   example: Media uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                     mimetype:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: No file provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.post('/upload', authenticate, requireAdmin, uploadMedia.single('file'), uploadMediaController);

/**
 * @swagger
 * /api/v1/media:
 *   get:
 *     summary: Get all media with pagination
 *     description: Retrieve paginated list of media files with optional search
 *     tags: [Media]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter media by name
 *     responses:
 *       200:
 *         description: Media list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */
router.get('/', getAllMedia);

/**
 * @swagger
 * /api/v1/media/{id}:
 *   delete:
 *     summary: Delete media file
 *     description: Delete a media file from storage and database
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Media ID
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       404:
 *         description: Media not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete('/:id', authenticate, requireAdmin, deleteMedia);

export default router;
