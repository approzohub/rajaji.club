import { Router } from 'express';
import { createBanner, listBanners, updateBanner, deleteBanner } from '../controllers/banners.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/banners:
 *   post:
 *     summary: Create a new banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the banner image
 *               link:
 *                 type: string
 *                 description: Link URL when banner is clicked (optional)
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 default: active
 *                 description: Status of the banner
 *     responses:
 *       201:
 *         description: Banner created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/', jwtAuth, requireRole('admin'), createBanner);

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: List all banners
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of banners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *                   link:
 *                     type: string
 *                   status:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', jwtAuth, listBanners);

/**
 * @swagger
 * /api/banners/{id}:
 *   patch:
 *     summary: Update a banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the banner image
 *               link:
 *                 type: string
 *                 description: Link URL when banner is clicked
 *               status:
 *                 type: string
 *                 enum: [active, inactive, draft]
 *                 description: Status of the banner
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Banner not found
 */
router.patch('/:id', jwtAuth, requireRole('admin'), updateBanner);

/**
 * @swagger
 * /api/banners/{id}:
 *   delete:
 *     summary: Delete a banner
 *     tags: [Banners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Banner ID
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: Banner not found
 */
router.delete('/:id', jwtAuth, requireRole('admin'), deleteBanner);

export default router; 