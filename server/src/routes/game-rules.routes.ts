import express from 'express';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { getGameRules, updateGameRules } from '../controllers/game-rules.controller';

const router = express.Router();

/**
 * @swagger
 * /api/game-rules:
 *   get:
 *     summary: Get game rules
 *     tags: [Game Rules]
 *     responses:
 *       200: { description: Game rules }
 *       500: { description: Server error }
 */
router.get('/', getGameRules);

/**
 * @swagger
 * /api/game-rules:
 *   put:
 *     summary: Update game rules (admin only)
 *     tags: [Game Rules]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 minLength: 1
 *                 description: Game rules text content
 *     responses:
 *       200: { description: Game rules updated }
 *       400: { description: Invalid input }
 *       403: { description: Forbidden - admin access required }
 *       500: { description: Server error }
 */
router.put('/', jwtAuth, requireRole('admin'), updateGameRules);

export default router;

