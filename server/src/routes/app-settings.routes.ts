import express from 'express';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { getAppSettings, updateAppSettings, getPublicAppSettings } from '../controllers/app-settings.controller';

const router = express.Router();

/**
 * @swagger
 * /api/app-settings/public:
 *   get:
 *     summary: Get public app settings
 *     tags: [App Settings]
 *     responses:
 *       200: { description: Public app settings }
 *       500: { description: Server error }
 */
router.get('/public', getPublicAppSettings);

/**
 * @swagger
 * /api/app-settings:
 *   get:
 *     summary: Get app settings (admin only)
 *     tags: [App Settings]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: App settings }
 *       403: { description: Forbidden - admin access required }
 *       500: { description: Server error }
 */
router.get('/', jwtAuth, requireRole('admin'), getAppSettings);

/**
 * @swagger
 * /api/app-settings:
 *   put:
 *     summary: Update app settings (admin only)
 *     tags: [App Settings]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whatsappNumber:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 15
 *               whatsappEnabled:
 *                 type: boolean
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               supportHours:
 *                 type: string
 *               appVersion:
 *                 type: string
 *               maintenanceMode:
 *                 type: boolean
 *               maintenanceMessage:
 *                 type: string
 *     responses:
 *       200: { description: App settings updated }
 *       400: { description: Invalid input }
 *       403: { description: Forbidden - admin access required }
 *       500: { description: Server error }
 */
router.put('/', jwtAuth, requireRole('admin'), updateAppSettings);

export default router; 