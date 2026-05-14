import express, { Router } from 'express';
import {
  checkSlotAvailability,
  getAvailableSlots,
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservation,
  updateReservationStatus,
  assignTableToReservation,
  cancelReservation,
  confirmReservation,
  rejectReservation,
  deleteReservation,
} from '../controllers/reservationsController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../utils/jwt';

const router: Router = express.Router();

/**
 * @swagger
 * /api/reservations/available-slots:
 *   get:
 *     summary: Get available time slots
 *     description: |
 *       Get available time slots for a specific date and party size.
 *       
 *       **Access Control:** Public (no authentication required)
 *       
 *       Returns time slots with available tables and total capacity.
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Reservation date (must be in the future)
 *         example: "2024-12-25"
 *       - in: query
 *         name: partySize
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of guests
 *         example: 4
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Server error
 */
router.get('/check-availability', checkSlotAvailability);
router.get('/available-slots', getAvailableSlots);

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations
 *     description: |
 *       Retrieve a paginated list of reservations with optional filtering.
 *       
 *       **Access Control:**
 *       - Customers can only see their own reservations
 *       - Admins and sellers can see all reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [reservationDate, createdAt, guestName]
 *           default: reservationDate
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Reservations retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, getAllReservations);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     description: |
 *       Retrieve detailed information about a specific reservation.
 *       
 *       **Access Control:**
 *       - Customers can only access their own reservations
 *       - Admins and sellers can access any reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation retrieved successfully
 *       400:
 *         description: Invalid reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, getReservationById);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     description: |
 *       Create a new table reservation.
 *       
 *       **Access Control:** Authenticated users
 *       
 *       If tableId is provided, the reservation will be automatically confirmed.
 *       Otherwise, it will be pending until a table is assigned by staff.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestName
 *               - guestEmail
 *               - guestPhone
 *               - partySize
 *               - reservationDate
 *               - reservationTime
 *             properties:
 *               guestName:
 *                 type: string
 *                 maxLength: 255
 *                 example: "John Doe"
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *                 example: "john@example.com"
 *               guestPhone:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+1-555-0123"
 *               partySize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 example: 4
 *               reservationDate:
 *                 type: string
 *                 format: date
 *                 description: Must be in the future
 *                 example: "2024-12-25"
 *               reservationTime:
 *                 type: string
 *                 pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *                 example: "19:00"
 *               tableId:
 *                 type: integer
 *                 description: Optional - if provided, reservation will be confirmed
 *                 example: 5
 *               specialRequests:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Window seat preferred, celebrating anniversary"
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *       400:
 *         description: Invalid reservation data
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Table not available for selected time
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, createReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   put:
 *     summary: Update reservation
 *     description: |
 *       Update reservation details.
 *       
 *       **Access Control:**
 *       - Customers can only update their own reservations
 *       - Admins and sellers can update any reservation
 *       
 *       **Restrictions:**
 *       - Cannot modify reservations less than 2 hours before scheduled time (except admins)
 *       - Cannot modify completed, cancelled, or no-show reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestName:
 *                 type: string
 *                 maxLength: 255
 *               guestEmail:
 *                 type: string
 *                 format: email
 *                 maxLength: 255
 *               guestPhone:
 *                 type: string
 *                 maxLength: 20
 *               partySize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *               reservationDate:
 *                 type: string
 *                 format: date
 *               reservationTime:
 *                 type: string
 *                 pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *               tableId:
 *                 type: integer
 *               specialRequests:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Invalid data or reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Reservation not found
 *       409:
 *         description: Cannot modify reservation or table not available
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, updateReservation);

/**
 * @swagger
 * /api/reservations/{id}/status:
 *   patch:
 *     summary: Update reservation status
 *     description: |
 *       Update the status of a reservation.
 *       
 *       **Access Control:** Admin and seller only
 *       
 *       Status flow: PENDING → CONFIRMED → SEATED → COMPLETED
 *       Can also be set to CANCELLED or NO_SHOW
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
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
 *                 enum: [PENDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW]
 *                 example: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status or reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin/seller access required
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authenticate, updateReservationStatus);
router.post('/:id/confirm', authenticate, authorize(UserRole.ADMIN, UserRole.SELLER), confirmReservation);
router.post('/:id/reject', authenticate, authorize(UserRole.ADMIN, UserRole.SELLER), rejectReservation);

/**
 * @swagger
 * /api/reservations/{id}/assign-table:
 *   post:
 *     summary: Assign table to reservation
 *     description: |
 *       Assign a specific table to a pending reservation.
 *       
 *       **Access Control:** Admin and seller only
 *       
 *       Automatically updates status to CONFIRMED and sends confirmation email.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *             properties:
 *               tableId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Table assigned successfully
 *       400:
 *         description: Invalid data or reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin/seller access required
 *       404:
 *         description: Reservation or table not found
 *       409:
 *         description: Table not available for this time slot
 *       500:
 *         description: Server error
 */
router.post('/:id/assign-table', authenticate, assignTableToReservation);

/**
 * @swagger
 * /api/reservations/{id}/cancel:
 *   post:
 *     summary: Cancel reservation
 *     description: |
 *       Cancel a reservation.
 *       
 *       **Access Control:**
 *       - Customers can cancel their own reservations
 *       - Admins and sellers can cancel any reservation
 *       
 *       Sends cancellation email to guest.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation cancelled successfully
 *       400:
 *         description: Invalid reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Reservation not found
 *       409:
 *         description: Reservation cannot be cancelled
 *       500:
 *         description: Server error
 */
router.post('/:id/cancel', authenticate, cancelReservation);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete reservation
 *     description: |
 *       Permanently delete a reservation from the system.
 *       
 *       **Access Control:** Admin only
 *       
 *       This action cannot be undone. Use cancel instead if you want to keep a record.
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *       400:
 *         description: Invalid reservation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteReservation);

export default router;