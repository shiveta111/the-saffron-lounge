import express, { Router } from 'express';
import {
  getAllContacts,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: Get all contact submissions
 *     description: |
 *       Retrieve a paginated list of all contact form submissions.
 *
 *       **Access Control:** Admin users only
 *
 *       Supports filtering by status and customizable sorting.
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of submissions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, replied]
 *         description: Filter by submission status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, name, email]
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
 *         description: Contact submissions retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, requireAdmin, getAllContacts);

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit contact form
 *     description: |
 *       Submit a new contact form with message and contact details.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Creates a new contact submission that can be viewed by administrators.
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               subject:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 example: "Inquiry about catering services"
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 example: "I would like to inquire about your catering services for an event..."
 *     responses:
 *       201:
 *         description: Contact form submitted successfully
 *       400:
 *         description: Invalid contact data
 *       500:
 *         description: Server error
 */
router.post('/', createContact);

/**
 * @swagger
 * /api/contact/{id}:
 *   put:
 *     summary: Update contact submission status
 *     description: |
 *       Update the status of a contact submission (mark as read/replied).
 *
 *       **Access Control:** Admin users only
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact submission ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [unread, read, replied]
 *                 example: "read"
 *     responses:
 *       200:
 *         description: Contact status updated successfully
 *       400:
 *         description: Invalid data or contact ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Contact submission not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateContact);

/**
 * @swagger
 * /api/contact/{id}:
 *   delete:
 *     summary: Delete contact submission
 *     description: |
 *       Remove a contact submission from the system.
 *
 *       **Access Control:** Admin users only
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Contact submission ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Contact submission deleted successfully
 *       400:
 *         description: Invalid contact ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Contact submission not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteContact);

export default router;