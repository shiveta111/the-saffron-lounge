import express, { Router } from 'express';
import {
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/teamController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { uploadTeamPhoto } from '../utils/upload';

const router: Router = express.Router();

/**
 * @swagger
 * /api/team:
 *   get:
 *     summary: Get all team members
 *     description: |
 *       Retrieve a paginated list of all team members with optional sorting.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Supports pagination and sorting by different fields.
 *     tags: [Team]
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
 *         description: Number of members per page
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, role, created_at]
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
 *         description: Team members retrieved successfully
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
 *                     members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           role:
 *                             type: string
 *                             example: "Chef"
 *                           bio:
 *                             type: string
 *                             example: "Experienced chef with 10 years in fine dining"
 *                           photo:
 *                             type: string
 *                             format: uri
 *                             example: "https://example.com/john-doe.jpg"
 *                           social_links:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 platform:
 *                                   type: string
 *                                   example: "LinkedIn"
 *                                 url:
 *                                   type: string
 *                                   format: uri
 *                                   example: "https://linkedin.com/in/johndoe"
 *                           email:
 *                             type: string
 *                             format: email
 *                             example: "john.doe@restaurant.com"
 *                           phone:
 *                             type: string
 *                             example: "+1-555-0123"
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
 *                           example: 12
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 2
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
router.get('/', getAllTeamMembers);

/**
 * @swagger
 * /api/team/{id}:
 *   get:
 *     summary: Get team member by ID
 *     description: |
 *       Retrieve detailed information about a specific team member.
 *
 *       **Access Control:** Public (no authentication required)
 *
 *       Includes full social links and contact information.
 *     tags: [Team]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team member ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Team member retrieved successfully
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
 *                     member:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         role:
 *                           type: string
 *                           example: "Chef"
 *                         bio:
 *                           type: string
 *                           example: "Experienced chef with 10 years in fine dining"
 *                         photo:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/john-doe.jpg"
 *                         social_links:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               platform:
 *                                 type: string
 *                                 example: "LinkedIn"
 *                               url:
 *                                 type: string
 *                                 format: uri
 *                                 example: "https://linkedin.com/in/johndoe"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "john.doe@restaurant.com"
 *                         phone:
 *                           type: string
 *                           example: "+1-555-0123"
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid team member ID
 *       404:
 *         description: Team member not found
 *       500:
 *         description: Server error
 */
router.get('/:id', getTeamMemberById);

/**
 * @swagger
 * /api/team:
 *   post:
 *     summary: Create team member
 *     description: |
 *       Add a new team member with contact information and social links.
 *
 *       **Access Control:** Admin users only
 *
 *       Supports social media links and contact validation.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Chef"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Experienced chef with 10 years in fine dining"
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/john-doe.jpg"
 *               social_links:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - platform
 *                     - url
 *                   properties:
 *                     platform:
 *                       type: string
 *                       example: "LinkedIn"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: "https://linkedin.com/in/johndoe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@restaurant.com"
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+1-555-0123"
 *     responses:
 *       201:
 *         description: Team member created successfully
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
 *                   example: "Team member created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     member:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         role:
 *                           type: string
 *                           example: "Chef"
 *                         bio:
 *                           type: string
 *                           example: "Experienced chef with 10 years in fine dining"
 *                         photo:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/john-doe.jpg"
 *                         social_links:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               platform:
 *                                 type: string
 *                                 example: "LinkedIn"
 *                               url:
 *                                 type: string
 *                                 format: uri
 *                                 example: "https://linkedin.com/in/johndoe"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "john.doe@restaurant.com"
 *                         phone:
 *                           type: string
 *                           example: "+1-555-0123"
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid team member data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */
router.post('/', authenticate, requireAdmin, uploadTeamPhoto.single('photo'), createTeamMember);

/**
 * @swagger
 * /api/team/{id}:
 *   put:
 *     summary: Update team member
 *     description: |
 *       Update an existing team member's information.
 *
 *       **Access Control:** Admin users only
 *
 *       All fields are optional. Email uniqueness is validated if provided.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team member ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "John Smith"
 *               role:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Senior Chef"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Updated bio with more experience"
 *               photo:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/john-smith.jpg"
 *               social_links:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - platform
 *                     - url
 *                   properties:
 *                     platform:
 *                       type: string
 *                       example: "Twitter"
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: "https://twitter.com/johnsmith"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.smith@restaurant.com"
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *                 example: "+1-555-0124"
 *     responses:
 *       200:
 *         description: Team member updated successfully
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
 *                   example: "Team member updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     member:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: "John Smith"
 *                         role:
 *                           type: string
 *                           example: "Senior Chef"
 *                         bio:
 *                           type: string
 *                           example: "Updated bio with more experience"
 *                         photo:
 *                           type: string
 *                           format: uri
 *                           example: "https://example.com/john-smith.jpg"
 *                         social_links:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               platform:
 *                                 type: string
 *                                 example: "Twitter"
 *                               url:
 *                                 type: string
 *                                 format: uri
 *                               example: "https://twitter.com/johnsmith"
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: "john.smith@restaurant.com"
 *                         phone:
 *                           type: string
 *                           example: "+1-555-0124"
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid data or team member ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Team member not found
 *       409:
 *         description: Email conflict
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticate, requireAdmin, uploadTeamPhoto.single('photo'), updateTeamMember);

/**
 * @swagger
 * /api/team/{id}:
 *   delete:
 *     summary: Delete team member
 *     description: |
 *       Remove a team member from the system.
 *
 *       **Access Control:** Admin users only
 *
 *       Permanently deletes the team member and all associated data.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Team member ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Team member deleted successfully
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
 *                   example: "Team member deleted successfully"
 *       400:
 *         description: Invalid team member ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Team member not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticate, requireAdmin, deleteTeamMember);

export default router;