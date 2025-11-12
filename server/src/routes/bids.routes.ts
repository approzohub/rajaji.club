import { Router } from 'express';
import { placeBid, placeSimpleBid, listUserBids, listGameBids, getCardAnalytics, getOngoingBids, getOpenGameBids } from '../controllers/bids.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * /api/bids:
 *   post:
 *     summary: Place bids on multiple cards
 *     description: Place bids on one or more cards in a single request. Supports both single and multiple card bidding.
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameId
 *               - bids
 *             properties:
 *               gameId:
 *                 type: string
 *                 description: ID of the game to bid on
 *               bids:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
 *                 description: Array of card bids (1-20 cards per request)
 *                 items:
 *                   type: object
 *                   required:
 *                     - cardId
 *                     - quantity
 *                   properties:
 *                     cardId:
 *                       type: string
 *                       description: ID of the card to bid on (ObjectId)
 *                       example: "688ba8bfd21f710c9cc03b91"
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *                       description: Number of cards to buy
 *                       example: 2
 *           examples:
 *             single_card:
 *               summary: Single card bid
 *               value:
 *                 gameId: "688bbd308a83f866b0f5dbed"
 *                 bids:
 *                   - cardId: "688ba8bfd21f710c9cc03b91"
 *                     quantity: 2
 *             multiple_cards:
 *               summary: Multiple card bid
 *               value:
 *                 gameId: "688bbd308a83f866b0f5dbed"
 *                 bids:
 *                   - cardId: "688ba8bed21f710c9cc03b83"
 *                     quantity: 2
 *                   - cardId: "688ba8bfd21f710c9cc03b88"
 *                     quantity: 1
 *                   - cardId: "688ba8bfd21f710c9cc03b89"
 *                     quantity: 3
 *     responses:
 *       201:
 *         description: Bids placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bids placed successfully"
 *                 bids:
 *                   type: array
 *                   description: Array of created bid objects
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       user:
 *                         type: string
 *                       game:
 *                         type: string
 *                       cardName:
 *                         type: string
 *                       cardType:
 *                         type: string
 *                       cardSuit:
 *                         type: string
 *                       quantity:
 *                         type: number
 *                       totalAmount:
 *                         type: number
 *                       cardPrice:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 totalAmount:
 *                   type: number
 *                   description: Total amount of all bids combined
 *                 newBalance:
 *                   type: number
 *                   description: User's new wallet balance after bids
 *                 totalPool:
 *                   type: number
 *                   description: Updated game pool amount
 *       400:
 *         description: Invalid input, insufficient balance, or game not open
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     - "Game not open for bids"
 *                     - "Bidding is closed for this game"
 *                     - "Card with ID 688ba8bfd21f710c9cc03b91 not available for bidding"
 *                     - "Invalid card ID: 688ba8bfd21f710c9cc03b91"
 *                     - "Insufficient balance"
 *                 required:
 *                   type: number
 *                   description: Required amount (when insufficient balance)
 *                 available:
 *                   type: number
 *                   description: Available balance (when insufficient balance)
 *       403:
 *         description: Forbidden - user role not allowed
 *       401:
 *         description: Unauthorized
 */
router.post('/', jwtAuth, requireRole('user'), placeBid);
router.post('/simple', jwtAuth, requireRole('user'), placeSimpleBid);

/**
 * @swagger
 * /api/bids:
 *   get:
 *     summary: List user bids
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bids
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   game:
 *                     type: string
 *                   cardName:
 *                     type: string
 *                   cardType:
 *                     type: string
 *                   cardSuit:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   totalAmount:
 *                     type: number
 *                   cardPrice:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', jwtAuth, listUserBids);

/**
 * @swagger
 * /api/bids/game/{gameId}:
 *   get:
 *     summary: List all bids for a specific game (Admin only)
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the game
 *     responses:
 *       200:
 *         description: List of bids for the game
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   game:
 *                     type: string
 *                   cardName:
 *                     type: string
 *                   cardType:
 *                     type: string
 *                   cardSuit:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   totalAmount:
 *                     type: number
 *                   cardPrice:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid game ID
 *       403:
 *         description: Forbidden - admin access required
 *       401:
 *         description: Unauthorized
 */
router.get('/game/:gameId', jwtAuth, requireRole('admin'), listGameBids);

/**
 * @swagger
 * /api/bids/game/{gameId}/analytics:
 *   get:
 *     summary: Get card analytics for a specific game (Admin only)
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the game
 *     responses:
 *       200:
 *         description: Card analytics for the game
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   cardName:
 *                     type: string
 *                   cardType:
 *                     type: string
 *                   cardSuit:
 *                     type: string
 *                   symbol:
 *                     type: string
 *                   totalBids:
 *                     type: number
 *                   totalAmount:
 *                     type: number
 *                   uniqueBidders:
 *                     type: number
 *                   averageBidAmount:
 *                     type: number
 *                   popularityRank:
 *                     type: number
 *       400:
 *         description: Invalid game ID
 *       403:
 *         description: Forbidden - admin access required
 *       401:
 *         description: Unauthorized
 */
router.get('/game/:gameId/analytics', jwtAuth, requireRole('admin'), getCardAnalytics);

/**
 * @swagger
 * /api/bids/ongoing:
 *   get:
 *     summary: Get ongoing bids for current open game
 *     description: Returns bids for the current open game only (not completed games)
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ongoing bids for current open game
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   user:
 *                     type: string
 *                   game:
 *                     type: string
 *                   cardName:
 *                     type: string
 *                   cardType:
 *                     type: string
 *                   cardSuit:
 *                     type: string
 *                   quantity:
 *                     type: number
 *                   totalAmount:
 *                     type: number
 *                   cardPrice:
 *                     type: number
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/ongoing', jwtAuth, getOngoingBids);
router.get('/open-game', jwtAuth, getOpenGameBids);

export default router; 