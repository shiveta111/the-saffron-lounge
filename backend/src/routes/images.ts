import express, { Router } from 'express';
import { serveUploadedImage } from '../controllers/imageController';

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/images/{folder}/{filename}:
 *   get:
 *     summary: Serve uploaded images
 *     description: Serves uploaded product, menu, blog, team, and testimonial images
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: folder
 *         required: true
 *         schema:
 *           type: string
 *           enum: [products, menu-items, blogs, team, testimonials]
 *         description: Image folder/category
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Image filename
 *     responses:
 *       200:
 *         description: Image file
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *       400:
 *         description: Invalid folder
 */
router.get('/:folder/:filename', serveUploadedImage);

export default router;
