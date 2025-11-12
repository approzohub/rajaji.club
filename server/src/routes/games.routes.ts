import { Router } from 'express';
import { 
  createGame, 
  listGames, 
  getGame, 
  declareWinnerManually,
  getActiveCards,
  getCardsByType,
  getCardsBySuit,
  toggleCardActiveStatus,
  getCardStatuses,
  resetAllCardsToActive,
  getGameTimer,
  getGameResult,
  getGameWinners,
  getActiveGame,
  getUserGameHistory,
  getGameResults,
  getTodayResults,
  getResultsByDateRange,
  getLastDeclaredResult,
  getResultsChart,
  updateCardDisplayOrder,
  bulkUpdateDisplayOrders,
  initializeDisplayOrders
} from '../controllers/games.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Games
 *   description: Game management
 */

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Create a new game
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeWindow: { type: string }
 *     responses:
 *       201: { description: Game created }
 *       400: { description: Invalid input }
 *       409: { description: Game already exists for this window }
 */
router.post('/', jwtAuth, requireRole('admin'), createGame);
// Manual game creation route removed - games are only created by automated timer

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: List games
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of games }
 */
router.get('/', jwtAuth, listGames);

/**
 * @swagger
 * /api/games/timer:
 *   get:
 *     summary: Get current game timer and status
 *     tags: [Games]
 *     responses:
 *       200: { description: Current game timer information }
 */
router.get('/timer', getGameTimer);

/**
 * @swagger
 * /api/games/active:
 *   get:
 *     summary: Get currently active game
 *     tags: [Games]
 *     responses:
 *       200: { description: Active game details }
 */
router.get('/active', getActiveGame);

/**
 * @swagger
 * /api/games/cards:
 *   get:
 *     summary: Get all active cards
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of active cards }
 */
router.get('/cards', jwtAuth, getActiveCards);

/**
 * @swagger
 * /api/games/cards/type/{cardType}:
 *   get:
 *     summary: Get cards by type
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: cardType
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of cards by type }
 */
router.get('/cards/type/:cardType', jwtAuth, getCardsByType);

/**
 * @swagger
 * /api/games/cards/suit/{suit}:
 *   get:
 *     summary: Get cards by suit
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: suit
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of cards by suit }
 */
router.get('/cards/suit/:suit', jwtAuth, getCardsBySuit);

/**
 * @swagger
 * /api/games/{id}/declare-winner:
 *   post:
 *     summary: Declare winner for a game
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               winningCard: { type: string }
 *               isRandom: { type: boolean }
 *     responses:
 *       200: { description: Winner declared successfully }
 *       400: { description: Invalid input or game not in correct status }
 *       404: { description: Game not found }
 */
router.post('/:id/declare-winner', jwtAuth, requireRole('admin'), declareWinnerManually);

/**
 * @swagger
 * /api/games/{id}/result:
 *   get:
 *     summary: Get game result
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Game result }
 *       404: { description: Game not found }
 */
router.get('/:id/result', jwtAuth, getGameResult);

/**
 * @swagger
 * /api/games/{id}/winners:
 *   get:
 *     summary: Get game winners
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Game winners }
 *       404: { description: Game not found }
 */
router.get('/:id/winners', jwtAuth, getGameWinners);

/**
 * @swagger
 * /api/games/history:
 *   get:
 *     summary: Get user's game history with win/loss/pending results
 *     description: Returns the logged-in user's game history showing all their bids and whether they won, lost, or if the result is still pending
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of games per page
 *     responses:
 *       200:
 *         description: User's game history with win/loss results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       gameId:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       bid:
 *                         type: object
 *                         properties:
 *                           cardType:
 *                             type: string
 *                           cardSuit:
 *                             type: string
 *                           cardName:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           totalAmount:
 *                             type: number
 *                       result:
 *                         type: string
 *                         enum: [Win, Loss, Open]
 *                       totalPool:
 *                         type: number
 *                       winningCard:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalGames:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/history', jwtAuth, getUserGameHistory);

/**
 * @swagger
 * /api/games/results:
 *   get:
 *     summary: Get all game results
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of all game results }
 */
router.get('/results', jwtAuth, getGameResults);

/**
 * @swagger
 * /api/games/today-results:
 *   get:
 *     summary: Get today's game results
 *     tags: [Games]
 *     responses:
 *       200: { description: List of today's results with time and winning card }
 */
router.get('/today-results', getTodayResults);

/**
 * @swagger
 * /api/games/last-result:
 *   get:
 *     summary: Get the last declared result
 *     tags: [Games]
 *     responses:
 *       200: { description: Last declared result with time and winning card }
 */
router.get('/last-result', getLastDeclaredResult);

/**
 * @swagger
 * /api/games/results-by-date-range:
 *   get:
 *     summary: Get results by date range
 *     tags: [Games]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200: { description: Results for the specified date range }
 */
router.get('/results-by-date-range', getResultsByDateRange);

/**
 * @swagger
 * /api/games/results-chart:
 *   get:
 *     summary: Get results chart data for the results page
 *     tags: [Games]
 *     parameters:
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
 *           default: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Results chart data with formatted card information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       resultTime:
 *                         type: string
 *                         format: date-time
 *                       winningCard:
 *                         type: string
 *                       cardType:
 *                         type: string
 *                       cardSuit:
 *                         type: string
 *                       formattedCard:
 *                         type: string
 *                         description: Formatted card like "A♠", "K♥", "Q♦", "J♣", "10♠"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: number
 *                     totalPages:
 *                       type: number
 *                     totalResults:
 *                       type: number
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 */
router.get('/results-chart', getResultsChart);

/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Get a specific game by ID
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Game details
 *       404:
 *         description: Game not found
 */
/**
 * @swagger
 * /api/games/cards/{id}/toggle-active:
 *   patch:
 *     summary: Toggle card active status
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Card ID
 *     responses:
 *       200: { description: Card status toggled successfully }
 *       400: { description: Invalid card ID }
 *       404: { description: Card not found }
 *       403: { description: Forbidden - Admin access required }
 */
router.patch('/cards/:id/toggle-active', jwtAuth, requireRole('admin'), toggleCardActiveStatus);

/**
 * @swagger
 * /api/games/cards/statuses:
 *   get:
 *     summary: Get all card statuses (for debugging)
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Card statuses }
 */
router.get('/cards/statuses', jwtAuth, requireRole('admin'), getCardStatuses);

/**
 * @swagger
 * /api/games/cards/reset-active:
 *   post:
 *     summary: Reset all cards to active status (for testing)
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Cards reset successfully }
 */
router.post('/cards/reset-active', jwtAuth, requireRole('admin'), resetAllCardsToActive);

/**
 * @swagger
 * /api/games/cards/{cardName}/display-order:
 *   patch:
 *     summary: Update the display order of a single card
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: cardName
 *         required: true
 *         schema: { type: string }
 *         description: Card name (e.g., "jack_of_clubs")
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newOrder: { type: number }
 *     responses:
 *       200: { description: Card display order updated }
 *       400: { description: Invalid card name or new order }
 *       404: { description: Card not found }
 */
router.patch('/cards/:cardName/display-order', jwtAuth, requireRole('admin'), updateCardDisplayOrder);

/**
 * @swagger
 * /api/games/cards/bulk-display-order:
 *   patch:
 *     summary: Bulk update the display order of multiple cards
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     cardName: { type: string }
 *                     newOrder: { type: number }
 *     responses:
 *       200: { description: Card display orders bulk updated }
 *       400: { description: Invalid card names or new orders }
 *       404: { description: Cards not found }
 */
router.patch('/cards/bulk-display-order', jwtAuth, requireRole('admin'), bulkUpdateDisplayOrders);

/**
 * @swagger
 * /api/games/cards/initialize-display-orders:
 *   post:
 *     summary: Initialize display orders for all cards
 *     tags: [Games]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Card display orders initialized }
 */
router.post('/cards/initialize-display-orders', jwtAuth, requireRole('admin'), initializeDisplayOrders);

/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Get a specific game by ID
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Game details
 *       404:
 *         description: Game not found
 */
router.get('/:id', jwtAuth, getGame);

export default router; 