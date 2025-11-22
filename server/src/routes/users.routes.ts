import { Router } from 'express';
import { createUser, listUsers, updateUser, disableUser, banUser, activateUser, deleteUser, changeUserPassword } from '../controllers/users.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               assignedAgent: { type: string }
 *               role: { type: string, enum: [user, agent] }
 *     responses:
 *       201: { description: User created }
 *       400: { description: Invalid input }
 *       409: { description: Email or phone already exists }
 */
router.post('/', jwtAuth, requireRole('admin', 'agent'), createUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of users }
 */
router.get('/', jwtAuth, requireRole('admin', 'agent'), listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               phone: { type: string }
 *               status: { type: string, enum: [active, disabled, banned] }
 *               assignedAgent: { type: string }
 *     responses:
 *       200: { description: User updated }
 *       400: { description: Invalid input }
 *       404: { description: User not found }
 */
router.patch('/:id', jwtAuth, requireRole('admin'), updateUser);

/**
 * @swagger
 * /api/users/{id}/disable:
 *   patch:
 *     summary: Disable a user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User disabled }
 *       404: { description: User not found }
 */
router.patch('/:id/disable', jwtAuth, requireRole('admin', 'agent'), disableUser);

/**
 * @swagger
 * /api/users/{id}/ban:
 *   patch:
 *     summary: Ban a user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User banned }
 *       404: { description: User not found }
 */
router.patch('/:id/ban', jwtAuth, requireRole('admin', 'agent'), banUser);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate a user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User activated }
 *       404: { description: User not found }
 */
router.patch('/:id/activate', jwtAuth, requireRole('admin', 'agent'), activateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       404: { description: User not found }
 */
router.delete('/:id', jwtAuth, requireRole('admin'), deleteUser);

/**
 * @swagger
 * /api/users/{id}/change-password:
 *   patch:
 *     summary: Change user password (admin only)
 *     tags: [Users]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Password changed successfully }
 *       400: { description: Invalid input }
 *       403: { description: Forbidden - admin only }
 *       404: { description: User not found }
 */
router.patch('/:id/change-password', jwtAuth, requireRole('admin', 'agent'), changeUserPassword);

export default router; 