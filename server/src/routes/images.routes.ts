import { Router } from 'express';
import { 
  uploadImage, 
  getImages, 
  getPublicImages, 
  getCarouselImages,
  updateImage, 
  deleteImage, 
  getImageById 
} from '../controllers/images.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { uploadSingle, handleUploadError } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     summary: Upload a new image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *               type:
 *                 type: string
 *                 enum: [banner, hero, general]
 *                 default: general
 *                 description: Type of image
 *               altText:
 *                 type: string
 *                 description: Alt text for accessibility
 *               title:
 *                 type: string
 *                 description: Title for the image
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 description: Status of the image
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid input or file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.post('/upload', jwtAuth, requireRole('admin'), uploadSingle, handleUploadError, uploadImage);

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get all images (admin only)
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [banner, hero, general]
 *         description: Filter by image type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of images with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin access required
 */
router.get('/', jwtAuth, requireRole('admin'), getImages);

/**
 * @swagger
 * /api/images/public:
 *   get:
 *     summary: Get public images (for frontend)
 *     tags: [Images]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [banner, hero, general]
 *         description: Filter by image type
 *     responses:
 *       200:
 *         description: List of active images
 */
router.get('/public', getPublicImages);

/**
 * @swagger
 * /api/images/carousel/public:
 *   get:
 *     summary: Get carousel images (for frontend)
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: List of carousel images
 */
router.get('/carousel/public', getCarouselImages);

/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Get image by ID
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image details
 *       404:
 *         description: Image not found
 */
router.get('/:id', jwtAuth, getImageById);

/**
 * @swagger
 * /api/images/{id}:
 *   put:
 *     summary: Update image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [banner, hero, general]
 *               altText:
 *                 type: string
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Image updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Image not found
 *       403:
 *         description: Forbidden - admin access required
 */
router.put('/:id', jwtAuth, requireRole('admin'), updateImage);

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     summary: Delete image
 *     tags: [Images]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       404:
 *         description: Image not found
 *       403:
 *         description: Forbidden - admin access required
 */
router.delete('/:id', jwtAuth, requireRole('admin'), deleteImage);

export default router; 