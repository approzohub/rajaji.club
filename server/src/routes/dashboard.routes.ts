import { Router } from 'express';
import { getAdminStats } from '../controllers/dashboard.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics (admin sees all data, agent sees assigned users only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userCount:
 *                   type: number
 *                   description: Number of users (filtered by agent if applicable)
 *                 agentCount:
 *                   type: number
 *                   description: Number of agents (0 for agent users)
 *                 activeGames:
 *                   type: number
 *                   description: Number of active games
 *                 totalPool:
 *                   type: number
 *                   description: Total pool amount from active games
 *                 rechargeCount:
 *                   type: number
 *                   description: Number of recharges
 *                 txnCount:
 *                   type: number
 *                   description: Number of transactions
 *                 userRole:
 *                   type: string
 *                   description: Role of the requesting user (admin/agent)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin or agent access required
 */
router.get('/stats', jwtAuth, requireRole('admin', 'agent'), getAdminStats);

export default router; 