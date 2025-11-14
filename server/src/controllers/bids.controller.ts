import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Bid } from '../models/bid.model';
import { Game } from '../models/game.model';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { User } from '../models/user.model';
import { Card } from '../models/card.model';
import { CardService } from '../services/card.service';
import { z } from 'zod';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { getCurrentISTTime, addMinutesIST } from '../utils/timezone';

const cardBidSchema = z.object({
  cardId: z.string(),
  quantity: z.number().min(1),
});

const placeBidSchema = z.object({
  gameId: z.string(),
  bids: z.array(cardBidSchema).min(1).max(20), // Allow 1-20 cards per request
});

const simpleBidSchema = z.object({
  gameId: z.string(),
  cardName: z.string(),
  amount: z.number().min(1),
});

export async function placeBid(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || (role !== 'user' && role !== 'agent')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const parse = placeBidSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  
  const { gameId, bids } = parse.data;
  
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  
  // Use database transaction to prevent race conditions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Validate game is in bidding phase
    const game = await Game.findById(gameId).session(session);
    if (!game || game.status !== 'open') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Game not open for bids' });
    }
    
    // Check if bidding time is still open
    if (getCurrentISTTime() > game.biddingEndTime) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Bidding is closed for this game' });
    }
    

    
    // Get user wallet with session
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Wallet not found' });
    }
    
    // Validate all cards and calculate total amount
    const cardBids = [];
    let totalAmount = 0;
    
    console.log(`🔍 Bid placement debug - User: ${userId}, Initial balance: ${wallet.main}`);
    
    for (const bid of bids) {
      if (!Types.ObjectId.isValid(bid.cardId)) {
        return res.status(400).json({ error: `Invalid card ID: ${bid.cardId}` });
      }
      
      const card = await Card.findById(bid.cardId);
      if (!card || !card.isActive) {
        return res.status(400).json({ error: `Card with ID ${bid.cardId} not available for bidding` });
      }
      
      const bidAmount = bid.quantity * card.currentPrice;
      totalAmount += bidAmount;
      
      console.log(`🔍 Card: ${card.name}, Quantity: ${bid.quantity}, Price: ${card.currentPrice}, Bid Amount: ${bidAmount}`);
      
      cardBids.push({
        card,
        quantity: bid.quantity,
        bidAmount
      });
    }
    
    console.log(`🔍 Total amount calculated: ${totalAmount}`);
    
    // Check if user has sufficient balance
    if (wallet.main < totalAmount) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        required: totalAmount, 
        available: wallet.main 
      });
    }
    
    // Process all bids within transaction
    const createdBids = [];
    
    for (const cardBid of cardBids) {
      const bid = await Bid.create([{
        user: userId,
        game: gameId,
        cardName: cardBid.card.name,
        cardType: cardBid.card.card,
        cardSuit: cardBid.card.suit,
        quantity: cardBid.quantity,
        totalAmount: cardBid.bidAmount,
        cardPrice: cardBid.card.currentPrice
      }], { session });
      
      createdBids.push(bid[0]);
      
      // Update card statistics
      await CardService.updateCardStats(cardBid.card.name, cardBid.bidAmount);
    }
    
    // Update wallet within transaction
    console.log(`🔍 Before wallet update - Balance: ${wallet.main}, Deducting: ${totalAmount}`);
    wallet.main -= totalAmount;
    await wallet.save({ session });
    console.log(`🔍 After wallet update - New balance: ${wallet.main}`);
    
    // Log wallet transaction for bid deduction within transaction
    await WalletTransaction.create([{
      user: userId,
      initiator: userId,
      initiatorRole: 'system',
      amount: totalAmount,
      walletType: 'main',
      type: 'debit',
      note: `Bid placement for game ${gameId} - ${bids.length} cards, total amount: ₹${totalAmount}`
    }], { session });
    
    // Update game pool within transaction
    game.totalPool += totalAmount;
    await game.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    res.status(201).json({ 
      message: 'Bids placed successfully', 
      bids: createdBids,
      totalAmount,
      newBalance: wallet.main,
      totalPool: game.totalPool
    });
  } catch (error: any) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  } finally {
    // End the session
    session.endSession();
  }
}

export async function listUserBids(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let filter: any = {};
    
    if (role === 'user') {
      filter.user = userId;
    } else if (role === 'agent') {
      // Find all users assigned to this agent
      const users = await User.find({ assignedAgent: userId }).select('_id');
      const userIds = users.map(u => u._id);
      filter.user = { $in: userIds };
    }
    // Admin can see all
    
    const bids = await Bid.find(filter)
      .populate('user', 'fullName email phone gameId')
      .populate('game', 'timeWindow status totalPool startTime biddingEndTime')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(bids);
  } catch (error: any) {
    console.error('Error listing bids:', error);
    res.status(500).json({ error: 'Failed to list bids' });
  }
}

export async function getOngoingBids(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    let filter: any = {};
    
    if (role === 'user') {
      filter.user = userId;
    } else if (role === 'agent') {
      // Find all users assigned to this agent
      const users = await User.find({ assignedAgent: userId }).select('_id');
      const userIds = users.map(u => u._id);
      filter.user = { $in: userIds };
    }
    // Admin can see all ongoing bids
    
    // Get recent bids (last 24 hours) for the user
    const twentyFourHoursAgo = addMinutesIST(getCurrentISTTime(), -1440); // 24 hours ago
    filter.createdAt = { $gte: twentyFourHoursAgo };
    
    const ongoingBids = await Bid.find(filter)
      .populate('user', 'fullName email phone gameId')
      .populate('game', 'timeWindow status totalPool startTime biddingEndTime')
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 bids
    
    res.json(ongoingBids);
  } catch (error: any) {
    console.error('Error getting ongoing bids:', error);
    res.status(500).json({ error: 'Failed to get ongoing bids' });
  }
}

// New function for ongoing bids in open games only
export async function getOpenGameBids(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    // First, find the current open game
    const currentGame = await Game.findOne({ status: 'open' }).sort({ createdAt: -1 });
    
    if (!currentGame) {
      return res.json([]); // No open game, so no ongoing bids
    }
    
    let filter: any = {
      game: currentGame._id // Only bids for the current open game
    };
    
    if (role === 'user') {
      filter.user = userId;
    } else if (role === 'agent') {
      // Find all users assigned to this agent
      const users = await User.find({ assignedAgent: userId }).select('_id');
      const userIds = users.map(u => u._id);
      filter.user = { $in: userIds };
    }
    // Admin can see all ongoing bids
    
    const openGameBids = await Bid.find(filter)
      .populate('user', 'fullName email phone gameId')
      .populate('game', 'timeWindow status totalPool startTime biddingEndTime')
      .sort({ createdAt: -1 });

    // Group bids by card and aggregate quantities and amounts
    const groupedBids = openGameBids.reduce((acc: any[], bid: any) => {
      const cardKey = `${bid.cardType}_${bid.cardSuit}`;
      const existingBid = acc.find(groupedBid => 
        groupedBid.cardType === bid.cardType && 
        groupedBid.cardSuit === bid.cardSuit
      );

      if (existingBid) {
        // Update existing grouped bid
        existingBid.quantity += bid.quantity;
        existingBid.totalAmount += bid.totalAmount;
        existingBid.bidCount = (existingBid.bidCount || 1) + 1;
        // Keep the most recent creation time
        if (new Date(bid.createdAt) > new Date(existingBid.createdAt)) {
          existingBid.createdAt = bid.createdAt;
        }
      } else {
        // Create new grouped bid
        acc.push({
          _id: bid._id,
          cardName: bid.cardName,
          cardType: bid.cardType,
          cardSuit: bid.cardSuit,
          quantity: bid.quantity,
          totalAmount: bid.totalAmount,
          cardPrice: bid.cardPrice,
          createdAt: bid.createdAt,
          game: bid.game,
          bidCount: 1
        });
      }

      return acc;
    }, []);

    // Sort by most recent first
    groupedBids.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(groupedBids);
  } catch (error: any) {
    console.error('Error getting open game bids:', error);
    res.status(500).json({ error: 'Failed to get open game bids' });
  }
}

export async function listGameBids(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { gameId } = req.params;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  
  try {
    const bids = await Bid.find({ game: gameId })
      .populate('user', 'fullName email phone gameId assignedAgent')
      .populate('game', 'timeWindow status totalPool startTime biddingEndTime')
      .sort({ createdAt: -1 });
    
    res.json(bids);
  } catch (error: any) {
    console.error('Error listing game bids:', error);
    res.status(500).json({ error: 'Failed to list game bids' });
  }
}

export async function getCardAnalytics(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const { gameId } = req.params;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  
  try {
    const analytics = await CardService.getCardAnalytics(gameId);
    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting card analytics:', error);
    res.status(500).json({ error: 'Failed to get card analytics' });
  }
}

// Simple bid placement for frontend
export async function placeSimpleBid(req: AuthRequest, res: Response) {
  const { id: userId, role } = req.user || {};
  if (!userId || role !== 'user') return res.status(403).json({ error: 'Forbidden' });
  
  const parse = simpleBidSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  const { gameId, cardName, amount } = parse.data;
  
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });
  
  try {
    // Validate game is in bidding phase
    const game = await Game.findById(gameId);
    if (!game || game.status !== 'open') {
      return res.status(400).json({ error: 'Game not open for bids' });
    }
    
    // Check if bidding time is still open
    if (getCurrentISTTime() > game.biddingEndTime) {
      return res.status(400).json({ error: 'Bidding is closed for this game' });
    }
    

    
    // Get user wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }
    
    console.log(`🔍 Simple bid debug - User: ${userId}, Card: ${cardName}, Amount: ${amount}, Current balance: ${wallet.main}`);
    
    // Check if user has sufficient balance
    if (wallet.main < amount) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        required: amount, 
        available: wallet.main 
      });
    }
    
    // Extract card value and suit from cardName (e.g., "A♠" -> value: "A", suit: "spades")
    const cardValue = cardName.slice(0, -1); // Everything except last character
    const cardSymbol = cardName.slice(-1); // Last character
    
    // Map symbol to suit name
    const suitMap: Record<string, string> = {
      '♣': 'clubs',
      '♦': 'diamonds', 
      '♠': 'spades',
      '♥': 'hearts'
    };
    
    const cardSuit = suitMap[cardSymbol];
    if (!cardSuit) {
      return res.status(400).json({ error: 'Invalid card suit' });
    }
    
    // Create bid
    const bid = await Bid.create({
      user: userId,
      game: gameId,
      cardName: cardName,
      cardType: cardValue,
      cardSuit: cardSuit,
      quantity: 1,
      totalAmount: amount,
      cardPrice: amount
    });
    
    // Deduct amount from wallet
    console.log(`🔍 Before simple bid wallet update - Balance: ${wallet.main}, Deducting: ${amount}`);
    wallet.main -= amount;
    await wallet.save();
    console.log(`🔍 After simple bid wallet update - New balance: ${wallet.main}`);
    
    // Log wallet transaction for bid deduction
    await WalletTransaction.create({
      user: userId,
      initiator: userId,
      initiatorRole: 'system',
      amount: amount,
      walletType: 'main',
      type: 'debit',
      note: `Simple bid placement for game ${gameId} - card ${cardName}, amount: ₹${amount}`
    });
    
    // Update game pool
    game.totalPool += amount;
    await game.save();
    
    res.json({ 
      message: 'Bid placed successfully', 
      bid: bid,
      newBalance: wallet.main,
      totalPool: game.totalPool
    });
    
  } catch (error: any) {
    console.error('Error placing simple bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
} 