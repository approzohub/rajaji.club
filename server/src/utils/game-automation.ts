// Set timezone environment variable at the very beginning
process.env.TZ = 'Asia/Kolkata';

import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import cron from 'node-cron';
import { randomInt } from 'crypto';
import { Game } from '../models/game.model';
import { ManualOverride } from '../models/manual-override.model';
import { Bid } from '../models/bid.model';
import { Wallet } from '../models/wallet.model';
import { WalletTransaction } from '../models/wallet-transaction.model';
import { Card } from '../models/card.model';
import { CardService } from '../services/card.service';
import { CommissionService } from '../services/commission.service';
import { Result } from '../models/result.model';
import { User } from '../models/user.model';
import { getIO } from './socket-io';
import { Types } from 'mongoose';
import { 
  getCurrentISTTime, 
  addMinutesIST, 
  getCurrentTimeWindowIST, 
  getNextTimeWindowIST, 
  getStartOfDayIST, 
  getEndOfDayIST, 
  toIST,
  getCurrentThirtyMinuteSlot,
  getNextThirtyMinuteSlot,
  getPreviousThirtyMinuteSlot,
  isWithinThirtyMinuteSlot,
  getSpecificThirtyMinuteSlot,
  getAllTimeSlotsForDate,
  getTimeSlotIndex,
  getTimeSlotByIndex
} from './timezone';

// Global lock to prevent multiple simultaneous game creation attempts
let isCreatingGame = false;
let lastGameCreationAttempt = 0;

// Helper function to acquire game creation lock
async function acquireGameCreationLock(): Promise<boolean> {
  const now = getCurrentISTTime().getTime();
  
  // Prevent multiple attempts within 10 seconds
  if (now - lastGameCreationAttempt < 10000) {
    console.log('🔒 Game creation lock: Too soon since last attempt, skipping...');
    return false;
  }
  
  if (isCreatingGame) {
    console.log('🔒 Game creation lock: Already creating game, skipping...');
    return false;
  }
  
  isCreatingGame = true;
  lastGameCreationAttempt = now;
  console.log('🔓 Game creation lock: Acquired');
  return true;
}

// Helper function to release game creation lock
function releaseGameCreationLock(): void {
  isCreatingGame = false;
  console.log('🔓 Game creation lock: Released');
}

// Helper function to format card name for display
export function formatCardName(cardName: string): string {
  // Handle null, undefined, or empty cardName
  if (!cardName || typeof cardName !== 'string') {
    return '';
  }
  
  // If already in correct format (e.g., "A ♥"), return as is
  if (cardName.includes('♥') || cardName.includes('♦') || cardName.includes('♣') || cardName.includes('♠')) {
    return cardName;
  }
  
  // Handle database format (e.g., "ace_of_hearts" -> "A ♥")
  const cardMap: Record<string, string> = {
    'ace_of_hearts': 'A ♥',
    'ace_of_diamonds': 'A ♦',
    'ace_of_clubs': 'A ♣',
    'ace_of_spades': 'A ♠',
    'king_of_hearts': 'K ♥',
    'king_of_diamonds': 'K ♦',
    'king_of_clubs': 'K ♣',
    'king_of_spades': 'K ♠',
    'queen_of_hearts': 'Q ♥',
    'queen_of_diamonds': 'Q ♦',
    'queen_of_clubs': 'Q ♣',
    'queen_of_spades': 'Q ♠',
    'jack_of_hearts': 'J ♥',
    'jack_of_diamonds': 'J ♦',
    'jack_of_clubs': 'J ♣',
    'jack_of_spades': 'J ♠',
    '10_of_hearts': '10 ♥',
    '10_of_diamonds': '10 ♦',
    '10_of_clubs': '10 ♣',
    '10_of_spades': '10 ♠'
  };
  
  return cardMap[cardName.toLowerCase()] || cardName;
}

// Helper function to convert display format card name to database format
export function displayToDatabaseFormat(displayCard: string): string {
  if (!displayCard) return '';
  // If already in database format, return as-is
  if (displayCard.includes('_of_')) return displayCard;

  // Normalize spacing e.g., "J  ♠" -> "J ♠"
  const normalized = displayCard.replace(/\s+/g, ' ').trim();

  // Support both "10 ♠" and single-letter ranks
  const rankPart = normalized.startsWith('10') ? '10' : normalized.charAt(0).toUpperCase();
  // Suit symbol is expected after a space. Fallback to last char if not present
  const suitSymbol = normalized.length >= 3 ? normalized.charAt(normalized.length - 1) : '';

  const suitMap: Record<string, string> = {
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs',
    '♠': 'spades'
  };

  const cardTypeMap: Record<string, string> = {
    'A': 'ace',
    'K': 'king',
    'Q': 'queen',
    'J': 'jack',
    '10': '10'
  };

  const cardSuit = suitMap[suitSymbol] || 'unknown';
  const cardTypeName = cardTypeMap[rankPart] || rankPart.toLowerCase();

  return `${cardTypeName}_of_${cardSuit}`;
}

const SUIT_SYMBOL_TO_NAME: Record<string, string> = {
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs',
  '♠': 'spades'
};

function normalizeCardType(type: string): string {
  if (!type) return '';
  const trimmed = type.trim().toUpperCase();
  if (trimmed === '10' || trimmed === '1') {
    return '10';
  }
  return trimmed.charAt(0);
}

function extractTypeAndSuitFromCard(card: string): { type: string; suit: string } {
  if (!card) {
    return { type: '', suit: 'unknown' };
  }

  if (card.includes('_of_')) {
    const [rawType, , rawSuit] = card.split('_');
    const type = normalizeCardType(rawType?.replace(/ten/i, '10') || rawType || '');
    return { type, suit: rawSuit || 'unknown' };
  }

  const trimmed = card.trim();
  const type = trimmed.startsWith('10') ? '10' : trimmed.charAt(0).toUpperCase();
  const suitSymbol = trimmed.charAt(trimmed.length - 1);
  return { type, suit: SUIT_SYMBOL_TO_NAME[suitSymbol] || 'unknown' };
}

type ActiveCardDoc = {
  card: string;
  symbol: string;
  suit: string;
};

type SelectedCard = {
  display: string;
  type: string;
  suit: string;
  symbol: string;
};

function buildSelectionPool(cards: ActiveCardDoc[]): SelectedCard[] {
  return cards.map((card: ActiveCardDoc) => ({
    display: `${card.card} ${card.symbol}`,
    type: normalizeCardType(card.card),
    suit: card.suit,
    symbol: card.symbol
  }));
}

function pickRandomCardFromPool(
  cards: SelectedCard[],
  exclude?: { type?: string; display?: string }
): SelectedCard | null {
  if (cards.length === 0) {
    return null;
  }

  let pool = cards;

  if (exclude?.type) {
    const filteredByType = cards.filter(card => card.type !== normalizeCardType(exclude.type || ''));
    if (filteredByType.length > 0) {
      pool = filteredByType;
    }
  }

  if (exclude?.display) {
    const filteredByDisplay = pool.filter(card => card.display !== exclude.display);
    if (filteredByDisplay.length > 0) {
      pool = filteredByDisplay;
    }
  }

  const index = pool.length === 1 ? 0 : randomInt(pool.length);
  return pool[index];
}

async function declareNoLossRandomResult(
  game: any,
  totalPool: number,
  excludeCardNames: string[] = []
): Promise<void> {
  const activeCards = await Card.find({ isActive: true }).select('name card symbol suit');
  const excludeSet = new Set(excludeCardNames);

  let candidateCards = activeCards.filter(card => !excludeSet.has(card.name));
  if (candidateCards.length === 0) {
    candidateCards = activeCards;
  }

  if (candidateCards.length === 0) {
    console.warn('⚠️ declareNoLossRandomResult: No active cards available. Creating result without winner.');
    game.winningCard = '';
    game.status = 'result_declared';
    game.resultDeclaredAt = game.gameEndTime;
    game.isRandomResult = true;
    await game.save();
    await Result.create({
      game: game._id,
      gameId: game._id?.toString() || '',
      winningCard: '',
      winningCardType: '',
      winningCardSuit: 'unknown',
      totalPool,
      winningCardPool: 0,
      losingCardsPool: totalPool,
      totalWinners: 0,
      totalWinningAmount: 0,
      adminCommission: 0,
      totalAgentCommission: 0,
      winners: [],
      agentCommissions: [],
      resultDeclaredAt: game.gameEndTime,
      gameStartTime: game.startTime,
      gameEndTime: game.gameEndTime,
      biddingEndTime: game.biddingEndTime,
      isRandomResult: true
    });
    return;
  }

  const selectionPool = buildSelectionPool(
    candidateCards.map(card => ({
      card: card.card,
      symbol: card.symbol,
      suit: card.suit
    }))
  );

  const selectedCard = pickRandomCardFromPool(selectionPool);
  if (!selectedCard) {
    console.warn('⚠️ declareNoLossRandomResult: Unable to pick card from selection pool.');
    return;
  }

  const randomWinningCard = selectedCard.display;
  const cardType = selectedCard.type;
  const cardSuit = selectedCard.suit;

  game.winningCard = randomWinningCard;
  game.status = 'result_declared';
  game.resultDeclaredAt = game.gameEndTime;
  game.isRandomResult = true;
  await game.save();

  await Result.create({
    game: game._id,
    gameId: game._id?.toString() || '',
    winningCard: randomWinningCard,
    winningCardType: cardType,
    winningCardSuit: cardSuit,
    totalPool,
    winningCardPool: 0,
    losingCardsPool: totalPool,
    totalWinners: 0,
    totalWinningAmount: 0,
    adminCommission: 0,
    totalAgentCommission: 0,
    winners: [],
    agentCommissions: [],
    resultDeclaredAt: game.gameEndTime,
    gameStartTime: game.startTime,
    gameEndTime: game.gameEndTime,
    biddingEndTime: game.biddingEndTime,
    isRandomResult: true
  });

  const io = getIO();
  if (io) {
    const formattedCard = formatCardName(randomWinningCard);
    const resultTimeString = toIST(game.gameEndTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    io.emit('resultDeclared', {
      time: resultTimeString,
      result: formattedCard
    });
    io.emit('statusChange', {
      isBreak: false,
      gameStatus: 'result_declared',
      currentTime: 0
    });
  }

  console.log('🛡️ Declared zero-payout random result to protect pool:', {
    gameId: game._id?.toString(),
    winningCard: randomWinningCard,
    totalPool
  });
}

async function getLastRandomResult(excludeGameId?: Types.ObjectId | string) {
  const query: Record<string, unknown> = { isRandomResult: true };
  if (excludeGameId) {
    const normalizedId = typeof excludeGameId === 'string'
      ? new Types.ObjectId(excludeGameId)
      : excludeGameId;
    query.game = { $ne: normalizedId };
  }

  return Result.findOne(query)
    .sort({ resultDeclaredAt: -1 })
    .select('winningCard winningCardType')
    .lean()
    .exec();
}
// Timer configuration from environment variables
const BIDDING_DURATION = parseInt(process.env.BIDDING_DURATION || '25');
const BREAK_DURATION = parseInt(process.env.BREAK_DURATION || '5');
const GAME_CREATION_INTERVAL = parseInt(process.env.GAME_CREATION_INTERVAL || '30');

// Helper functions
function getBiddingDuration(): number {
  return BIDDING_DURATION;
}

function getBreakDuration(): number {
  return BREAK_DURATION;
}

function getGameCreationInterval(): number {
  return GAME_CREATION_INTERVAL;
}

function getTotalGameDuration(): number {
  return BIDDING_DURATION + BREAK_DURATION;
}



function logTimerConfig(): void {
  console.log('🎮 Timer Configuration:');
  console.log(`   Bidding Duration: ${BIDDING_DURATION} minutes`);
  console.log(`   Break Duration: ${BREAK_DURATION} minutes`);
  console.log(`   Game Creation Interval: ${GAME_CREATION_INTERVAL} minutes`);
  console.log(`   Total Game Duration: ${getTotalGameDuration()} minutes`);
}

function getCurrentTimeWindow(): string {
  return getCurrentTimeWindowIST();
}

function getNextTimeWindow(): string {
  return getNextTimeWindowIST();
}

// Function to check for missing games and create them
async function checkAndCreateMissingGames() {
  try {
    const now = getCurrentISTTime();
    
    // Get the start of today in IST
    const startOfToday = getStartOfDayIST(now);
    
    // Get all games from today
    const todayGames = await Game.find({
      createdAt: { $gte: startOfToday }
    }).sort({ timeWindow: 1 });
    
    // Calculate expected time slots for today (48 slots - 24 hours * 2 slots per hour)
    const expectedSlots: string[] = [];
    const startTime = startOfToday;
    
    for (let i = 0; i < 48; i++) { // 24 hours = 48 slots
      const slotTime = addMinutesIST(startTime, i * 30);
      expectedSlots.push(slotTime.toISOString());
    }
    
    // Check for missing slots
    const existingTimeWindows = todayGames.map(game => game.timeWindow);
    const missingSlots = expectedSlots.filter(slot => !existingTimeWindows.includes(slot));
    
    if (missingSlots.length > 0) {
      console.log(`⚠️ Found ${missingSlots.length} missing time slots:`, missingSlots);
      
      // Create games for missing slots
      for (const missingSlot of missingSlots) {
        // Check if a game already exists for this time window
        const existingGame = await Game.findOne({ timeWindow: missingSlot });
        
        if (existingGame) {
          console.log(`⚠️ Game already exists for slot ${missingSlot}: ${existingGame._id} - skipping creation`);
          continue;
        }
        
        // Additional check: Look for any game created recently with the same time window
        const recentGameWithSameWindow = await Game.findOne({
          timeWindow: missingSlot,
          createdAt: { $gte: new Date(getCurrentISTTime().getTime() - 5 * 60 * 1000) } // Last 5 minutes - using IST time
        });
        
        if (recentGameWithSameWindow) {
          console.log(`⚠️ Recent game with same time window found for slot ${missingSlot}: ${recentGameWithSameWindow._id} - skipping creation`);
          continue;
        }
        
        const startTime = getCurrentISTTime(); // Use IST time instead of UTC timeWindow
        const biddingEndTime = addMinutesIST(startTime, getBiddingDuration());
        const gameEndTime = addMinutesIST(startTime, getTotalGameDuration());
        
        const game = await Game.create({
          timeWindow: missingSlot,
          status: 'open',
          totalPool: 0,
          startTime: startTime,
          biddingEndTime,
          gameEndTime
        });
        
        console.log(`✅ Created missing game for slot ${missingSlot}: ${game._id}`);
      }
    }
  } catch (error) {
    console.error('Error checking for missing games:', error);
  }
}

async function checkAndCreateMissingResults() {
  try {
    const now = getCurrentISTTime();
    
    // Get the start of today in IST
    const startOfToday = getStartOfDayIST(now);
    
    // Get the end of today in IST
    const endOfToday = getEndOfDayIST(now);

    console.log(`🔍 Checking for missing results today: ${startOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} to ${endOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all results from today
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: 1 });

    console.log(`📊 Found ${todayResults.length} existing results today`);

    // Calculate expected result times for today up to current time (past slots only)
    const expectedResultTimes: Date[] = [];
    
    // Get all 48 time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    
    // Filter to only include slots that have passed (up to current time)
    // Exclude the current active slot to prevent creating active games
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    
    for (const slot of allTimeSlots) {
      if (slot <= now && slot < currentSlot) {
        // Add 30 minutes to get the result time (game end time)
        const resultTime = addMinutesIST(slot, 30);
        expectedResultTimes.push(resultTime);
      }
    }

    console.log(`📅 Expected ${expectedResultTimes.length} result times today`);

    // Find missing result times
    const existingResultTimes = todayResults.map(result => result.resultDeclaredAt);
    const missingResultTimes: Date[] = [];

    for (const expectedTime of expectedResultTimes) {
      // Check if result exists within 1 minute tolerance
      const hasResult = existingResultTimes.some(existingTime => {
        const timeDiff = Math.abs(existingTime.getTime() - expectedTime.getTime());
        return timeDiff <= 60000; // 1 minute tolerance
      });

      if (!hasResult) {
        missingResultTimes.push(expectedTime);
      }
    }

    console.log(`⚠️ Found ${missingResultTimes.length} missing result times today`);

    if (missingResultTimes.length === 0) {
      console.log(`✅ All results for today are present!`);
      return;
    }

    // Create missing results
    for (const missingTime of missingResultTimes) {
      console.log(`Missing result detected for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} - creating random result`);
      await createRandomResultForTime(missingTime);
    }
    
  } catch (error) {
    console.error('Error checking for missing results:', error);
  }
}

async function createRandomResultForTime(resultTime: Date) {
  try {
    // Check if result already exists for this time to prevent duplicates
    const existingResult = await Result.findOne({
      resultDeclaredAt: {
        $gte: new Date(resultTime.getTime() - 60000), // 1 minute before
        $lte: new Date(resultTime.getTime() + 60000)  // 1 minute after
      }
    });
    
    if (existingResult) {
      console.log(`Result already exists for time ${resultTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} - skipping duplicate creation`);
      return;
    }
    
    // Get active cards from the database
    const activeCards = await Card.find({ isActive: true }).select('name card symbol suit');
    
    if (activeCards.length === 0) {
      console.log('No active cards available for random result');
      return;
    }
    
    const selectionPool = buildSelectionPool(
      activeCards.map(card => ({
        card: card.card,
        symbol: card.symbol,
        suit: card.suit
      }))
    );
    const lastRandomResult = await getLastRandomResult();
    const selectedCard = pickRandomCardFromPool(selectionPool, {
      type: lastRandomResult?.winningCardType,
      display: typeof lastRandomResult?.winningCard === 'string' ? lastRandomResult.winningCard : undefined
    });

    if (!selectedCard) {
      console.log('No cards available for selection after filtering. Aborting random result creation.');
      return;
    }

    const winningCard = selectedCard.display;
    const winningCardType = selectedCard.type;
    const winningCardSuit = selectedCard.suit;
    
    // Calculate the game start time (30 minutes before result time)
    // Use consistent time slot calculation
    const gameStartTime = addMinutesIST(resultTime, -30);
    
    // Get slot index for logging
    const slotIndex = getTimeSlotIndex(gameStartTime);
    const slotTimeString = toIST(gameStartTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    console.log(`🎯 Creating result for slot ${slotIndex}/47 (${slotTimeString})`);
    
    // Check if a game already exists for this time window
    let existingGame = await Game.findOne({ 
      timeWindow: gameStartTime.toISOString() 
    });
    
    // Additional check: Look for any game with the same time window created recently
    if (!existingGame) {
      const recentGameWithSameWindow = await Game.findOne({
        timeWindow: gameStartTime.toISOString(),
        createdAt: { $gte: new Date(getCurrentISTTime().getTime() - 10 * 60 * 1000) } // Last 10 minutes - using IST time
      });
      
      if (recentGameWithSameWindow) {
        console.log(`Recent game with same time window found: ${recentGameWithSameWindow._id} - using existing game`);
        existingGame = recentGameWithSameWindow;
      }
    }
    
    let game;
    if (existingGame) {
      // Update the existing game with the result
      const updatedGame = await Game.findByIdAndUpdate(
        existingGame._id,
        {
          status: 'result_declared',
          winningCard,
          resultDeclaredAt: resultTime,
          isRandomResult: true
        },
        { new: true }
      );
      if (!updatedGame) {
        console.error('Failed to update existing game');
        return;
      }
      game = updatedGame;
      console.log(`✅ Updated existing game ${existingGame._id} with result for ${resultTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      // Create a new game record for this missing time slot
      const newGame = await Game.create({
        timeWindow: gameStartTime.toISOString(),
        status: 'result_declared',
        totalPool: 0,
        startTime: gameStartTime,
        biddingEndTime: addMinutesIST(gameStartTime, getBiddingDuration()),
        gameEndTime: resultTime,
        winningCard,
        resultDeclaredAt: resultTime,
        isRandomResult: true
      });
      if (!newGame) {
        console.error('Failed to create new game');
        return;
      }
      game = newGame;
      console.log(`✅ Created new game with result for ${resultTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }
    
    // Create Result record with all required fields
    await Result.create({
      game: game._id,
      gameId: game._id?.toString() || '',
      winningCard,
      winningCardType: winningCardType,
      winningCardSuit: winningCardSuit,
      totalPool: 0,
      winningCardPool: 0,
      losingCardsPool: 0,
      totalWinners: 0,
      totalWinningAmount: 0,
      adminCommission: 0,
      totalAgentCommission: 0,
      winners: [],
      agentCommissions: [],
      resultDeclaredAt: resultTime,
      gameStartTime: game.startTime,
      gameEndTime: game.gameEndTime,
      biddingEndTime: game.biddingEndTime,
      isRandomResult: true
    });
    
    console.log(`✅ Created missing result for ${resultTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}: ${winningCard}`);
    
  } catch (error) {
    console.error('Error creating random result for missing time:', error);
  }
}

async function createGameIfNotExists() {
  // Acquire lock to prevent multiple simultaneous attempts
  const lockAcquired = await acquireGameCreationLock();
  if (!lockAcquired) {
    return;
  }
  
  try {
    const now = getCurrentISTTime();
    
    // eslint-disable-next-line no-console
    console.log(`🔍 Checking for active games at ${now.toISOString()} (IST)...`);
    console.log(`🔍 Current IST time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    // Note: Removed checkAndCreateMissingResults() call to prevent creating additional games
    // Missing results should be handled separately, not during active game creation
    
    // Check if there's already an active game (open or waiting_result)
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });
    
    if (activeGame) {
      // eslint-disable-next-line no-console
      console.log(`Active game exists: ${activeGame._id} (${activeGame.status}) - skipping new game creation`);
      return;
    }
    
    // Get the current time window
    const currentTimeWindow = getCurrentTimeWindow();
    
    // eslint-disable-next-line no-console
    console.log(`📅 Current time window: ${currentTimeWindow}`);
    console.log(`📅 Current time window IST: ${getCurrentISTTime().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    // Check if a game already exists for this time window (regardless of status)
    const existingGame = await Game.findOne({ timeWindow: currentTimeWindow });
    
    if (existingGame) {
      // eslint-disable-next-line no-console
      console.log(`Game already exists for time window ${currentTimeWindow}: ${existingGame._id} (${existingGame.status}) - skipping creation`);
      return;
    }
    
    // Additional check: Look for any game created in the last 5 minutes to prevent race conditions
    const recentGame = await Game.findOne({
      createdAt: { $gte: new Date(getCurrentISTTime().getTime() - 5 * 60 * 1000) }
    });
    
    if (recentGame) {
      console.log(`Recent game found: ${recentGame._id} (${recentGame.status}) created at ${recentGame.createdAt} - skipping creation to prevent race conditions`);
      return;
    }
    
    // Calculate the proper start time for the current time window
    // Use the current 30-minute slot start time (consistent across all dates)
    const currentSlotStart = getCurrentThirtyMinuteSlot(now);
    const startTime = currentSlotStart;
    const biddingEndTime = addMinutesIST(startTime, getBiddingDuration());
    const gameEndTime = addMinutesIST(startTime, getTotalGameDuration());
    
    // Get slot index for logging
    const slotIndex = getTimeSlotIndex(now);
    const slotTimeString = toIST(startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    console.log(`📅 Game timing calculation (Slot ${slotIndex}/47):`);
    console.log(`   Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Slot start: ${startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} (${slotTimeString})`);
    console.log(`   Bidding end: ${biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Game end: ${gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    const result = await Game.create({
      timeWindow: currentTimeWindow, 
      status: 'open', 
      totalPool: 0,
      startTime: startTime,
      biddingEndTime,
      gameEndTime
    });
    
    if (result) {
      // eslint-disable-next-line no-console
      console.log(`✅ Game created for window ${currentTimeWindow} (${getBiddingDuration()} min bidding + ${getBreakDuration()} min break) - ID: ${result._id}`);
      console.log(`📊 Game timing (IST): Start: ${startTime.toISOString()}, Bidding End: ${biddingEndTime.toISOString()}, Game End: ${gameEndTime.toISOString()}`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error creating game:', error);
  } finally {
    // Always release the lock
    releaseGameCreationLock();
  }
}

async function processGameResults() {
  // BIDDING PHASE END: This function only closes bidding and sets game to waiting_result
  const now = getCurrentISTTime();
  console.log(`🔄 processGameResults called at ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  
  // Find games in 'open' status whose bidding window has ended
  const games = await Game.find({ status: 'open', biddingEndTime: { $lte: now } });
  
  console.log(`📊 Found ${games.length} games with ended bidding time`);
  
  // Only process the oldest game to prevent multiple winners
  if (games.length > 0) {
    const game = games[0]; // Process only the oldest game
    
    console.log(`🎯 Processing game ${game._id} - bidding ended at ${new Date(game.biddingEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    // Close bidding phase and set to waiting_result status
    game.status = 'waiting_result';
    await game.save();
    
    // eslint-disable-next-line no-console
    console.log(`✅ Bidding closed for game ${game._id?.toString() || 'unknown'} - Status: waiting_result (${getBreakDuration()} min break)`);
    
    // Result will be declared by processBreakTimer() when game end time is reached
    console.log(`⏳ Game ${game._id?.toString() || 'unknown'} set to waiting_result - result will be declared at ${game.gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  } else {
    console.log(`ℹ️ No games found with ended bidding time`);
  }
}

async function processBreakTimer() {
  // SINGLE POINT OF RESULT DECLARATION: This is the ONLY function that declares results
  const now = getCurrentISTTime();
  console.log(`🔄 processBreakTimer called at ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  
  // Find games in 'waiting_result' status whose game end time has passed
  const games = await Game.find({ 
    status: 'waiting_result', 
    gameEndTime: { $lte: now } 
  });
  
  console.log(`📊 Found ${games.length} games with ended break time`);
  
  // Only process the oldest game to prevent multiple winners
  if (games.length > 0) {
    const game = games[0]; // Process only the oldest game
    
    console.log(`🎯 Processing game ${game._id} - game ended at ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    // If an admin has manually set a winningCard during waiting_result, honor it now
    if (game.winningCard) {
      console.log(`🛠️ Manual winner preset found for game ${game._id}. Declaring that card now: ${game.winningCard}`);
      // Build payout results consistent with automatic logic (bid × 10, no commissions)
      const gameIdStr = (game._id as Types.ObjectId).toString();
      const payoutResults = await buildPayoutResultsForCard(gameIdStr, game.winningCard);
      await declareWinner(gameIdStr, game.winningCard, false, undefined, payoutResults);
      return;
    }
    
    // eslint-disable-next-line no-console
    console.log('✅ Break timer ended for game', game._id?.toString() || 'unknown', '- Declaring random winner');
    
    // Declare random winner immediately - THIS IS THE ONLY PLACE RESULTS ARE DECLARED
    await declareDeterministicWinner(game._id?.toString() || '');
  } else {
    console.log(`ℹ️ No games found with ended break time`);
  }
}

async function createNextGameIfNeeded() {
  const now = getCurrentISTTime();
  console.log(`🎮 createNextGameIfNeeded called at ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  
  // Get current and next 30-minute slots
  const currentSlot = getCurrentThirtyMinuteSlot(now);
  const nextSlot = getNextThirtyMinuteSlot(now);
  
  console.log(`📅 Current slot: ${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`📅 Next slot: ${nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  
  // Check if we already have an active game (open or waiting_result)
  const activeGame = await Game.findOne({
    status: { $in: ['open', 'waiting_result'] }
  });
  
  if (activeGame) {
    console.log(`✅ Active game exists: ${activeGame._id} (${activeGame.status}) - no need to create new game`);
    return;
  }
  
  // Check if we have a game for the current slot
  const currentSlotGame = await Game.findOne({
    timeWindow: currentSlot.toISOString()
  });
  
  if (currentSlotGame) {
    console.log(`✅ Game exists for current slot: ${currentSlotGame._id} (${currentSlotGame.status})`);
    return;
  }
  
  // Check if we have a game for the next slot
  const nextSlotGame = await Game.findOne({
    timeWindow: nextSlot.toISOString()
  });
  
  if (nextSlotGame) {
    console.log(`✅ Game exists for next slot: ${nextSlotGame._id} (${nextSlotGame.status})`);
    return;
  }
  
  // No active game found - create one for the appropriate slot
  console.log(`⚠️ No active game found - creating new game...`);
  
  // Determine which slot to create game for
  let targetSlot: Date;
  let gameStatus: string;
  
  if (now >= currentSlot && now < nextSlot) {
    // We're in the current slot - create for current slot and activate it
    targetSlot = currentSlot;
    gameStatus = 'open';
    console.log(`📅 Creating game for current slot (${targetSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}) - status: ${gameStatus}`);
  } else {
    // We're past the current slot - create for next slot
    targetSlot = nextSlot;
    gameStatus = 'open';
    console.log(`📅 Creating game for next slot (${targetSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}) - status: ${gameStatus}`);
  }
  
  // Calculate game timing
  const gameStartTime = targetSlot;
  const biddingEndTime = addMinutesIST(gameStartTime, getBiddingDuration());
  const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());
  
  try {
    const newGame = await Game.create({
      timeWindow: gameStartTime.toISOString(),
      status: gameStatus,
      totalPool: 0,
      startTime: gameStartTime,
      biddingEndTime,
      gameEndTime
    });
    
    console.log(`✅ Created new game: ${newGame._id} (${gameStatus}) for slot ${targetSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Start: ${gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Bidding End: ${biddingEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Game End: ${gameEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
  } catch (error) {
    console.error(`❌ Error creating new game:`, error);
  }
}

// NEW: Declare winner using deterministic lowest pool wins logic
async function declareDeterministicWinner(gameId: string) {
  const game = await Game.findById(gameId);
  if (!game) {
    console.log(`Game ${gameId} not found - skipping declaration`);
    return;
  }
  
  // Check if result is already declared to prevent duplicates
  if (game.status === 'result_declared') {
    console.log(`Game ${gameId} result already declared - skipping duplicate declaration`);
    return;
  }

  // Check if a result already exists for this game
  const existingResult = await Result.findOne({ game: gameId });
  if (existingResult) {
    console.log(`Result already exists for game ${gameId} - skipping duplicate declaration`);
    return;
  }
  
  // Check if game is in waiting_result status
  if (game.status !== 'waiting_result') {
    console.log(`Game ${gameId} not in waiting_result status (${game.status}) - skipping declaration`);
    return;
  }
  
  // Use atomic update to prevent race conditions
  const updatedGame = await Game.findOneAndUpdate(
    { _id: gameId, status: 'waiting_result' },
    { status: 'processing_result' },
    { new: true }
  );
  
  if (!updatedGame) {
    console.log(`Game ${gameId} already being processed or status changed - skipping declaration`);
    return;
  }
  
  // Get all bids for this game
  const allBids = await Bid.find({ game: gameId }).populate('user', 'fullName email assignedAgent');
  
  if (allBids.length === 0) {
    // No bids in the game - declare random winning card but no payouts
    console.log('No bids placed in game', gameId, '- declaring random winning card for display purposes');
    
    // Get active cards from the database for random selection
    const activeCards = await Card.find({ isActive: true }).select('name card symbol suit');
    
    if (activeCards.length === 0) {
      console.log('No active cards available - cannot declare winner');
      updatedGame.status = 'result_declared';
      updatedGame.resultDeclaredAt = updatedGame.gameEndTime;
      updatedGame.isRandomResult = false;
      await updatedGame.save();
      return;
    }
    
    const selectionPool = buildSelectionPool(
      activeCards.map(card => ({
        card: card.card,
        symbol: card.symbol,
        suit: card.suit
      }))
    );
    const lastRandomResult = await getLastRandomResult(updatedGame._id?.toString());
    const selectedCard = pickRandomCardFromPool(selectionPool, {
      type: lastRandomResult?.winningCardType,
      display: typeof lastRandomResult?.winningCard === 'string' ? lastRandomResult.winningCard : undefined
    });

    if (!selectedCard) {
      console.log('No cards available after applying filters - cannot declare winner');
      updatedGame.status = 'result_declared';
      updatedGame.resultDeclaredAt = updatedGame.gameEndTime;
      updatedGame.isRandomResult = false;
      await updatedGame.save();
      return;
    }

    const randomWinningCard = selectedCard.display;
    const cardType = selectedCard.type;
    const cardSuit = selectedCard.suit;
    
    // Update game with random winning card
    updatedGame.winningCard = randomWinningCard;
    updatedGame.status = 'result_declared';
    updatedGame.resultDeclaredAt = updatedGame.gameEndTime;
    updatedGame.isRandomResult = true; // This is a random result since no bids
    await updatedGame.save();
    
    // Create Result record for no-bid scenario with random winning card
    await Result.create({
      game: updatedGame._id,
      gameId: updatedGame._id?.toString() || '',
      winningCard: randomWinningCard,
      winningCardType: cardType,
      winningCardSuit: cardSuit,
      totalPool: 0,
      winningCardPool: 0,
      losingCardsPool: 0,
      totalWinners: 0,
      totalWinningAmount: 0,
      adminCommission: 0,
      totalAgentCommission: 0,
      winners: [], // No winners since no bids
      agentCommissions: [],
      resultDeclaredAt: updatedGame.gameEndTime,
      gameStartTime: updatedGame.startTime,
      gameEndTime: updatedGame.gameEndTime,
      biddingEndTime: updatedGame.biddingEndTime,
      isRandomResult: true
    });
    
    // Emit result to all clients
    const io = getIO();
    if (io) {
      const formattedCard = formatCardName(randomWinningCard);
      const resultTimeString = toIST(updatedGame.gameEndTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const eventData = {
        time: resultTimeString,
        result: formattedCard
      };
      
      io.emit('resultDeclared', eventData);
      io.emit('statusChange', {
        isBreak: false,
        gameStatus: 'result_declared',
        currentTime: 0
      });
      
      console.log('🎉 Random winning card declared for no-bid game:', {
        gameId: gameId,
        winningCard: randomWinningCard,
        formattedCard: formattedCard,
        timestamp: updatedGame.gameEndTime.toISOString()
      });
    }
    
    console.log('Random winning card declared for no-bid game', gameId, 'Card:', randomWinningCard, 'No payouts distributed');
    return;
  }
  
  // Convert bids to the format expected by new calculatePayouts function
  const payoutBids = allBids.map(bid => ({
    userId: bid.user._id.toString(),
    card: bid.cardName, // Use the card name from the bid
    amount: bid.totalAmount
  }));
  const totalPool = payoutBids.reduce((sum, bid) => sum + bid.amount, 0);
  
  console.log('📋 PayoutBids being passed to CommissionService:');
  payoutBids.forEach(pb => {
    console.log(`  User: ${pb.userId}, Card: ${pb.card}, Amount: ₹${pb.amount}`);
  });
  
  console.log('🎯 NEW DETERMINISTIC LOGIC TRIGGERED for game', gameId);
  console.log('📊 Converting bids to payout format...');
  console.log('Total bids to process:', payoutBids.length);
  
  // Calculate payouts using new deterministic logic
  const payoutResults = CommissionService.calculatePayouts(payoutBids);
  console.log('✅ CommissionService.calculatePayouts completed');
  console.log('Payout results generated:', payoutResults.length);
  
  // DEBUG: Show exactly what's in payoutResults
  console.log('🔍 DEBUG - payoutResults content:');
  payoutResults.forEach((result, index) => {
    console.log(`  [${index}] userId: ${result.userId} (type: ${typeof result.userId}), card: ${result.card}, amount: ${result.amount}, winner: ${result.winner}, payout: ${result.payout}`);
  });
  
  // Show only winners for clarity
  const payoutWinners = payoutResults.filter(r => r.winner);
  console.log('🏆 Winners in payoutResults:');
  payoutWinners.forEach((winner, index) => {
    console.log(`  [${index}] userId: ${winner.userId} (type: ${typeof winner.userId}), payout: ₹${winner.payout}`);
  });
  
  // Find the winning card(s) - cards with lowest pool
  const winningCards = new Set<string>();
  const cardPools = new Map<string, number>();
  
  for (const bid of payoutBids) {
    const currentPool = cardPools.get(bid.card) || 0;
    cardPools.set(bid.card, currentPool + bid.amount);
  }
  
  console.log('📊 Pool calculations:');
  Array.from(cardPools.entries()).sort((a, b) => a[1] - b[1]).forEach(([card, pool]) => {
    console.log(`  ${card}: ₹${pool}`);
  });
  
  let lowestPoolAmount = Infinity;
  for (const [card, poolAmount] of Array.from(cardPools.entries())) {
    if (poolAmount < lowestPoolAmount) {
      lowestPoolAmount = poolAmount;
      winningCards.clear();
      winningCards.add(card);
    } else if (poolAmount === lowestPoolAmount) {
      winningCards.add(card);
    }
  }
  
  // Get the first winning card for display purposes (if multiple, pick the first one)
  const potentialPayout = lowestPoolAmount === Infinity ? 0 : lowestPoolAmount * 10;
  if (potentialPayout > totalPool) {
    console.warn(
      `⚠️ Potential payout (₹${potentialPayout}) exceeds total pool (₹${totalPool}). Declaring zero-payout random result to prevent loss.`
    );
    await declareNoLossRandomResult(updatedGame, totalPool, Array.from(cardPools.keys()));
    return;
  }

  const winningCard = Array.from(winningCards)[0] || 'No winner';
  
  // Get winning bids for processing
  const winningBids = allBids.filter(bid => winningCards.has(bid.cardName));
  
  console.log('🏆 DETERMINISTIC WINNER SELECTED:');
  console.log('- Winning card:', winningCard);
  console.log('- Lowest pool amount:', lowestPoolAmount);
  console.log('- Tied cards:', Array.from(winningCards));
  console.log('- Number of winning bids:', winningBids.length);
  
  const winners = payoutResults.filter(r => r.winner);
  console.log('💰 Expected payouts:');
  winners.forEach(w => {
    console.log(`  User ${w.userId}: Bid ₹${w.amount} → Payout ₹${w.payout}`);
  });
  console.log('Total expected payout amount:', winners.reduce((sum, w) => sum + w.payout, 0));
  
  console.log('🚀 Calling declareWinner with NEW DETERMINISTIC payoutResults...');
  // Declare winner with payouts using the new system
  await declareWinner(gameId, winningCard, false, undefined, payoutResults);
}

async function declareWinner(gameId: string, winningCard: string, isRandom: boolean = false, adminId?: string, payoutResults?: any[]) {
  const game = await Game.findById(gameId);
  if (!game) {
    throw new Error('Game not found');
  }
  
  // Check if the game is already in result_declared status to prevent duplicate updates
  if (game.status === 'result_declared') {
    console.log(`Game ${gameId} is already in result_declared status - skipping duplicate declaration`);
    return;
  }
  
  // Convert winning card from either display or db format to database format for bid search
  const dbCardName = displayToDatabaseFormat(winningCard);
  
  // Extract card type and suit for Result creation (support both formats)
  const { type: cardType, suit: cardSuit } = extractTypeAndSuitFromCard(winningCard);
  
  // Get winning bids using database format
  const winningBids = await Bid.find({ 
    game: gameId, 
    cardName: dbCardName 
  }).populate('user', 'fullName email assignedAgent');
  
  if (winningBids.length === 0) {
    // No bids on the winning card - this shouldn't happen with new logic, but handle gracefully
    console.log(`Warning: No bids found on winning card ${winningCard} for game ${gameId}`);
    
    // Update game with winning card but no payouts
    game.winningCard = winningCard;
    game.status = 'result_declared';
    game.resultDeclaredAt = game.gameEndTime;
    game.isRandomResult = false;
    await game.save();
    
    // Create Result record with winning card but no winners
    await Result.create({
      game: game._id,
      gameId: game._id?.toString() || '',
      winningCard,
      winningCardType: cardType,
      winningCardSuit: cardSuit,
      totalPool: 0,
      winningCardPool: 0,
      losingCardsPool: 0,
      totalWinners: 0,
      totalWinningAmount: 0,
      adminCommission: 0,
      totalAgentCommission: 0,
      winners: [], // No winners since no bids on winning card
      agentCommissions: [],
      resultDeclaredAt: game.gameEndTime,
      gameStartTime: game.startTime,
      gameEndTime: game.gameEndTime,
      biddingEndTime: game.biddingEndTime,
      isRandomResult: false
    });
    
    // Emit result to all clients
    const io = getIO();
    if (io) {
      const formattedCard = formatCardName(winningCard);
      const resultTimeString = toIST(game.gameEndTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const eventData = {
        time: resultTimeString,
        result: formattedCard
      };
      
      io.emit('resultDeclared', eventData);
      io.emit('statusChange', {
        isBreak: false,
        gameStatus: 'result_declared',
        currentTime: 0
      });
    }
    
    console.log('Winner declared for game', gameId, 'Card:', winningCard, 'No payouts (no bids on winning card)');
    return;
  }
  
  // Use new deterministic payout system (NO COMMISSIONS)
  if (!payoutResults) {
    console.error('❌ payoutResults is required for new deterministic system');
    return;
  }
  
  console.log('💡 USING NEW SIMPLE DETERMINISTIC PAYOUT SYSTEM (NO COMMISSIONS)');
  console.log('PayoutResults received:', payoutResults.length, 'entries');
  
  // Use new simple payout system - no commissions
  const totalGamePool = payoutResults.reduce((sum, result) => sum + result.amount, 0);
  const winningCardPool = payoutResults.filter(r => r.winner).reduce((sum, result) => sum + result.amount, 0);
  const totalWinningAmount = payoutResults.filter(r => r.winner).reduce((sum, result) => sum + result.payout, 0);
  
  console.log('Simple system calculations (NO COMMISSIONS):');
  console.log('- Total game pool:', totalGamePool);
  console.log('- Winning card pool:', winningCardPool);
  console.log('- Total winning amount:', totalWinningAmount, '(winners get bid × 10)');

  // SAFETY CHECK: Ensure payouts do not exceed total pool. If they do, fallback to random result
  if (totalWinningAmount > totalGamePool) {
    console.warn(`⚠️ Total payout (₹${totalWinningAmount}) exceeds total pool (₹${totalGamePool}). Declaring RANDOM result to protect pool.`);
    await declareWinner(gameId, winningCard, true, adminId); // mark random to avoid payouts based on invalid state
    return;
  }
  
  const payoutCalculation = {
    totalGamePool,
    winningCardPool,
    losingCardsPool: totalGamePool - winningCardPool,
    adminCommissionFromWinning: 0, // NO COMMISSIONS
    winnerPayout: totalWinningAmount,
    payoutPerWinner: 0, // Not used - individual payouts calculated from payoutResults
    remainingAmount: 0, // NO COMMISSIONS
    agentCommissions: new Map<string, number>(), // NO COMMISSIONS
    settings: null
  };
  
  // Process payouts and collect winner details
  const winnerDetails = [];
  
  console.log('💰 Processing individual winner payouts...');
  for (const bid of winningBids) {
    const user = bid.user as any;
    console.log(`Processing winner: ${user.fullName} (${user._id})`);
    
    // Find the payout result for this user (new deterministic system)
    // Handle both ObjectId and string formats for userId comparison
    const userIdString = user._id.toString();
    console.log('🔍 Looking for userId:', userIdString, 'in payoutResults...');
    
    const userPayoutResult = payoutResults?.find(r => {
      const userMatch = r.userId === userIdString || 
                        r.userId === user._id || 
                        r.userId?.toString() === userIdString;
      const isWinner = r.winner === true;
      const match = userMatch && isWinner; // Must match userId AND be a winner
      
      if (userMatch && !isWinner) {
        console.log(`  📝 Found user record but not winner: ${r.card} (winner: ${r.winner})`);
      }
      if (match) {
        console.log('  ✅ WINNING MATCH FOUND:', r);
      }
      return match;
    });
    
    if (!userPayoutResult) {
      console.log('  ❌ NO MATCH - Checking all payoutResults for debugging:');
      payoutResults?.forEach((r, index) => {
        console.log(`    [${index}] ${r.userId} === ${userIdString}? ${r.userId === userIdString}`);
        console.log(`    [${index}] winner: ${r.winner}, payout: ${r.payout}`);
      });
    }
    console.log('UserPayoutResult found:', userPayoutResult ? `₹${userPayoutResult.payout}` : 'NOT FOUND');
    console.log('UserId comparison debug:', {
      'user._id': user._id,
      'user._id.toString()': userIdString,
      'payoutResults userIds': payoutResults?.map(r => ({ userId: r.userId, type: typeof r.userId }))
    });
    
    // Fallbacks:
    // - If payoutResults is provided but the user is not found (edge formatting mismatch),
    //   pay by rule: amount * 10
    // - If payoutResults is not provided, fall back to legacy payoutPerWinner
    let payoutAmount = 0;
    let isWinner = false;

    if (userPayoutResult !== undefined && userPayoutResult !== null) {
      isWinner = userPayoutResult.winner === true;
      payoutAmount = isWinner ? Number(userPayoutResult.payout) || 0 : 0;
    } else if (!payoutResults) {
      payoutAmount = payoutCalculation.payoutPerWinner;
      isWinner = payoutAmount > 0;
    }
    
    console.log(`Final payout calculation for ${user.fullName}:`);
    console.log(`- Bid amount: ₹${bid.totalAmount}`);
    console.log(`- Winner flag: ${isWinner}`);
    console.log(`- Payout amount: ₹${payoutAmount}`);
    console.log(`- Payout source: ${
      userPayoutResult ? 'NEW SYSTEM' : payoutResults ? 'FALLBACK (bid×10)' : 'LEGACY SYSTEM'
    }`);
    
    if (payoutAmount > 0 && isWinner) {
      // Credit winner's wallet
      let wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        wallet = await Wallet.create({ user: user._id });
      }
      
      const oldBalance = wallet.main;
      wallet.main += payoutAmount;
      await wallet.save();
      
      console.log(`✅ Wallet updated for ${user.fullName}: ₹${oldBalance} → ₹${wallet.main}`);
      
      // Log payout transaction
      const transaction = await WalletTransaction.create({
        user: user._id,
        initiator: null,
        initiatorRole: 'system',
        amount: payoutAmount,
        walletType: 'main',
        type: 'bonus',
        note: `Game win payout for card ${winningCard} in game ${gameId}`
      });
      
      console.log(`✅ Transaction created: ${transaction._id} for ₹${payoutAmount}`);
      
      winnerDetails.push({
        userId: user._id,
        userName: user.fullName,
        userEmail: user.email,
        gameId: user.gameId || 'N/A',
        bidAmount: bid.totalAmount,
        payoutAmount: payoutAmount,
        cardName: bid.cardName,
        cardType: bid.cardType,
        cardSuit: bid.cardSuit,
        quantity: bid.quantity,
        assignedAgent: user.assignedAgent
      });
    } else {
      console.log(`  ↳ No payout issued for ${user.fullName}; userPayoutResult winner flag = ${userPayoutResult?.winner}`);
    }
  }
  

  
  // Create detailed Result record
  const resultTime = game.gameEndTime;
  
  await Result.create({
    game: game._id,
    gameId: game._id?.toString() || '',
    winningCard,
    winningCardType: cardType,
    winningCardSuit: cardSuit,
    totalPool: payoutCalculation.totalGamePool,
    winningCardPool: payoutCalculation.winningCardPool,
    losingCardsPool: payoutCalculation.losingCardsPool,
    totalWinners: payoutResults.filter(r => r.winner).length,
    totalWinningAmount: payoutResults.filter(r => r.winner).reduce((sum, r) => sum + (Number(r.payout) || 0), 0),
    adminCommission: 0, // NO COMMISSIONS
    totalAgentCommission: 0, // NO COMMISSIONS
    winners: winnerDetails,
    agentCommissions: [],
    isRandomResult: isRandom,
    declaredBy: adminId ? new Types.ObjectId(adminId) : null,
    resultDeclaredAt: resultTime,
    gameStartTime: game.startTime,
    gameEndTime: game.gameEndTime,
    biddingEndTime: game.biddingEndTime
  });
  
  // Update game result
  game.winningCard = winningCard;
  game.status = 'result_declared';
  game.resultDeclaredAt = resultTime;
  game.isRandomResult = isRandom;
  if (adminId) {
    game.declaredBy = new Types.ObjectId(adminId);
  }
  await game.save();
  
  // Log manual override if not random
  if (!isRandom) {
    await ManualOverride.create({
      game: gameId,
      winnerNumber: 0, // Not used in card system
      manualWinners: [],
      note: `Winner declared by admin. Card: ${winningCard}. ${winningBids.length} winners. Payout: ₹${payoutCalculation.payoutPerWinner} each.`,
      payoutMultiplier: 1
    });
  }
  
  // Emit socket event for real-time result update
  try {
    // Import io from a separate socket utility to avoid circular imports
    const io = getIO();
    console.log('🔌 Socket.IO instance check (declareWinner):', io ? 'Available' : 'NULL - Socket.IO not initialized');
    
    if (io) {
      const formattedCard = formatCardName(winningCard);
      // Use the same result time as the game start time for consistency
      const resultTimeString = toIST(resultTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const eventData = {
        time: resultTimeString,
        result: formattedCard
      };
      
      io.emit('resultDeclared', eventData);
      
      // Also emit statusChange to notify frontend about game status update
      io.emit('statusChange', {
        isBreak: false,
        gameStatus: 'result_declared',
        currentTime: 0
      });
      
      // eslint-disable-next-line no-console
      console.log('🎉 Socket event emitted: resultDeclared', { 
        time: resultTimeString, 
        result: formattedCard,
        timestamp: resultTime.toISOString(),
        gameId: gameId,
        eventData
      });
    } else {
      console.log('❌ Failed to emit resultDeclared event (declareWinner) - Socket.IO not available');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to emit socket event:', error);
  }
  
  // eslint-disable-next-line no-console
  console.log('Winner declared for game', gameId, 'Card:', winningCard, 'Winners:', winningBids.length, 'Random:', isRandom);
  console.log('Payout details:', {
    totalGamePool: payoutCalculation.totalGamePool,
    winningCardPool: payoutCalculation.winningCardPool,
    losingCardsPool: payoutCalculation.losingCardsPool,
    payoutPerWinner: payoutCalculation.payoutPerWinner,
    adminCommissionFromWinning: payoutCalculation.adminCommissionFromWinning
  });

  // Return winner details for API response
  return {
    count: winningBids.length,
    payoutPerWinner: payoutCalculation.payoutPerWinner,
    remainingAmount: payoutCalculation.losingCardsPool + payoutCalculation.adminCommissionFromWinning,
    winnerDetails: winnerDetails.map(winner => ({
      userId: winner.userId,
      userName: winner.userName,
      bidAmount: winner.bidAmount,
      payoutAmount: winner.payoutAmount
    }))
  };
}

async function buildPayoutResultsForCard(gameId: string, displayWinningCard: string) {
  const dbCardName = displayToDatabaseFormat(displayWinningCard);
  const bids = await Bid.find({ game: gameId }).select('user cardName totalAmount');
  
  // Calculate total game pool and potential payout
  const totalGamePool = bids.reduce((sum, bid) => sum + (Number(bid.totalAmount) || 0), 0);
  const winningBids = bids.filter(bid => bid.cardName === dbCardName);
  const potentialTotalPayout = winningBids.reduce((sum, bid) => sum + ((Number(bid.totalAmount) || 0) * 10), 0);
  
  console.log(`💰 Manual Declaration Pool vs Payout Check:`);
  console.log(`  - Total Game Pool: ₹${totalGamePool}`);
  console.log(`  - Potential Total Payout: ₹${potentialTotalPayout} (${winningBids.length} winners × bid × 10)`);
  
  // SAFETY CHECK: If payout would exceed pool, return no winners
  if (potentialTotalPayout > totalGamePool) {
    console.warn(`⚠️ Manual declaration: Payout (₹${potentialTotalPayout}) would exceed pool (₹${totalGamePool}). Returning no winners.`);
    return bids.map(bid => ({
      userId: bid.user.toString(),
      card: bid.cardName,
      amount: Number(bid.totalAmount) || 0,
      winner: false,
      payout: 0
    }));
  }
  
  return bids.map(bid => ({
    userId: bid.user.toString(),
    card: bid.cardName,
    amount: Number(bid.totalAmount) || 0,
    winner: bid.cardName === dbCardName,
    payout: bid.cardName === dbCardName ? (Number(bid.totalAmount) || 0) * 10 : 0
  }));
}

// Automated midnight transition fix - runs at 12:01 AM to handle stuck previous day games
async function fixMidnightTransition() {
  const now = getCurrentISTTime();
  console.log(`🌙 Midnight transition check at ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
  
  try {
    // Get start of today and yesterday
    const startOfToday = getStartOfDayIST(now);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    // Find stuck games from previous day (any status that should have been completed)
    const stuckGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { 
        $gte: startOfYesterday,
        $lt: startOfToday 
      }
    });
    
    if (stuckGames.length > 0) {
      console.log(`🔧 Found ${stuckGames.length} stuck games from previous day - fixing...`);
      
      // Group by status for better logging
      const statusCounts = stuckGames.reduce((acc, game) => {
        acc[game.status] = (acc[game.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`📊 Stuck games by status:`, statusCounts);
      
      for (const game of stuckGames) {
        console.log(`🎯 Fixing stuck game ${game._id} (status: ${game.status}) from ${game.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        try {
          await declareDeterministicWinner(game._id?.toString() || '');
          console.log(`✅ Successfully declared result for game ${game._id}`);
        } catch (error) {
          console.error(`❌ Failed to declare result for game ${game._id}:`, error);
        }
      }
      
      console.log(`✅ Completed processing ${stuckGames.length} stuck games from previous day`);
    } else {
      console.log(`✅ No stuck games found from previous day`);
    }
    
    // STEP 2: Ensure current day's first game (12:00 AM) exists
    console.log(`🎮 Checking for 12:00 AM game for new day...`);
    const firstGameOfDay = await Game.findOne({
      timeWindow: startOfToday.toISOString()
    });
    
    if (!firstGameOfDay) {
      console.log(`🎮 Creating missing 12:00 AM game for new day...`);
      try {
        await createNextGameIfNeeded();
        console.log(`✅ Successfully created 12:00 AM game for new day`);
      } catch (error) {
        console.error(`❌ Failed to create 12:00 AM game:`, error);
      }
    } else {
      console.log(`✅ 12:00 AM game already exists: ${firstGameOfDay._id} (status: ${firstGameOfDay.status})`);
    }
    
  } catch (error) {
    console.error(`❌ Error in midnight transition fix:`, error);
  }
}

export function initGameAutomation() {
  // Log current timer configuration
  logTimerConfig();
  
  // Progressive game creation - create next game when current slot ends
  const gameCreationCron = '0 */1 * * * *'; // Every minute to check if next game should be created
  cron.schedule(gameCreationCron, createNextGameIfNeeded);
  
  // Process game results - every 30 seconds (more frequent for better responsiveness)
  const resultProcessingCron = '*/30 * * * * *'; // Every 30 seconds
  cron.schedule(resultProcessingCron, processGameResults);
  
  // Process break timer - every 30 seconds (more frequent for better responsiveness)
  const breakTimerCron = '*/30 * * * * *'; // Every 30 seconds
  cron.schedule(breakTimerCron, processBreakTimer);
  
  // Midnight transition fix - runs at 12:01 AM to handle stuck previous day games
  const midnightFixCron = '1 0 * * *'; // Every day at 12:01 AM
  cron.schedule(midnightFixCron, fixMidnightTransition);
  
  // Create initial game immediately if none exist for current/next slot
  setTimeout(async () => {
    // eslint-disable-next-line no-console
    console.log('🚀 Checking if active game exists for current/next slot...');
    
    const now = getCurrentISTTime();
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    
    // Check if we have an active game (open, waiting_result) or a game for the next slot
    const activeGame = await Game.findOne({
      $or: [
        { status: { $in: ['open', 'waiting_result'] } },
        { 
          timeWindow: { 
            $in: [currentSlot.toISOString(), nextSlot.toISOString()] 
          } 
        }
      ]
    });
    
    if (!activeGame) {
      console.log('⚠️ No active game found - creating game for current/next slot...');
      await createNextGameIfNeeded();
    } else {
      console.log(`✅ Found active game: ${activeGame._id} (${activeGame.status}) for slot ${new Date(activeGame.timeWindow).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }
  }, 2000); // Wait 2 seconds after server start
  
  // eslint-disable-next-line no-console
  console.log(`Game automation initialized (${getBiddingDuration()} min bidding + ${getBreakDuration()} min break)`);
  console.log(`🎮 Progressive game creation cron: ${gameCreationCron} (create next game when needed)`);
  console.log(`🔄 Result processing cron: ${resultProcessingCron} (every 30 seconds)`);
  console.log(`⏰ Break timer cron: ${breakTimerCron} (every 30 seconds)`);
  console.log(`🌙 Midnight transition fix cron: ${midnightFixCron} (fix stuck previous day games at 12:01 AM)`);
}

// Helper function to generate cron schedule for game creation
function getGameCreationCron(): string {
  const interval = getGameCreationInterval();
  
  if (interval === 30) {
    // Run every minute to ensure no gaps, but only create games at 30-minute intervals
    return '* * * * *'; // Every minute - the function will check if a game should be created
  } else if (interval === 15) {
    return '0,15,30,45 * * * *'; // Every 15 minutes
  } else if (interval === 10) {
    return '0,10,20,30,40,50 * * * *'; // Every 10 minutes
  } else if (interval === 5) {
    return '*/5 * * * *'; // Every 5 minutes
  } else if (interval === 2) {
    return '*/2 * * * *'; // Every 2 minutes
  } else if (interval === 1) {
    return '* * * * *'; // Every minute
  } else {
    // Custom interval - create games every X minutes
    return `0 */${interval} * * * *`;
  }
}

// Export for manual use
export { declareWinner, declareDeterministicWinner, getBiddingDuration, getBreakDuration, getTotalGameDuration }; 