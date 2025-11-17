import { Request, Response } from 'express';
import { Game } from '../models/game.model';
import { ManualOverride } from '../models/manual-override.model';
import { Bid } from '../models/bid.model';
import { Wallet } from '../models/wallet.model';
import { CommissionSettings } from '../models/commission.model';
import { User } from '../models/user.model';
import { Card } from '../models/card.model';
import { CardService } from '../services/card.service';
import { CommissionService } from '../services/commission.service';
import { declareWinner, getBiddingDuration, getBreakDuration, getTotalGameDuration, displayToDatabaseFormat } from '../utils/game-automation';
import { getIO } from '../utils/socket-io';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Result } from '../models/result.model';
import { getCurrentISTTime, addMinutesIST, getStartOfDayIST, getEndOfDayIST, createISTDate, getCurrentTimeWindowIST, getNextTimeWindowIST, toIST, istToUTC } from '../utils/timezone';

const createGameSchema = z.object({
  timeWindow: z.string(),
});

export async function createGame(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  const parse = createGameSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });
  
  const { timeWindow } = parse.data;
  const exists = await Game.findOne({ timeWindow });
  if (exists) return res.status(409).json({ error: 'Game already exists for this window' });
  
  // Calculate the proper start time for this time window (at the beginning of the 30-minute slot)
  const startTime = getCurrentISTTime(); // Use IST time instead of UTC timeWindow
  const biddingEndTime = addMinutesIST(startTime, getBiddingDuration());
  const gameEndTime = addMinutesIST(startTime, getTotalGameDuration());
  
  const game = await Game.create({ 
    timeWindow, 
    status: 'open', 
    totalPool: 0,
    startTime: startTime,
    biddingEndTime,
    gameEndTime
  });
  
  res.status(201).json(game);
}

export async function listGames(req: AuthRequest, res: Response) {
  try {
    const { status } = req.query;
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string, 10) || 50, 1);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    
    // Counts for summary cards
    const [totalGames, openGames, waitingResultGames, declaredGames, totalResults] = await Promise.all([
      Game.countDocuments(),
      Game.countDocuments({ status: 'open' }),
      Game.countDocuments({ status: 'waiting_result' }),
      Game.countDocuments({ status: 'result_declared' }),
      Game.countDocuments(filter),
    ]);

    const games = await Game.find(filter)
      .populate('declaredBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Add total payout for declared games
    const gamesWithPayout = await Promise.all(
      games.map(async (game) => {
        const gameObj = game.toObject() as any;
        
        if (game.status === 'result_declared') {
          // Get the result to find total payout
          const result = await Result.findOne({ game: game._id });
          if (result) {
            gameObj.totalPayout = result.totalWinningAmount;
          } else {
            gameObj.totalPayout = 0;
          }
        } else {
          gameObj.totalPayout = 0;
        }
        
        return gameObj;
      })
    );
    
    res.json({
      games: gamesWithPayout,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalResults / limit),
        totalResults,
        pageSize: limit,
      },
      counts: {
        totalGames,
        openGames,
        waitingResultGames,
        declaredGames,
      },
    });
  } catch (error: any) {
    console.error('Error listing games:', error);
    res.status(500).json({ error: 'Failed to list games' });
  }
}

export async function getGame(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid game id' });
  
  try {
    const game = await Game.findById(id).populate('declaredBy', 'fullName email');
    if (!game) return res.status(404).json({ error: 'Game not found' });
    
    // Get card analytics for this game
    const cardAnalytics = await CardService.getCardAnalytics(id);
    
    res.json({ game, cardAnalytics });
  } catch (error: any) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
}

export async function getGameTimer(req: Request, res: Response) {
  try {
    const now = getCurrentISTTime();
    
    // Find the currently active game
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    }).sort({ startTime: -1 });

    if (!activeGame) {
      // No active game, return default timer state
      const defaultStartTime = now;
      const defaultBiddingEndTime = addMinutesIST(now, getBiddingDuration());
      const defaultGameEndTime = addMinutesIST(now, getTotalGameDuration());
      
      return res.json({
        currentTime: getBiddingDuration() * 60,
        gameStartTime: defaultStartTime.toISOString(),
        biddingEndTime: defaultBiddingEndTime.toISOString(),
        gameEndTime: defaultGameEndTime.toISOString(),
        resultTime: defaultGameEndTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        isBreak: false,
        gameStatus: 'open',
        activeGameId: null
      });
    }

    // Calculate remaining time
    let currentTime: number;
    let isBreak: boolean;
    
    if (activeGame.status === 'open') {
      // Game is in bidding phase
      const timeUntilBiddingEnd = Math.max(0, toIST(activeGame.biddingEndTime).getTime() - now.getTime());
      currentTime = Math.floor(timeUntilBiddingEnd / 1000);
      isBreak = false;
    } else {
      // Game is in break phase (bidding closed, waiting for result)
      const timeUntilGameEnd = Math.max(0, toIST(activeGame.gameEndTime).getTime() - now.getTime());
      currentTime = Math.floor(timeUntilGameEnd / 1000);
      isBreak = true;
    }

    // Calculate result time (should be at game end time)
    const resultTime = toIST(activeGame.gameEndTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    res.json({
      currentTime,
      gameStartTime: toIST(activeGame.startTime).toISOString(),
      biddingEndTime: toIST(activeGame.biddingEndTime).toISOString(),
      gameEndTime: toIST(activeGame.gameEndTime).toISOString(),
      resultTime,
      isBreak,
      gameStatus: activeGame.status,
      activeGameId: activeGame._id?.toString() || null
    });
  } catch (error: any) {
    console.error('Error getting game timer:', error);
    res.status(500).json({ error: 'Failed to get game timer' });
  }
}

export async function getGameResult(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { gameId } = req.params;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.status !== 'result_declared') {
      return res.status(400).json({ error: 'Game result not declared yet' });
    }

    res.json({
      gameId: game._id,
      winningCard: game.winningCard ? formatCardName(game.winningCard) : '',
      totalPool: game.totalPool,
      resultDeclaredAt: game.resultDeclaredAt
    });
  } catch (error) {
    console.error('Error getting game result:', error);
    res.status(500).json({ error: 'Failed to get game result' });
  }
}

export async function getGameWinners(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const gameId = req.params.id;
  if (!Types.ObjectId.isValid(gameId)) return res.status(400).json({ error: 'Invalid game id' });

  try {
    // Find the result for this game
    const result = await Result.findOne({ gameId: gameId });
    if (!result) return res.status(404).json({ error: 'Game result not found' });

    // If no winners, return an empty payload with 200 so UI can show friendly message
    if (!result.winners || result.winners.length === 0) {
      return res.json({
        gameId: result.gameId,
        winningCard: result.winningCard,
        totalWinners: 0,
        totalWinningAmount: 0,
        winners: []
      });
    }

    // Return winner details
    res.json({
      gameId: result.gameId,
      winningCard: result.winningCard,
      totalWinners: result.totalWinners,
      totalWinningAmount: result.totalWinningAmount,
      winners: result.winners.map(winner => ({
        userId: winner.userId,
        userName: winner.userName,
        userEmail: winner.userEmail,
        bidAmount: winner.bidAmount,
        payoutAmount: winner.payoutAmount,
        cardName: winner.cardName,
        cardType: winner.cardType,
        cardSuit: winner.cardSuit,
        quantity: winner.quantity
      }))
    });
  } catch (error) {
    console.error('Error getting game winners:', error);
    res.status(500).json({ error: 'Failed to get game winners' });
  }
}

export async function getUserGameHistory(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination first (we'll recalculate after grouping)
    const totalBids = await Bid.countDocuments({ user: userId });

    // We'll calculate totalPages after grouping

    // Get all user bids with game information
    const userBids = await Bid.find({ user: userId })
      .populate('game', 'status resultDeclaredAt updatedAt winningCard totalPool timeWindow')
      .select('game cardName cardType cardSuit quantity totalAmount createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Group bids by game and card
    const groupedBids = userBids.reduce((acc: any[], bid: any) => {
      const game = bid.game as any;
      const cardKey = `${game?._id || 'no-game'}_${bid.cardType}_${bid.cardSuit}`;
      
      const existingBid = acc.find(groupedBid => 
        groupedBid.gameId?._id?.toString() === game?._id?.toString() &&
        groupedBid.bid.cardType === bid.cardType && 
        groupedBid.bid.cardSuit === bid.cardSuit
      );

      if (existingBid) {
        // Update existing grouped bid
        existingBid.bid.quantity += bid.quantity || 0;
        existingBid.bid.totalAmount += bid.totalAmount || 0;
        existingBid.bidCount = (existingBid.bidCount || 1) + 1;
        // Keep the most recent creation time
        if (new Date(bid.createdAt) > new Date(existingBid.date)) {
          existingBid.date = bid.createdAt;
        }
        
        // Update win status for existing bid if game result is declared
        if (game?.status === 'result_declared') {
          const formattedWinningCard = game?.winningCard ? formatCardName(game.winningCard) : '';
          const formattedBidCard = bid.cardName ? formatCardName(bid.cardName) : '';
          const isWin = formattedWinningCard === formattedBidCard;
          
          console.log(`🔍 Updating existing bid win status - Game: ${game?._id}, Winning: "${formattedWinningCard}", Bid: "${formattedBidCard}", IsWin: ${isWin}`);
          
          existingBid.result = isWin ? 'Win' : 'Loss';
        }
      } else {
        // Create new grouped bid
        // Compare formatted card names for win condition
        const formattedWinningCard = game?.winningCard ? formatCardName(game.winningCard) : '';
        const formattedBidCard = bid.cardName ? formatCardName(bid.cardName) : '';
        const isWin = formattedWinningCard === formattedBidCard;
        
        console.log(`🔍 Win condition check - Game: ${game?._id}, Winning: "${formattedWinningCard}", Bid: "${formattedBidCard}", IsWin: ${isWin}`);
        
        // Determine result based on game status
        let result = 'Loss';
        if (game?.status === 'open' || game?.status === 'waiting_result') {
          result = 'Open';
        } else if (game?.status === 'result_declared' && isWin) {
          result = 'Win';
        }

        acc.push({
          _id: `${bid._id}_${bid.cardName || 'unknown'}`,
          gameId: bid.game,
          date: bid.createdAt,
          bid: {
            cardType: bid.cardType || '',
            cardSuit: bid.cardSuit || '',
            cardName: formatCardName(bid.cardName || ''),
            quantity: bid.quantity || 0,
            totalAmount: bid.totalAmount || 0
          },
          result: result,
          gameStatus: game?.status || 'unknown',
          totalPool: game?.totalPool || 0,
          winningCard: game?.winningCard ? formatCardName(game.winningCard) : '',
          timeWindow: game?.timeWindow || '',
          bidCount: 1
        });
      }

      return acc;
    }, []);

    // Sort by most recent first and apply pagination
    groupedBids.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Apply pagination to grouped results
    const paginatedHistory = groupedBids.slice(skip, skip + limit);

    // Calculate pagination based on grouped results
    const totalGroupedBids = groupedBids.length;
    const totalPages = Math.ceil(totalGroupedBids / limit);
    
    // Check if requested page is beyond available pages
    if (page > totalPages && totalPages > 0) {
      return res.status(400).json({ 
        error: 'Page number exceeds available pages',
        pagination: {
          currentPage: 1,
          totalPages: totalPages,
          totalGames: totalGroupedBids,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    res.json({
      history: paginatedHistory,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalGames: totalGroupedBids,
        hasNextPage: skip + limit < totalGroupedBids,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting user game history:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
}

export async function getActiveGame(req: Request, res: Response) {
  try {
    const now = getCurrentISTTime();
    
    // Find the currently active game
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    }).populate('declaredBy', 'fullName email').sort({ startTime: -1 });

    if (!activeGame) {
      return res.status(404).json({ error: 'No active game found' });
    }

    // Get card analytics for this game
    const cardAnalytics = await CardService.getCardAnalytics(activeGame._id?.toString() || '');
    
    res.json({ game: activeGame, cardAnalytics });
  } catch (error: any) {
    console.error('Error getting active game:', error);
    res.status(500).json({ error: 'Failed to get active game' });
  }
}

export async function declareWinnerManually(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid game id' });

  const declareWinnerSchema = z.object({
    winningCard: z.string(),
    isRandom: z.boolean().optional()
  });
  const parse = declareWinnerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });

  const { winningCard, isRandom = false } = parse.data;

  try {
    const game = await Game.findById(id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'waiting_result') {
      return res.status(400).json({ error: 'Can only preset winner during break (waiting_result) phase' });
    }

    // Only preset the winning card. Result will be declared by scheduler at gameEndTime
    game.winningCard = winningCard;
    game.isRandomResult = isRandom;
    game.declaredBy = new Types.ObjectId(req.user.id);
    await game.save();

    return res.json({
      message: 'Winner preset successfully. Result will be declared at scheduled time.',
      gameId: game._id,
      winningCard,
      gameEndTime: game.gameEndTime
    });
  } catch (error) {
    console.error('Error presetting manual winner:', error);
    return res.status(500).json({ error: 'Failed to preset winner' });
  }
}

export async function getActiveCards(req: AuthRequest, res: Response) {
  try {
    // Check if user is admin - if so, return all cards, otherwise only active cards
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (isAdmin) {
      // Admin dashboard - show all cards
      const cards = await CardService.getAllCards();
      res.json(cards);
    } else {
      // Game interface - show only active cards
      const cards = await CardService.getActiveCards();
      res.json(cards);
    }
  } catch (error: any) {
    console.error('Error getting cards:', error);
    res.status(500).json({ error: 'Failed to get cards' });
  }
}

export async function getCardsByType(req: AuthRequest, res: Response) {
  const { cardType } = req.params;
  
  try {
    // Check if user is admin - if so, return all cards of this type, otherwise only active cards
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (isAdmin) {
      // Admin dashboard - show all cards of this type
      const cards = await Card.find({ card: cardType }).sort({ suit: 1 });
      res.json(cards);
    } else {
      // Game interface - show only active cards of this type
      const cards = await CardService.getCardsByType(cardType);
      res.json(cards);
    }
  } catch (error: any) {
    console.error('Error getting cards by type:', error);
    res.status(500).json({ error: 'Failed to get cards by type' });
  }
}

export async function getCardsBySuit(req: AuthRequest, res: Response) {
  const { suit } = req.params;
  
  try {
    // Check if user is admin - if so, return all cards of this suit, otherwise only active cards
    const isAdmin = req.user && req.user.role === 'admin';
    
    if (isAdmin) {
      // Admin dashboard - show all cards of this suit
      const cards = await Card.find({ suit }).sort({ card: 1 });
      res.json(cards);
    } else {
      // Game interface - show only active cards of this suit
      const cards = await CardService.getCardsBySuit(suit);
      res.json(cards);
    }
  } catch (error: any) {
    console.error('Error getting cards by suit:', error);
    res.status(500).json({ error: 'Failed to get cards by suit' });
  }
}

// Test endpoint to check card statuses
export async function getCardStatuses(req: AuthRequest, res: Response) {
  try {
    const cards = await Card.find({}).select('_id name isActive updatedAt');
    console.log('All card statuses:', cards.map(c => ({ id: c._id, name: c.name, isActive: c.isActive })));
    res.json({ cards });
  } catch (error: any) {
    console.error('Error getting card statuses:', error);
    res.status(500).json({ error: 'Failed to get card statuses' });
  }
}

// Reset all cards to active (for testing)
export async function resetAllCardsToActive(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  
  try {
    const result = await Card.updateMany({}, { isActive: true });
    console.log('Reset result:', result);
    res.json({ 
      message: `Reset ${result.modifiedCount} cards to active status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    console.error('Error resetting cards:', error);
    res.status(500).json({ error: 'Failed to reset cards' });
  }
}

export async function toggleCardActiveStatus(req: AuthRequest, res: Response) {
  console.log('Toggle card active status called');
  console.log('User:', req.user);
  console.log('Headers:', req.headers);
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('Forbidden: User not admin or not authenticated');
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { id } = req.params;
  console.log('Card ID:', id);
  
  if (!Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid card id' });
  
  try {
    // First, let's check what's in the database
    const initialCard = await Card.findById(id);
    if (!initialCard) return res.status(404).json({ error: 'Card not found' });
    
    console.log('=== TOGGLE DEBUG START ===');
    console.log('Initial card status from DB:', initialCard.isActive);
    console.log('Initial card data:', {
      _id: initialCard._id,
      name: initialCard.name,
      isActive: initialCard.isActive,
      updatedAt: initialCard.updatedAt
    });
    
    // Toggle the active status
    const oldStatus = initialCard.isActive;
    const newStatus = !oldStatus;
    
    console.log('Toggle operation:', `${oldStatus} -> ${newStatus}`);
    
    // Update the card
    const updateResult = await Card.findByIdAndUpdate(
      id,
      { 
        isActive: newStatus,
        updatedBy: new Types.ObjectId(req.user.id)
      },
      { new: true, runValidators: true }
    );
    
    console.log('Update result:', updateResult);
    
    // Fetch the card again to verify the save
    const finalCard = await Card.findById(id);
    console.log('Final card status from DB:', finalCard?.isActive);
    console.log('Final card data:', {
      _id: finalCard?._id,
      name: finalCard?.name,
      isActive: finalCard?.isActive,
      updatedAt: finalCard?.updatedAt
    });
    console.log('=== TOGGLE DEBUG END ===');
    
    res.json({ 
      message: `Card ${finalCard?.isActive ? 'activated' : 'deactivated'} successfully`, 
      card: finalCard || updateResult
    });
  } catch (error: any) {
    console.error('Error toggling card active status:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle card status' });
  }
} 

export async function getGameResults(req: AuthRequest, res: Response) {
  const { id: userId } = req.user || {};
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Get all results where the user was a winner
    const userResults = await Result.find({
      'winners.userId': userId
    })
      .sort({ resultDeclaredAt: -1 })
      .limit(50);

    // Get all results for admin/agent view
    const allResults = await Result.find({})
      .sort({ resultDeclaredAt: -1 })
      .limit(50);

    // Determine which results to return based on user role
    const { role } = req.user || {};
    const results = role === 'admin' || role === 'agent' ? allResults : userResults;

    // Add pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      results: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        totalResults: results.length,
        hasNextPage: endIndex < results.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting game results:', error);
    res.status(500).json({ error: 'Failed to get game results' });
  }
}

// Helper function to format card name consistently
function formatCardName(cardName: string): string {
  // Handle null, undefined, or empty cardName
  if (!cardName || typeof cardName !== 'string') {
    return '';
  }
  
  // If it's already in the format "A ♠" (with space), return as is
  if (cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)\s+([\u2660-\u2667])/)) {
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
  
  // If it's in format "A ♠" (with optional space), ensure consistent spacing
  if (cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)\s*([\u2660-\u2667])/)) {
    const match = cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)\s*([\u2660-\u2667])/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }
  
  // Fallback: return as is
  return cardName;
}

export async function getTodayResults(req: Request, res: Response) {
  try {
    // Get today's date range in IST timezone
    const now = getCurrentISTTime();
    
    // Create start of today (00:00:00) in IST timezone
    const startOfDay = getStartOfDayIST(now);
    
    // Create end of today (23:59:59.999) in IST timezone
    const endOfDay = getEndOfDayIST(now);

    console.log('Today Results Query:', {
      now: now.toISOString(),
      istTime: now.toString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      startOfDayIST: startOfDay.toString(),
      endOfDayIST: endOfDay.toString()
    });

    // Get only PAST results from today (results that have already been declared)
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfDay,
        $lte: now // Only up to current time, not end of day
      }
    })
      .sort({ resultDeclaredAt: -1 }) // Sort by time descending (most recent first)
      .select('winningCard resultDeclaredAt')
      .limit(50);

    console.log('Today Results Found:', todayResults.length, 'results');
    if (todayResults.length > 0) {
      console.log('Sample results:', todayResults.slice(0, 3).map(r => ({
        card: r.winningCard,
        declaredAt: r.resultDeclaredAt
      })));
    }

    // Format results for frontend
    const formattedResults = todayResults.map(result => {
      const resultTime = toIST(new Date(result.resultDeclaredAt));
      const timeString = resultTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return {
        time: timeString,
        result: formatCardName(result.winningCard),
        timezone: 'Asia/Kolkata' // Indicate this is IST time
      };
    });

    res.json(formattedResults);

  } catch (error) {
    console.error('Error getting today\'s results:', error);
    res.status(500).json({ error: 'Failed to get today\'s results' });
  }
}

export async function getResultsByDateRange(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Parse dates and handle timezone properly
    const startDateStr = startDate as string;
    const endDateStr = endDate as string;
    
    // Create dates in IST timezone
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    
    // Create start of day for start date (00:00:00) in IST
    const startIST = createISTDate(startYear, startMonth, startDay, 0, 0, 0);
    
    // Create end of day for end date (23:59:59.999) in IST using getEndOfDayIST
    const endDateIST = createISTDate(endYear, endMonth, endDay, 0, 0, 0);
    const endIST = getEndOfDayIST(endDateIST);

    // Convert IST dates to UTC for MongoDB query (MongoDB stores dates in UTC)
    const start = istToUTC(startIST);
    const end = istToUTC(endIST);

    console.log('Date range query:', {
      startDate: startDateStr,
      endDate: endDateStr,
      startIST: startIST.toISOString(),
      endIST: endIST.toISOString(),
      startUTC: start.toISOString(),
      endUTC: end.toISOString()
    });

    // Get results within date range
    // For today's date, only include results up to current time
    const now = getCurrentISTTime();
    const todayDateStr = now.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD in IST
    const isEndDateToday = endDateStr === todayDateStr;
    
    const queryFilter: any = {
      resultDeclaredAt: {
        $gte: start
      }
    };
    
    if (isEndDateToday) {
      // If end date is today, only include results up to current time
      queryFilter.resultDeclaredAt.$lte = istToUTC(now);
    } else {
      // For past dates, include all results for that day
      queryFilter.resultDeclaredAt.$lte = end;
    }

    console.log('Query filter:', queryFilter);

    const results = await Result.find(queryFilter)
      .sort({ resultDeclaredAt: -1 }) // Sort by time descending (most recent first)
      .select('winningCard resultDeclaredAt gameStartTime');

    // Format results for frontend
    const formattedResults = results.map(result => {
      // Use resultDeclaredAt for display (when the result was declared) instead of gameStartTime
      const resultDeclaredTime = toIST(new Date(result.resultDeclaredAt));
      const timeString = resultDeclaredTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const dateString = resultDeclaredTime.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-'); // Convert DD/MM/YYYY to DD-MM-YYYY format

      return {
        time: timeString,
        result: formatCardName(result.winningCard),
        date: dateString,
        timezone: 'Asia/Kolkata' // Indicate this is IST time
      };
    });

    res.json(formattedResults);

  } catch (error) {
    console.error('Error getting results by date range:', error);
    res.status(500).json({ error: 'Failed to get results by date range' });
  }
} 

export async function getLastDeclaredResult(req: Request, res: Response) {
  try {
    // Get today's date range (start of day to end of day) in IST
    const today = getCurrentISTTime();
    const startOfDay = getStartOfDayIST(today);
    const endOfDay = getEndOfDayIST(today);

    // Get the latest PAST result from today only (results that have already been declared)
    const lastResult = await Result.findOne({
      resultDeclaredAt: {
        $gte: startOfDay,
        $lte: today // Only up to current time, not end of day
      }
    })
      .sort({ resultDeclaredAt: -1 })
      .select('winningCard resultDeclaredAt gameStartTime');

    if (!lastResult) {
      return res.json({
        time: "N/A",
        result: "N/A"
      });
    }

    const formattedCard = formatCardName(lastResult.winningCard);
    const time = toIST(new Date(lastResult.resultDeclaredAt)).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });



    res.json({
      time,
      result: formattedCard,
      timezone: 'Asia/Kolkata' // Indicate this is IST time
    });
  } catch (error: any) {
    console.error('Error getting last declared result:', error);
    res.status(500).json({ error: 'Failed to get last declared result' });
  }
}

export async function getResultsChart(req: AuthRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    // Get results with pagination
    const results = await Result.find()
      .sort({ resultDeclaredAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('winningCard resultDeclaredAt');

    // Get total count for pagination
    const totalResults = await Result.countDocuments();

    // Format the results for the chart - simple format like today-results
    const formattedResults = results.map(result => {
      const resultTime = toIST(new Date(result.resultDeclaredAt));
      const timeString = resultTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const dateString = resultTime.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-'); // Convert DD/MM/YYYY to DD-MM-YYYY format

      return {
        time: timeString,
        date: dateString,
        result: formatCardName(result.winningCard)
      };
    });

    const totalPages = Math.ceil(totalResults / limit);

    res.json({
      results: formattedResults,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    console.error('Error getting results chart:', error);
    res.status(500).json({ error: 'Failed to get results chart' });
  }
}

// Helper function to extract card rank and suit
function extractCardInfo(cardName: string): { cardRank: string; cardSuit: string } {
  // If it's in format "jack_of_clubs", convert to "J" and "♣"
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
      return { cardRank, cardSuit: suitSymbol };
    }
  }
  
  // If it's in format "A♠" (no space), extract directly
  if (cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)[\u2660-\u2667]/)) {
    const cardValue = cardName.slice(0, -1);
    const suitSymbol = cardName.slice(-1);
    return { cardRank: cardValue, cardSuit: suitSymbol };
  }
  
  // If it's in format "A ♠" (with space), extract
  if (cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)\s*([\u2660-\u2667])/)) {
    const match = cardName.match(/^(J|K|Q|A|10|9|8|7|6|5|4|3|2)\s*([\u2660-\u2667])/);
    if (match) {
      return { cardRank: match[1], cardSuit: match[2] };
    }
  }
  
  // Fallback: return as is
  return { cardRank: cardName, cardSuit: '?' };
}

// Display Order Management Endpoints

export async function updateCardDisplayOrder(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { cardName } = req.params;
  const { newOrder } = req.body;

  if (!cardName || typeof newOrder !== 'number' || newOrder < 1) {
    return res.status(400).json({ error: 'Invalid input. cardName and newOrder (number >= 1) are required.' });
  }

  try {
    const result = await CardService.updateCardDisplayOrder(cardName, newOrder, req.user.id);
    res.json({
      message: `Card display order updated successfully`,
      result
    });
  } catch (error: any) {
    console.error('Error updating card display order:', error);
    res.status(400).json({ error: error.message });
  }
}

export async function bulkUpdateDisplayOrders(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Invalid input. updates array is required.' });
  }

  // Validate each update
  for (const update of updates) {
    if (!update.cardName || typeof update.newOrder !== 'number' || update.newOrder < 1) {
      return res.status(400).json({ 
        error: 'Invalid update format. Each update must have cardName and newOrder (number >= 1).' 
      });
    }
  }

  try {
    const results = await CardService.bulkUpdateDisplayOrders(updates, req.user.id);
    res.json({
      message: 'Bulk display order update completed',
      results
    });
  } catch (error: any) {
    console.error('Error bulk updating display orders:', error);
    res.status(500).json({ error: 'Failed to bulk update display orders' });
  }
}

export async function initializeDisplayOrders(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await CardService.initializeDisplayOrders();
    res.json({
      message: 'Display orders initialized successfully',
      result
    });
  } catch (error: any) {
    console.error('Error initializing display orders:', error);
    res.status(500).json({ error: 'Failed to initialize display orders' });
  }
}

// Manual game creation removed - games are only created by automated timer
// This prevents conflicts and ensures consistent game scheduling 