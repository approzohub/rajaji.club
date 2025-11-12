import { Router } from 'express';
import { login, logout, changePassword, updatePassword, validateToken, userLogin, validateUserToken } from '../controllers/auth.controller';
import { jwtAuth } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or Game ID
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token and user info
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate JWT token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid token
 *       403:
 *         description: Access denied
 */
router.get('/validate', jwtAuth, validateToken);

router.post('/logout', logout);
router.post('/change-password', jwtAuth, changePassword);
router.post('/update-password', jwtAuth, updatePassword);

/**
 * @swagger
 * /api/auth/user/login:
 *   post:
 *     summary: User platform login (for user role only)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Game ID only
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token and user info
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Access denied - only user role allowed
 */
router.post('/user/login', userLogin);

/**
 * @swagger
 * /api/auth/user/validate:
 *   get:
 *     summary: Validate user JWT token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid token
 *       403:
 *         description: Access denied
 */
router.get('/user/validate', jwtAuth, validateUserToken);

export default router; 