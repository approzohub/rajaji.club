import { Router } from 'express';
import { 
  updateCardPrice,
  bulkUpdateCardPrices,
  getCardPriceHistory,
  initializeCards
} from '../controllers/commission.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Card Management
 *   description: Card price management
 */

/**
 * @swagger
 * /api/commission/cards/{cardName}/price:
 *   put:
 *     summary: Update card price
 *     tags: [Card Management]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: cardName
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPrice
 *             properties:
 *               newPrice:
 *                 type: number
 *                 minimum: 1
 *               reason:
 *                 type: string
 *     responses:
 *       200: { description: Card price updated }
 *       400: { description: Invalid input }
 *       403: { description: Forbidden - admin access required }
 */
router.put('/cards/:cardName/price', jwtAuth, requireRole('admin'), updateCardPrice);

/**
 * @swagger
 * /api/commission/cards/bulk-price:
 *   put:
 *     summary: Bulk update card prices
 *     tags: [Card Management]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - cardName
 *                     - newPrice
 *                   properties:
 *                     cardName:
 *                       type: string
 *                     newPrice:
 *                       type: number
 *                       minimum: 1
 *               reason:
 *                 type: string
 *     responses:
 *       200: { description: Bulk price update completed }
 *       400: { description: Invalid input }
 *       403: { description: Forbidden - admin access required }
 */
router.put('/cards/bulk-price', jwtAuth, requireRole('admin'), bulkUpdateCardPrices);

/**
 * @swagger
 * /api/commission/cards/{cardName}/price-history:
 *   get:
 *     summary: Get card price history
 *     tags: [Card Management]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: cardName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Card price history }
 *       403: { description: Forbidden - admin access required }
 */
router.get('/cards/:cardName/price-history', jwtAuth, requireRole('admin'), getCardPriceHistory);

/**
 * @swagger
 * /api/commission/cards/initialize:
 *   post:
 *     summary: Initialize all cards in the system
 *     tags: [Card Management]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Cards initialized successfully }
 *       403: { description: Forbidden - admin access required }
 */
router.post('/cards/initialize', jwtAuth, requireRole('admin'), initializeCards);

export default router; 