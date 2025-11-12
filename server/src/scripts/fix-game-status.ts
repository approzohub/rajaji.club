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
  getTimeSlotIndex
} from '../utils/timezone';

async function fixGameStatus() {
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
    
    console.log(`📅 Fixing games for: ${startOfToday.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all games from today
    const todayGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    console.log(`📊 Found ${todayGames.length} games for today`);

    // Group games by time window
    const gamesBySlot: { [key: string]: any[] } = {};
    
    todayGames.forEach(game => {
      const timeWindow = game.timeWindow;
      if (!gamesBySlot[timeWindow]) {
        gamesBySlot[timeWindow] = [];
      }
      gamesBySlot[timeWindow].push(game);
    });

    // STEP 1: Fix duplicate slots
    console.log(`\n🗑️ STEP 1: Fixing duplicate slots...`);
    
    let duplicateFixed = 0;
    
    for (const [slot, games] of Object.entries(gamesBySlot)) {
      if (games.length > 1) {
        const slotTime = new Date(slot);
        const slotIndex = getTimeSlotIndex(slotTime);
        const slotTimeString = slotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        
        console.log(`📅 Fixing slot ${slotIndex}/47 (${slotTimeString}): ${games.length} games found`);
        
        // Sort games by creation time (oldest first)
        games.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Keep the first (oldest) game, delete the rest
        const gameToKeep = games[0];
        const gamesToDelete = games.slice(1);
        
        console.log(`   Keeping: ${gameToKeep._id} (${gameToKeep.status}) - Created: ${gameToKeep.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        
        for (const gameToDelete of gamesToDelete) {
          console.log(`   Deleting: ${gameToDelete._id} (${gameToDelete.status}) - Created: ${gameToDelete.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
          
          try {
            await Game.findByIdAndDelete(gameToDelete._id);
            duplicateFixed++;
            console.log(`   ✅ Deleted: ${gameToDelete._id}`);
          } catch (error) {
            console.log(`   ❌ Failed to delete: ${gameToDelete._id} - ${error}`);
          }
        }
      }
    }

    console.log(`✅ Fixed ${duplicateFixed} duplicate games`);

    // STEP 2: Fix game statuses
    console.log(`\n🔧 STEP 2: Fixing game statuses...`);
    
    let statusFixed = 0;
    
    // Get updated games after duplicate removal
    const updatedGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    for (const game of updatedGames) {
      const gameStartTime = new Date(game.startTime);
      const gameBiddingEndTime = new Date(game.biddingEndTime);
      const gameEndTime = new Date(game.gameEndTime);
      
      // Determine expected status based on current time
      let expectedStatus: string;
      if (now < gameStartTime) {
        expectedStatus = 'waiting_start';
      } else if (now >= gameStartTime && now < gameBiddingEndTime) {
        expectedStatus = 'open';
      } else if (now >= gameBiddingEndTime && now < gameEndTime) {
        expectedStatus = 'waiting_result';
      } else {
        expectedStatus = 'result_declared';
      }
      
      // Check if status needs to be updated
      if (game.status !== expectedStatus) {
        const slotIndex = getTimeSlotIndex(gameStartTime);
        const slotTimeString = gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        
        console.log(`📅 Fixing slot ${slotIndex}/47 (${slotTimeString}): ${game.status} → ${expectedStatus}`);
        console.log(`   Game ID: ${game._id}`);
        
        try {
          await Game.findByIdAndUpdate(game._id, { status: expectedStatus });
          statusFixed++;
          console.log(`   ✅ Updated: ${game._id}`);
        } catch (error) {
          console.log(`   ❌ Failed to update: ${game._id} - ${error}`);
        }
      }
    }

    console.log(`✅ Fixed ${statusFixed} game statuses`);

    // STEP 3: Fix result consistency
    console.log(`\n🏆 STEP 3: Fixing result consistency...`);
    
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: 1 });

    console.log(`📊 Found ${todayResults.length} results for today`);

    let resultFixed = 0;
    
    // Check if each result_declared game has a corresponding result
    const resultDeclaredGames = updatedGames.filter(game => game.status === 'result_declared');
    
    for (const game of resultDeclaredGames) {
      const result = await Result.findOne({ game: game._id });
      if (!result) {
        console.log(`❌ Game ${game._id} is result_declared but no result record exists - updating status to waiting_result`);
        try {
          await Game.findByIdAndUpdate(game._id, { status: 'waiting_result' });
          resultFixed++;
          console.log(`   ✅ Updated game ${game._id} status to waiting_result`);
        } catch (error) {
          console.log(`   ❌ Failed to update game ${game._id} - ${error}`);
        }
      }
    }

    // Check if each result has a corresponding result_declared game
    for (const result of todayResults) {
      const game = await Game.findById(result.game);
      if (!game) {
        console.log(`❌ Result ${result._id} exists but game ${result.game} not found - deleting result`);
        try {
          await Result.findByIdAndDelete(result._id);
          resultFixed++;
          console.log(`   ✅ Deleted orphaned result ${result._id}`);
        } catch (error) {
          console.log(`   ❌ Failed to delete result ${result._id} - ${error}`);
        }
      } else if (game.status !== 'result_declared') {
        console.log(`❌ Result ${result._id} exists but game ${result.game} status is ${game.status} - updating to result_declared`);
        try {
          await Game.findByIdAndUpdate(result.game, { status: 'result_declared' });
          resultFixed++;
          console.log(`   ✅ Updated game ${result.game} status to result_declared`);
        } catch (error) {
          console.log(`   ❌ Failed to update game ${result.game} - ${error}`);
        }
      }
    }

    console.log(`✅ Fixed ${resultFixed} result consistency issues`);

    // Final verification
    console.log(`\n📊 Final verification...`);
    
    const finalGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    const finalResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: 1 });

    // Check for duplicates again
    const finalGamesBySlot: { [key: string]: any[] } = {};
    finalGames.forEach(game => {
      const timeWindow = game.timeWindow;
      if (!finalGamesBySlot[timeWindow]) {
        finalGamesBySlot[timeWindow] = [];
      }
      finalGamesBySlot[timeWindow].push(game);
    });

    const finalDuplicateSlots = Object.entries(finalGamesBySlot)
      .filter(([slot, games]) => games.length > 1);

    console.log(`\n✅ Fix completed successfully!`);
    console.log(`   Games remaining: ${finalGames.length}`);
    console.log(`   Results remaining: ${finalResults.length}`);
    console.log(`   Duplicate slots remaining: ${finalDuplicateSlots.length}`);
    console.log(`   Duplicate games fixed: ${duplicateFixed}`);
    console.log(`   Status fixes: ${statusFixed}`);
    console.log(`   Result fixes: ${resultFixed}`);

    if (finalDuplicateSlots.length === 0) {
      console.log(`\n🎉 All issues fixed! Each slot now has exactly one game with correct status.`);
    } else {
      console.log(`\n⚠️ Some duplicate slots still remain - manual intervention may be needed.`);
    }

  } catch (error) {
    console.error('❌ Error fixing game status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixGameStatus();
