import express, { Router } from 'express';
import {
  getAllFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ
} from '../controllers/faqController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /faq:
 *   get:
 *     summary: Get all FAQs
 *     description: Retrieve a paginated list of frequently asked questions
 *     tags: [FAQ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllFAQs);

/**
 * @swagger
 * /faq/{id}:
 *   get:
 *     summary: Get FAQ by ID
 *     description: Retrieve a specific FAQ by its ID
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: FAQ retrieved successfully
 *       400:
 *         description: Invalid FAQ ID
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getFAQById);

/**
 * @swagger
 * /faq:
 *   post:
 *     summary: Create a new FAQ
 *     description: Create a new frequently asked question entry
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *               - category
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: FAQ created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', createFAQ);

/**
 * @swagger
 * /faq/{id}:
 *   put:
 *     summary: Update FAQ
 *     description: Update an existing FAQ entry
 *     tags: [FAQ]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.put('/:id', updateFAQ);

/**
 * @swagger
 * /faq/{id}:
 *   delete:
 *     summary: Delete FAQ
 *     description: Delete an existing FAQ entry
 *     tags: [FAQ]
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
 *         description: FAQ deleted successfully
 *       400:
 *         description: Invalid FAQ ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: FAQ not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', deleteFAQ);

export default router;