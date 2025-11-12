import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { Result } from '../models/result.model';
import { Card } from '../models/card.model';
import { 
  getCurrentISTTime, 
  getStartOfDayIST, 
  getEndOfDayIST, 
  getAllTimeSlotsForDate,
  getTimeSlotIndex,
  getCurrentThirtyMinuteSlot,
  getNextThirtyMinuteSlot,
  addMinutesIST
} from '../utils/timezone';

// Timer configuration from environment variables
const BIDDING_DURATION = parseInt(process.env.BIDDING_DURATION || '25');
const BREAK_DURATION = parseInt(process.env.BREAK_DURATION || '5');

// Helper function to get total game duration
function getTotalGameDuration(): number {
  return BIDDING_DURATION + BREAK_DURATION;
}

async function resetAndFixAll() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const now = getCurrentISTTime();
    console.log(`\n🕐 Current IST time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // STEP 1: Clean up today's data
    console.log(`\n🗑️ STEP 1: Cleaning up today's data...`);
    
    const startOfToday = getStartOfDayIST(now);
    const endOfToday = getEndOfDayIST(now);

    // Delete all results from today
    const resultDeleteResult = await Result.deleteMany({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });
    console.log(`✅ Deleted ${resultDeleteResult.deletedCount} results from today`);

    // Delete all games from today
    const gameDeleteResult = await Game.deleteMany({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });
    console.log(`✅ Deleted ${gameDeleteResult.deletedCount} games from today`);

    // Also delete any games that might have the current time window to prevent conflicts
    const cleanupCurrentSlot = getCurrentThirtyMinuteSlot(now);
    const cleanupNextSlot = getNextThirtyMinuteSlot(now);
    
    const currentSlotGame = await Game.findOne({
      timeWindow: cleanupCurrentSlot.toISOString()
    });
    
    if (currentSlotGame) {
      await Game.findByIdAndDelete(currentSlotGame._id);
      console.log(`✅ Deleted existing game for current slot: ${currentSlotGame._id}`);
    }
    
    const nextSlotGame = await Game.findOne({
      timeWindow: cleanupNextSlot.toISOString()
    });
    
    if (nextSlotGame) {
      await Game.findByIdAndDelete(nextSlotGame._id);
      console.log(`✅ Deleted existing game for next slot: ${nextSlotGame._id}`);
    }

    // STEP 2: Create missing results for completed slots
    console.log(`\n🏆 STEP 2: Creating missing results for completed slots...`);
    
    // Get all 48 time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    
    // Filter to only include slots that have passed (up to current time)
    const completedSlots: Date[] = [];
    for (const slot of allTimeSlots) {
      if (slot <= now) {
        completedSlots.push(slot);
      }
    }

    console.log(`📅 Found ${completedSlots.length} completed slots today`);

    // Get active cards for random results
    const activeCards = await Card.find({ isActive: true }).select('card symbol');
    
    if (activeCards.length === 0) {
      console.error('❌ No active cards available for random results');
      return;
    }

    const activeCardNames = activeCards.map(card => `${card.card} ${card.symbol}`);
    console.log(`🎴 Using ${activeCardNames.length} active cards for random results`);

    // Create results for completed slots
    let createdResults = 0;
    for (const slot of completedSlots) {
      try {
        // Select random winner
        const randomIndex = Math.floor(Math.random() * activeCardNames.length);
        const winningCard = activeCardNames[randomIndex];
        
        // Calculate game timing: game starts at slot time, result declared at game end time
        const gameStartTime = slot;
        const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
        const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());
        const resultTime = gameEndTime; // Result is declared at game end time
        
        // Get slot information for logging
        const slotIndex = getTimeSlotIndex(gameStartTime);
        const slotTimeString = gameStartTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        // Create game
        const game = await Game.create({
          timeWindow: gameStartTime.toISOString(),
          status: 'result_declared',
          totalPool: 0,
          startTime: gameStartTime,
          biddingEndTime: biddingEndTime,
          gameEndTime: gameEndTime,
          winningCard,
          resultDeclaredAt: resultTime,
          isRandomResult: true
        });

        // Create Result record
        await Result.create({
          game: game._id,
          gameId: game._id?.toString() || '',
          winningCard,
          winningCardType: winningCard.charAt(0),
          winningCardSuit: winningCard.charAt(1) === '♥' ? 'hearts' : 
                          winningCard.charAt(1) === '♦' ? 'diamonds' : 
                          winningCard.charAt(1) === '♣' ? 'clubs' : 
                          winningCard.charAt(1) === '♠' ? 'spades' : 'unknown',
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
          gameStartTime: gameStartTime,
          gameEndTime: gameEndTime,
          biddingEndTime: biddingEndTime,
          isRandomResult: true
        });

        console.log(`✅ Created result for slot ${slotIndex}/47 (${slotTimeString}): ${winningCard}`);
        createdResults++;

      } catch (error) {
        console.error(`❌ Error creating result for slot:`, error);
      }
    }

    console.log(`📊 Created ${createdResults} results for completed slots`);

    // STEP 3: Create active game for bidding
    console.log(`\n🎮 STEP 3: Creating active game for bidding...`);
    
    // Get current and next slot information
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    const currentSlotIndex = getTimeSlotIndex(now);
    const nextSlotIndex = getTimeSlotIndex(nextSlot);
    
    console.log(`📅 Current slot: ${currentSlotIndex}/47 (${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`📅 Next slot: ${nextSlotIndex}/47 (${nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })})`);

    // Check if we should create game for current slot or next slot
    let gameStartTime: Date;
    let gameSlotIndex: number;
    let gameSlotTime: string;

    // Only create game for the current active slot (not future slots)
    if (now >= currentSlot && now < nextSlot) {
      // We're in the current slot - create game for current slot
      gameStartTime = currentSlot;
      gameSlotIndex = currentSlotIndex;
      gameSlotTime = currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`📅 Creating game for current active slot ${gameSlotIndex}/47 (${gameSlotTime})`);
    } else if (now < currentSlot) {
      // We're before the current slot - create game for current slot
      gameStartTime = currentSlot;
      gameSlotIndex = currentSlotIndex;
      gameSlotTime = currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`📅 Creating game for upcoming current slot ${gameSlotIndex}/47 (${gameSlotTime})`);
    } else {
      // We're past the current slot - create game for next slot
      gameStartTime = nextSlot;
      gameSlotIndex = nextSlotIndex;
      gameSlotTime = nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`📅 Creating game for next slot ${gameSlotIndex}/47 (${gameSlotTime})`);
    }

    // Check if there's already an active game
    const existingActiveGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    if (existingActiveGame) {
      console.log(`⚠️ Active game already exists: ${existingActiveGame._id}`);
      console.log(`   Status: ${existingActiveGame.status}`);
      console.log(`   Start: ${existingActiveGame.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   End: ${existingActiveGame.gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Skipping creation of new active game`);
    } else {
      // Calculate game timing
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());

                // Check if a game already exists for this time window
    const existingGame = await Game.findOne({
      timeWindow: gameStartTime.toISOString()
    });

    if (existingGame) {
      console.log(`⚠️ Game already exists for time window ${gameStartTime.toISOString()}: ${existingGame._id}`);
      console.log(`   Status: ${existingGame.status}`);
      console.log(`   isRandomResult: ${existingGame.isRandomResult}`);
      
      // Update the existing game to be the active game
      existingGame.status = 'open';
      // Keep isRandomResult as true (default) for proper automation
      existingGame.totalPool = 0;
      await existingGame.save();
      
      console.log(`✅ Updated existing game to active status`);
      console.log(`   Game ID: ${existingGame._id}`);
      console.log(`   Status: ${existingGame.status}`);
      console.log(`   isRandomResult: ${existingGame.isRandomResult} (kept for automation)`);
    } else {
      // Create new active game (without isRandomResult flag for active games)
      const newGame = await Game.create({
        timeWindow: gameStartTime.toISOString(),
        status: 'open',
        totalPool: 0,
        startTime: gameStartTime,
        biddingEndTime,
        gameEndTime,
        // isRandomResult defaults to true for proper automation
      });

            console.log(`\n✅ Created new active game:`);
      console.log(`   Game ID: ${newGame._id}`);
      console.log(`   Slot: ${gameSlotIndex}/47 (${gameSlotTime})`);
      console.log(`   Status: ${newGame.status}`);
      console.log(`   Start: ${newGame.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Bidding End: ${newGame.biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Game End: ${newGame.gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }

      // Calculate remaining time for bidding
      const timeUntilBiddingEnd = Math.max(0, biddingEndTime.getTime() - now.getTime());
      const minutesRemaining = Math.floor(timeUntilBiddingEnd / (60 * 1000));
      const secondsRemaining = Math.floor((timeUntilBiddingEnd % (60 * 1000)) / 1000);

      console.log(`\n⏰ Bidding phase:`);
      console.log(`   Time remaining: ${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')}`);
      console.log(`   Status: Active for bidding`);
    }

    // STEP 4: Final verification
    console.log(`\n📊 STEP 4: Final verification...`);
    
    const finalResults = await Result.countDocuments({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    const finalGames = await Game.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    console.log(`\n✅ Reset and fix completed successfully!`);
    console.log(`   Results created: ${finalResults}`);
    console.log(`   Games created: ${finalGames}`);
    console.log(`   Active games: ${activeGames.length}`);
    console.log(`   Current active game: ${activeGames.length > 0 ? activeGames[0]._id : 'None'}`);

  } catch (error) {
    console.error('❌ Error during reset and fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

resetAndFixAll();
