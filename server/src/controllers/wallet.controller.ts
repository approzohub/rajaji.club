import { Request, Response } from 'express';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { User } from '../models/user.model';
import { Bid } from '../models/bid.model';
import { Withdrawal } from '../models/withdrawal.model';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';

// Import formatCardName function from games controller
function formatCardName(cardName: string): string {
  // Handle null, undefined, or empty cardName
  if (!cardName || typeof cardName !== 'string') {
    return '';
  }
  
  // If it's already in the format "A ♠", return as is
  if (cardName.match(/^(J|K|Q|A|10)\s*([\u2660-\u2667])/)) {
    return cardName;
  }
  
  // If it's in format "jack_of_clubs", convert to "J ♣"
  const parts = cardName.split('_');
  if (parts.length >= 3) {
    const cardValueName = parts[0].toLowerCase();
    const suitName = parts[2];
    
    // Map card value names to their symbols
    const cardValueMap: Record<string, string> = {
      'ace': 'A',
      'king': 'K',
      'queen': 'Q',
      'jack': 'J',
      'ten': '10',
      'nine': '9',
      'eight': '8',
      'seven': '7',
      'six': '6',
      'five': '5',
      'four': '4',
      'three': '3',
      'two': '2'
    };
    
    const suitMap: Record<string, string> = {
      'clubs': '♣',
      'diamonds': '♦',
      'hearts': '♥',
      'spades': '♠'
    };
    
    const cardRank = cardValueMap[cardValueName] || cardValueName.charAt(0).toUpperCase();
    const suitSymbol = suitMap[suitName];
    
    if (suitSymbol) {
      return `${cardRank} ${suitSymbol}`;
    }
  }
  
  // If it's in format "A♠" (no space), add space
  if (cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)[\u2660-\u2667]/)) {
    const cardValue = cardName.slice(0, -1);
    const suitSymbol = cardName.slice(-1);
    return `${cardValue} ${suitSymbol}`;
  }
  
  // Fallback: return as is
  return cardName;
}

const rechargeSchema = z.object({
  userId: z.string(),
  amount: z.number().min(1),
  walletType: z.enum(['main', 'bonus']),
  note: z.string().optional(),
});

const MIN_USER_MAIN_RECHARGE = 100;
const MIN_AGENT_MAIN_RECHARGE = 500;

export async function rechargeWallet(req: AuthRequest, res: Response) {
  const { id: initiatorId, role: initiatorRole } = req.user || {};
  if (!initiatorId || !initiatorRole) return res.status(401).json({ error: 'Unauthorized' });
  const parse = rechargeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { userId, amount, walletType, note } = parse.data;
  if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user id' });
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Business rules based on initiator role and wallet type
  if (initiatorRole === 'admin') {
    // Admin can recharge anyone to any wallet type without balance check
    // Only apply minimum limits for main wallet recharges, not bonus wallet
    if (walletType === 'main') {
      if (user.role === 'agent' && amount < MIN_AGENT_MAIN_RECHARGE) {
        return res.status(400).json({ error: `Min ₹${MIN_AGENT_MAIN_RECHARGE} for agent main wallet` });
      }
      if (user.role === 'user' && amount < MIN_USER_MAIN_RECHARGE) {
        return res.status(400).json({ error: `Min ₹${MIN_USER_MAIN_RECHARGE} for user main wallet` });
      }
    }
    // Bonus wallet recharges have no minimum limit
  } else if (initiatorRole === 'agent') {
    // Agent can only recharge main wallet of their assigned users
    if (walletType !== 'main') {
      return res.status(403).json({ error: 'Agents can only recharge main wallet. Bonus wallet recharges are admin-only.' });
    }
    if (user.role !== 'user') return res.status(403).json({ error: 'Agents can only recharge users' });
    if (user.assignedAgent?.toString() !== initiatorId) return res.status(403).json({ error: 'You can only recharge your assigned users' });
    if (amount < MIN_USER_MAIN_RECHARGE) {
      return res.status(400).json({ error: `Min ₹${MIN_USER_MAIN_RECHARGE} for user` });
    }
    
    // Check agent's own wallet balance
    const agentWallet = await Wallet.findOne({ user: initiatorId });
    if (!agentWallet || agentWallet.main < amount) return res.status(400).json({ error: 'Insufficient agent balance' });
    
    // Deduct from agent's wallet
    agentWallet.main -= amount;
    await agentWallet.save();
    
    // Log agent debit
    await WalletTransaction.create({
      user: initiatorId,
      initiator: initiatorId,
      initiatorRole,
      amount,
      walletType: 'main',
      type: 'debit',
      note: `Recharge to user ${userId}`,
    });
  } else {
    return res.status(403).json({ error: 'Not allowed' });
  }
  
  // Credit to user/agent
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  wallet[walletType] += amount;
  await wallet.save();
  
  // Log recharge
  await WalletTransaction.create({
    user: userId,
    initiator: initiatorId,
    initiatorRole,
    amount,
    walletType,
    type: 'recharge',
    note,
  });
  
  res.json({ message: 'Wallet recharged', balance: wallet });
}

export async function listWalletTransactions(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || !role) return res.status(401).json({ error: 'Unauthorized' });
  let filter: any = {};
  
  if (role === 'user') {
    // Users can only see their own transactions
    filter.user = userId;
  } else if (role === 'agent') {
    // Agents can see their own transactions and their assigned users' transactions
    const { userId: targetUserId } = req.query;
    if (targetUserId && typeof targetUserId === 'string') {
      // Check if the target user is assigned to this agent
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || targetUser.assignedAgent?.toString() !== userId) {
        return res.status(403).json({ error: 'You can only view transactions of your assigned users' });
      }
      filter.user = targetUserId;
    } else {
      // Show all transactions for users assigned to this agent
      const assignedUsers = await User.find({ assignedAgent: userId }).select('_id');
      const assignedUserIds = assignedUsers.map(u => u._id);
      filter.user = { $in: [...assignedUserIds, userId] }; // Include agent's own transactions
    }
  } else if (role === 'admin') {
    // Admin can filter by specific user or see all transactions
    const { userId: targetUserId } = req.query;
    if (targetUserId && typeof targetUserId === 'string') {
      filter.user = targetUserId;
    }
  }
  
  const txns = await WalletTransaction.find(filter)
    .populate('user', 'fullName email phone gameId')
    .sort({ createdAt: -1 });
  res.json(txns);
}

export async function listWallets(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!role || (role !== 'admin' && role !== 'agent')) return res.status(403).json({ error: 'Forbidden' });
  
  const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit as string, 10) || 50, 1);
  const skip = (page - 1) * limit;

  let filter: any = {};
  if (role === 'agent') {
    // Agent can only see wallets of their assigned users
    const assignedUsers = await User.find({ assignedAgent: userId }).select('_id');
    const assignedUserIds = assignedUsers.map(u => u._id);
    filter = { user: { $in: assignedUserIds } };
  }

  const [wallets, total] = await Promise.all([
    Wallet.find(filter)
      .populate('user', 'fullName email phone gameId role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Wallet.countDocuments(filter),
  ]);

  const agentTotal = wallets.filter((w: any) => w.user && w.user.role === 'agent').length;
  const userTotal = wallets.filter((w: any) => w.user && w.user.role === 'user').length;

  res.json({
    wallets,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      pageSize: limit,
    },
    counts: {
      total,
      agents: agentTotal,
      users: userTotal,
    },
  });
} 

export async function manualDebit(req: AuthRequest, res: Response) {
  const { id: initiatorId, role: initiatorRole } = req.user || {};
  if (!initiatorId || !initiatorRole) return res.status(401).json({ error: 'Unauthorized' });
  
  // Only admins can perform manual debit
  if (initiatorRole !== 'admin') return res.status(403).json({ error: 'Only admins can perform manual debit' });
  
  const parse = rechargeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  const { userId, amount, walletType, note } = parse.data;
  if (!Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user id' });
  
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  // Check if user has sufficient balance
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet || wallet[walletType] < amount) return res.status(400).json({ error: 'Insufficient user balance' });
  
  // Debit from user's wallet
  wallet[walletType] -= amount;
  await wallet.save();
  
  // Log manual debit
  await WalletTransaction.create({
    user: userId,
    initiator: initiatorId,
    initiatorRole,
    amount,
    walletType,
    type: 'debit',
    note: note || 'Manual debit by admin',
  });
  
  res.json({ message: 'Manual debit successful', balance: wallet });
} 

export async function getMyWallet(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({ user: userId });
    }
    
    // Populate user information
    await wallet.populate('user', 'fullName email phone gameId role');
    
    res.json(wallet);
  } catch (error) {
    console.error('Error fetching my wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
} 

export async function getPaymentHistory(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Get wallet transactions
    const walletTransactions = await WalletTransaction.find({ user: userId })
      .populate('initiator', 'fullName email gameId role')
      .sort({ createdAt: -1 });

    // Get bids
    const bids = await Bid.find({ user: userId })
      .populate('game', 'status totalPool')
      .sort({ createdAt: -1 });

    // Get withdrawals
    const withdrawals = await Withdrawal.find({ user: userId })
      .populate('processedBy', 'fullName email gameId role')
      .sort({ createdAt: -1 });

    // Define the transaction type
    interface PaymentHistoryItem {
      _id: any;
      type: 'wallet_transaction' | 'bid' | 'withdrawal';
      amount: number;
      transactionType: string;
      walletType: 'main' | 'bonus';
      paymentMode: 'UPI' | 'Wallet';
      note?: string;
      status?: string;
      processedBy?: any;
      createdAt: Date;
      updatedAt?: Date;
      gameId?: any;
      gameStatus?: string;
      cardName?: string;
      cardType?: string;
      cardSuit?: string;
      quantity?: number;
      cardPrice?: number;
    }

    // Combine and format all transactions
    const paymentHistory: PaymentHistoryItem[] = [];

    // Add wallet transactions
    walletTransactions.forEach(txn => {
      // Determine if this is a credit or debit transaction
      let amount = txn.amount;
      if (txn.type === 'debit') {
        amount = -txn.amount; // Make debits negative
      }
      // recharge, refund, bonus remain positive (credits)
      
      paymentHistory.push({
        _id: txn._id,
        type: 'wallet_transaction',
        amount: amount,
        transactionType: txn.type, // recharge, debit, refund, bonus
        walletType: txn.walletType,
        paymentMode: txn.initiatorRole === 'admin' || txn.initiatorRole === 'agent' ? 'UPI' : 'Wallet',
        note: txn.note || '',
        processedBy: txn.initiator || null,
        createdAt: txn.createdAt,
        updatedAt: txn.updatedAt
      });
    });

    // Add bids - but filter out individual bid records when there's a wallet transaction for the same game
    const gamesWithWalletTransactions = new Set();
    
    // Find games that have wallet transactions for bid placement
    walletTransactions.forEach(txn => {
      if (txn.type === 'debit' && txn.note && txn.note.includes('Bid placement for game')) {
        // Extract game ID from note: "Bid placement for game 68b3ec24ab0a836e97be84ad - 12 cards, total amount: ₹120"
        const gameIdMatch = txn.note.match(/game ([a-f0-9]{24})/);
        if (gameIdMatch) {
          gamesWithWalletTransactions.add(gameIdMatch[1]);
        }
      }
    });
    
    // Only add bid records for games that don't have wallet transactions
    bids.forEach(bid => {
      const populatedGame = bid.game as any;
      const gameId = populatedGame?._id?.toString();
      
      // Skip this bid if there's a wallet transaction for the same game
      if (gamesWithWalletTransactions.has(gameId)) {
        return;
      }
      
      const totalAmount = bid.totalAmount || 0;
      const cardName = bid.cardName || 'Unknown Card';
      const formattedCardName = cardName !== 'Unknown Card' ? formatCardName(cardName) : cardName;
      const quantity = bid.quantity || 0;
      
      paymentHistory.push({
        _id: bid._id,
        type: 'bid',
        amount: -totalAmount, // Negative for debits
        transactionType: 'bid_placed',
        walletType: 'main', // Bids are always from main wallet
        paymentMode: 'Wallet',
        note: `Bid on ${formattedCardName} (${quantity}x)`,
        gameId: populatedGame?._id || null,
        gameStatus: populatedGame?.status || 'unknown',
        cardName: formattedCardName,
        cardType: bid.cardType || 'Unknown',
        cardSuit: bid.cardSuit || 'unknown',
        quantity: quantity,
        cardPrice: bid.cardPrice || 0,
        createdAt: bid.createdAt
      });
    });

    // Add withdrawals
    withdrawals.forEach(withdrawal => {
      paymentHistory.push({
        _id: withdrawal._id,
        type: 'withdrawal',
        amount: -withdrawal.amount, // Negative for debits
        transactionType: 'withdrawal',
        walletType: withdrawal.walletType,
        paymentMode: 'UPI', // Withdrawals are always UPI
        note: withdrawal.note || '',
        status: withdrawal.status,
        processedBy: withdrawal.processedBy || null,
        createdAt: withdrawal.createdAt,
        updatedAt: withdrawal.updatedAt
      });
    });

    // Sort by creation date (newest first)
    paymentHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Add pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedHistory = paymentHistory.slice(startIndex, endIndex);

    res.json({
      transactions: paginatedHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(paymentHistory.length / limit),
        totalTransactions: paymentHistory.length,
        hasNextPage: endIndex < paymentHistory.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
} 