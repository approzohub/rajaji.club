import { Router } from 'express';
import { createCMSPage, listCMSPages, getCMSPage, updateCMSPage, deleteCMSPage } from '../controllers/cms.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/cms:
 *   post:
 *     summary: Create a new CMS page
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the CMS page
 *               slug:
 *                 type: string
 *                 description: URL slug for the page
 *               content:
 *                 type: string
 *                 description: HTML content of the page
 *     responses:
 *       201:
 *         description: CMS page created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/', jwtAuth, requireRole('admin'), createCMSPage);

/**
 * @swagger
 * /api/cms:
 *   get:
 *     summary: List all CMS pages
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: List of CMS pages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   slug:
 *                     type: string
 *                   content:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
router.get('/', listCMSPages);

/**
 * @swagger
 * /api/cms/{slug}:
 *   get:
 *     summary: Get a CMS page by slug
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the CMS page
 *     responses:
 *       200:
 *         description: CMS page details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 content:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: CMS page not found
 */
router.get('/:slug', getCMSPage);

/**
 * @swagger
 * /api/cms/{slug}:
 *   patch:
 *     summary: Update a CMS page
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the CMS page
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the CMS page
 *               slug:
 *                 type: string
 *                 description: URL slug for the page
 *               content:
 *                 type: string
 *                 description: HTML content of the page
 *     responses:
 *       200:
 *         description: CMS page updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: CMS page not found
 */
router.patch('/:slug', jwtAuth, requireRole('admin'), updateCMSPage);

/**
 * @swagger
 * /api/cms/{slug}:
 *   delete:
 *     summary: Delete a CMS page
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the CMS page
 *     responses:
 *       200:
 *         description: CMS page deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 *       404:
 *         description: CMS page not found
 */
router.delete('/:slug', jwtAuth, requireRole('admin'), deleteCMSPage);

export default router; 