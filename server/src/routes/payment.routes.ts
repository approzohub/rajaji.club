import { Router } from 'express';
import { 
  getUserPayments,
  addPayment,
  updatePayment,
  deletePayment,
  setDefaultPayment
} from '../controllers/payment.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: UPI Payment methods management
 */

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get user's payment methods
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: List of user's payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       upiId:
 *                         type: string
 *                       isDefault:
 *                         type: boolean
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', jwtAuth, requireRole('user'), getUserPayments);

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Add a new payment method
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - upiId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Display name for the payment method
 *               upiId:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$'
 *                 description: UPI ID (e.g., username@bank)
 *               isDefault:
 *                 type: boolean
 *                 default: false
 *                 description: Set as default payment method
 *     responses:
 *       201:
 *         description: Payment method added successfully
 *       400:
 *         description: Invalid input or UPI ID already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', jwtAuth, requireRole('user'), addPayment);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   put:
 *     summary: Update a payment method
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               upiId:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$'
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *       400:
 *         description: Invalid input or UPI ID already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 */
router.put('/:paymentId', jwtAuth, requireRole('user'), updatePayment);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   delete:
 *     summary: Delete a payment method
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 */
router.delete('/:paymentId', jwtAuth, requireRole('user'), deletePayment);

/**
 * @swagger
 * /api/payments/{paymentId}/default:
 *   post:
 *     summary: Set payment method as default
 *     tags: [Payments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 */
router.post('/:paymentId/default', jwtAuth, requireRole('user'), setDefaultPayment);

export default router; 