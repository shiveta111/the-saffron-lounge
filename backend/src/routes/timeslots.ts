import express, { Router } from 'express';
import {
  getAllTimeslots,
  getTimeslotById,
  createTimeslot,
  updateTimeslot,
  deleteTimeslot
} from '../controllers/timeslotsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router: Router = express.Router();

/**
 * @swagger
 * /timeslots:
 *   get:
 *     summary: Get all timeslots
 *     description: Retrieve a list of available timeslots with optional filtering
 *     tags: [Timeslots]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, FULL, DISABLED]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Timeslots retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/', getAllTimeslots);

/**
 * @swagger
 * /timeslots/{id}:
 *   get:
 *     summary: Get timeslot by ID
 *     description: Retrieve a specific timeslot by its ID with booking information
 *     tags: [Timeslots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Timeslot retrieved successfully
 *       400:
 *         description: Invalid timeslot ID
 *       404:
 *         description: Timeslot not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getTimeslotById);

/**
 * @swagger
 * /timeslots:
 *   post:
 *     summary: Create a new timeslot
 *     description: Create a new timeslot for bookings (admin only)
 *     tags: [Timeslots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^[0-9]{2}:[0-9]{2}$'
 *               endTime:
 *                 type: string
 *                 pattern: '^[0-9]{2}:[0-9]{2}$'
 *               capacity:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       201:
 *         description: Timeslot created successfully
 *       400:
 *         description: Invalid input or timeslot conflict
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Timeslot overlaps with existing slot
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, createTimeslot);

/**
 * @swagger
 * /timeslots/{id}:
 *   put:
 *     summary: Update timeslot
 *     description: Update an existing timeslot (admin only)
 *     tags: [Timeslots]
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
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^[0-9]{2}:[0-9]{2}$'
 *               endTime:
 *                 type: string
 *                 pattern: '^[0-9]{2}:[0-9]{2}$'
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, FULL, DISABLED]
 *     responses:
 *       200:
 *         description: Timeslot updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timeslot not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, updateTimeslot);

/**
 * @swagger
 * /timeslots/{id}:
 *   delete:
 *     summary: Delete timeslot
 *     description: Delete an existing timeslot (admin only)
 *     tags: [Timeslots]
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
 *         description: Timeslot deleted successfully
 *       400:
 *         description: Invalid timeslot ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Timeslot not found
 *       409:
 *         description: Cannot delete timeslot with active bookings
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteTimeslot);

export default router;