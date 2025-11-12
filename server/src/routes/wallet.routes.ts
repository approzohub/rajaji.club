import { Router } from 'express';
import { rechargeWallet, listWalletTransactions, listWallets, manualDebit, getMyWallet, getPaymentHistory } from '../controllers/wallet.controller';
import { jwtAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management
 */

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: List all wallets (admin and agent)
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of wallets }
 *       403: { description: Forbidden }
 */
router.get('/', jwtAuth, requireRole('admin', 'agent'), listWallets);

/**
 * @swagger
 * /api/wallet/my-wallet:
 *   get:
 *     summary: Get current user's wallet
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Current user's wallet }
 *       401: { description: Unauthorized }
 */
router.get('/my-wallet', jwtAuth, getMyWallet);

/**
 * @swagger
 * /api/wallet/recharge:
 *   post:
 *     summary: Recharge a user's wallet
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number }
 *               walletType: { type: string, enum: [main, bonus] }
 *               note: { type: string }
 *     responses:
 *       200: { description: Wallet recharged }
 *       400: { description: Invalid input or insufficient balance }
 *       404: { description: User not found }
 */
router.post('/recharge', jwtAuth, requireRole('admin', 'agent'), rechargeWallet);

/**
 * @swagger
 * /api/wallet/manual-debit:
 *   post:
 *     summary: Manually debit a user's wallet (admin only)
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId: { type: string }
 *               amount: { type: number }
 *               walletType: { type: string, enum: [main, bonus] }
 *               note: { type: string }
 *     responses:
 *       200: { description: Manual debit successful }
 *       400: { description: Invalid input or insufficient balance }
 *       403: { description: Admin access required }
 *       404: { description: User not found }
 */
router.post('/manual-debit', jwtAuth, requireRole('admin'), manualDebit);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: List wallet transactions
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of wallet transactions }
 */
router.get('/transactions', jwtAuth, listWalletTransactions);

/**
 * @swagger
 * /api/wallet/payment-history:
 *   get:
 *     summary: Get comprehensive payment history (wallet transactions, bids, withdrawals)
 *     tags: [Wallet]
 *     security: [ { bearerAuth: [] } ]
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
 *           default: 50
 *         description: Number of transactions per page
 *     responses:
 *       200: { description: Payment history with pagination }
 *       401: { description: Unauthorized }
 */
router.get('/payment-history', jwtAuth, getPaymentHistory);

export default router; 