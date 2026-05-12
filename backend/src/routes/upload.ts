import express from 'express';
import { uploadMenuImage, uploadProductImage } from '../utils/upload';
import { uploadMenuItemImage, uploadProductImage as uploadProductImageController } from '../controllers/uploadController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/upload/menu-image
 * @desc    Upload menu item image
 * @access  Admin only
 */
router.post('/menu-image', authenticate, requireAdmin, uploadMenuImage.single('image'), uploadMenuItemImage);

/**
 * @route   POST /api/upload/product-image
 * @desc    Upload product image
 * @access  Admin only
 */
router.post('/product-image', authenticate, requireAdmin, uploadProductImage.single('image'), uploadProductImageController);

export default router;
