import express from 'express';
import { translateText, translateBatch } from '../controllers/translateController';

const router = express.Router();

/**
 * @route   POST /api/translate
 * @desc    Translate text
 * @access  Public
 */
router.post('/', translateText);

/**
 * @route   POST /api/translate/batch
 * @desc    Translate multiple texts at once
 * @access  Public
 */
router.post('/batch', translateBatch);

export default router;
