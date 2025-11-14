import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { 
  getCurrentISTTime, 
  getStartOfDayIST, 
  getEndOfDayIST, 
  getAllTimeSlotsForDate,
  getTimeSlotIndex,
  addMinutesIST
} from '../utils/timezone';

// Timer configuration from environment variables
const BIDDING_DURATION = parseInt(process.env.BIDDING_DURATION || '9');
const BREAK_DURATION = parseInt(process.env.BREAK_DURATION || '1');

// Helper function to get total game duration
function getTotalGameDuration(): number {
  return BIDDING_DURATION + BREAK_DURATION;
}

async function createAllTimeSlots() {
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

    // Get start and end of today
    const startOfToday = getStartOfDayIST(now);
    const endOfToday = getEndOfDayIST(now);
    
    console.log(`📅 Creating all time slots for: ${startOfToday.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all 48 time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    console.log(`🎯 Total time slots to create: ${allTimeSlots.length}/48`);

    // Check existing games for today
    const existingGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    console.log(`📊 Found ${existingGames.length} existing games for today`);

    // Create games for all 48 time slots
    let createdCount = 0;
    let skippedCount = 0;
    let activeGameCreated = false;

    for (let i = 0; i < allTimeSlots.length; i++) {
      const slot = allTimeSlots[i];
      const slotIndex = i;
      const slotTimeString = slot.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Calculate game timing
      const gameStartTime = slot;
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());

      // Check if game already exists for this time window
      const existingGame = await Game.findOne({ 
        timeWindow: gameStartTime.toISOString() 
      });

      if (existingGame) {
        console.log(`⏭️ Slot ${slotIndex}/47 (${slotTimeString}): Game already exists - ${existingGame._id} (${existingGame.status})`);
        skippedCount++;
        
        // Update status if needed based on current time
        let expectedStatus: string;
        if (now < gameStartTime) {
          expectedStatus = 'waiting_start';
        } else if (now >= gameStartTime && now < biddingEndTime) {
          expectedStatus = 'open';
          activeGameCreated = true;
        } else if (now >= biddingEndTime && now < gameEndTime) {
          expectedStatus = 'waiting_result';
        } else {
          expectedStatus = 'result_declared';
        }
        
        if (existingGame.status !== expectedStatus) {
          await Game.findByIdAndUpdate(existingGame._id, { status: expectedStatus });
          console.log(`✅ Updated game ${existingGame._id} status from ${existingGame.status} to ${expectedStatus}`);
        }
        continue;
      }

      // Determine game status based on current time
      let gameStatus: string;
      if (now < gameStartTime) {
        // Game hasn't started yet
        gameStatus = 'waiting_start';
      } else if (now >= gameStartTime && now < biddingEndTime) {
        // Game is in bidding phase
        gameStatus = 'open';
        activeGameCreated = true;
      } else if (now >= biddingEndTime && now < gameEndTime) {
        // Game is in break phase
        gameStatus = 'waiting_result';
      } else {
        // Game has ended - will be marked as result_declared when result is created
        gameStatus = 'waiting_result';
      }

      // Create new game
      const newGame = await Game.create({
        timeWindow: gameStartTime.toISOString(),
        status: gameStatus,
        totalPool: 0,
        startTime: gameStartTime,
        biddingEndTime,
        gameEndTime
      });

      console.log(`✅ Slot ${slotIndex}/47 (${slotTimeString}): Created game ${newGame._id} (${gameStatus})`);
      createdCount++;

      // Show timing details for active games
      if (gameStatus === 'open' || gameStatus === 'waiting_result') {
        const timeUntilBiddingEnd = Math.max(0, biddingEndTime.getTime() - now.getTime());
        const timeUntilGameEnd = Math.max(0, gameEndTime.getTime() - now.getTime());
        
        if (gameStatus === 'open') {
          const minutesRemaining = Math.floor(timeUntilBiddingEnd / (60 * 1000));
          const secondsRemaining = Math.floor((timeUntilBiddingEnd % (60 * 1000)) / 1000);
          console.log(`   ⏰ Bidding phase: ${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')} remaining`);
        } else {
          const minutesRemaining = Math.floor(timeUntilGameEnd / (60 * 1000));
          const secondsRemaining = Math.floor((timeUntilGameEnd % (60 * 1000)) / 1000);
          console.log(`   ⏰ Break phase: ${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')} remaining`);
        }
      }
    }

    // Final summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total slots: ${allTimeSlots.length}/48`);
    console.log(`   Games created: ${createdCount}`);
    console.log(`   Games skipped: ${skippedCount}`);
    console.log(`   Active game created: ${activeGameCreated ? '✅' : '❌'}`);

    // Verify active games
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    console.log(`\n🎯 Active games: ${activeGames.length}`);
    if (activeGames.length > 0) {
      activeGames.forEach((game, index) => {
        const gameSlotIndex = getTimeSlotIndex(new Date(game.timeWindow));
        const gameSlotTime = new Date(game.timeWindow).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        console.log(`   ${index + 1}. ${game._id} (${game.status}) - Slot ${gameSlotIndex}/47 (${gameSlotTime})`);
      });
    } else {
      console.log(`   ⚠️ No active games found - this should not happen!`);
    }

    console.log(`\n✅ All time slots created successfully!`);

  } catch (error) {
    console.error('❌ Error creating time slots:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createAllTimeSlots();
