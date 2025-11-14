import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { Result } from '../models/result.model';
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

async function fixWrongTimestamps() {
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
    
    console.log(`📅 Fixing wrong timestamps for: ${startOfToday.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all games from today
    const todayGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    console.log(`📊 Found ${todayGames.length} games for today`);

    // Get all 48 time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    
    // STEP 1: Identify games with wrong timestamps
    console.log(`\n🔍 STEP 1: Identifying games with wrong timestamps...`);
    
    const gamesToDelete: any[] = [];
    const gamesToKeep: any[] = [];
    
    for (const game of todayGames) {
      const gameStartTime = new Date(game.startTime);
      const expectedSlotTime = new Date(game.timeWindow);
      
      // Check if the game start time matches the expected slot time
      const timeDiff = Math.abs(gameStartTime.getTime() - expectedSlotTime.getTime());
      const isCorrectTime = timeDiff < 60000; // 1 minute tolerance
      
      if (isCorrectTime) {
        gamesToKeep.push(game);
        console.log(`✅ Game ${game._id} has correct timestamp: ${gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      } else {
        gamesToDelete.push(game);
        console.log(`❌ Game ${game._id} has wrong timestamp: ${gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} (expected: ${expectedSlotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })})`);
      }
    }

    console.log(`\n📊 Analysis:`);
    console.log(`   Games with correct timestamps: ${gamesToKeep.length}`);
    console.log(`   Games with wrong timestamps: ${gamesToDelete.length}`);

    if (gamesToDelete.length === 0) {
      console.log(`\n✅ All games have correct timestamps! No fixes needed.`);
      return;
    }

    // STEP 2: Delete games with wrong timestamps
    console.log(`\n🗑️ STEP 2: Deleting games with wrong timestamps...`);
    
    let deletedCount = 0;
    for (const game of gamesToDelete) {
      try {
        await Game.findByIdAndDelete(game._id);
        console.log(`✅ Deleted game ${game._id}`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ Failed to delete game ${game._id}: ${error}`);
      }
    }

    console.log(`✅ Deleted ${deletedCount} games with wrong timestamps`);

    // STEP 3: Create new games with correct timestamps
    console.log(`\n🎮 STEP 3: Creating new games with correct timestamps...`);
    
    let createdCount = 0;
    
    for (let i = 0; i < allTimeSlots.length; i++) {
      const slot = allTimeSlots[i];
      const slotIndex = i;
      const slotTimeString = slot.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Check if a game already exists for this slot (from gamesToKeep)
      const existingGame = gamesToKeep.find(game => {
        const gameStartTime = new Date(game.startTime);
        const timeDiff = Math.abs(gameStartTime.getTime() - slot.getTime());
        return timeDiff < 60000; // 1 minute tolerance
      });

      if (existingGame) {
        console.log(`⏭️ Slot ${slotIndex}/47 (${slotTimeString}): Game already exists with correct timestamp - ${existingGame._id}`);
        continue;
      }

      // Calculate game timing
      const gameStartTime = slot;
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());

      // Determine game status based on current time
      let gameStatus: string;
      if (now < gameStartTime) {
        gameStatus = 'waiting_start';
      } else if (now >= gameStartTime && now < biddingEndTime) {
        gameStatus = 'open';
      } else if (now >= biddingEndTime && now < gameEndTime) {
        gameStatus = 'waiting_result';
      } else {
        gameStatus = 'result_declared';
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
    }

    console.log(`✅ Created ${createdCount} new games with correct timestamps`);

    // STEP 4: Final verification
    console.log(`\n📊 STEP 4: Final verification...`);
    
    const finalGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    console.log(`\n✅ Fix completed successfully!`);
    console.log(`   Original games: ${todayGames.length}`);
    console.log(`   Games deleted: ${deletedCount}`);
    console.log(`   Games created: ${createdCount}`);
    console.log(`   Final games: ${finalGames.length}`);

    // Show sample of corrected games
    console.log(`\n📋 Sample of corrected games:`);
    finalGames.slice(0, 10).forEach((game, index) => {
      const gameStartTime = new Date(game.startTime);
      const slotIndex = getTimeSlotIndex(gameStartTime);
      const slotTimeString = gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`   ${index + 1}. ${game._id} (${game.status}) - Slot ${slotIndex}/47 (${slotTimeString})`);
    });

    console.log(`\n🎉 All games now have correct timestamps!`);

  } catch (error) {
    console.error('❌ Error fixing wrong timestamps:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixWrongTimestamps();
