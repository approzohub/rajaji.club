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

async function verifyGameStatus() {
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
    
    console.log(`📅 Checking games for: ${startOfToday.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all games from today
    const todayGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ timeWindow: 1 });

    console.log(`\n📊 Found ${todayGames.length} games for today`);

    // Get all 48 time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    
    // Group games by time window
    const gamesBySlot: { [key: string]: any[] } = {};
    
    todayGames.forEach(game => {
      const timeWindow = game.timeWindow;
      if (!gamesBySlot[timeWindow]) {
        gamesBySlot[timeWindow] = [];
      }
      gamesBySlot[timeWindow].push(game);
    });

    // Check for duplicate slots
    const duplicateSlots = Object.entries(gamesBySlot)
      .filter(([slot, games]) => games.length > 1)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    if (duplicateSlots.length > 0) {
      console.log(`\n❌ ISSUE: Found ${duplicateSlots.length} slots with multiple games:`);
      
      for (const [slot, games] of duplicateSlots) {
        const slotTime = new Date(slot);
        const slotIndex = getTimeSlotIndex(slotTime);
        const slotTimeString = slotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        
        console.log(`\n📅 Slot ${slotIndex}/47 (${slotTimeString}): ${games.length} games`);
        
        games.forEach((game, index) => {
          console.log(`   ${index + 1}. ${game._id} (${game.status}) - Created: ${game.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
          console.log(`      Start: ${new Date(game.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
          console.log(`      Bidding End: ${new Date(game.biddingEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
          console.log(`      Game End: ${new Date(game.gameEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        });
      }
    } else {
      console.log(`\n✅ No duplicate slots found - each slot has exactly one game`);
    }

    // Check status consistency
    console.log(`\n🔍 Checking status consistency:`);
    
    let statusIssues = 0;
    
    for (let i = 0; i < allTimeSlots.length; i++) {
      const slot = allTimeSlots[i];
      const slotIndex = i;
      const slotTimeString = slot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      
      const gamesForSlot = gamesBySlot[slot.toISOString()] || [];
      
      if (gamesForSlot.length === 0) {
        console.log(`❌ Slot ${slotIndex}/47 (${slotTimeString}): No game found`);
        statusIssues++;
        continue;
      }
      
      if (gamesForSlot.length > 1) {
        console.log(`❌ Slot ${slotIndex}/47 (${slotTimeString}): Multiple games found (${gamesForSlot.length})`);
        statusIssues++;
        continue;
      }
      
      const game = gamesForSlot[0];
      const gameStartTime = new Date(game.startTime);
      const gameBiddingEndTime = new Date(game.biddingEndTime);
      const gameEndTime = new Date(game.gameEndTime);
      
      // Determine expected status based on current time
      let expectedStatus: string;
      if (now >= gameStartTime && now < gameBiddingEndTime) {
        expectedStatus = 'open';
      } else if (now >= gameBiddingEndTime && now < gameEndTime) {
        expectedStatus = 'waiting_result';
      } else {
        expectedStatus = 'result_declared';
      }
      
      // Check if status matches expected
      if (game.status !== expectedStatus) {
        console.log(`❌ Slot ${slotIndex}/47 (${slotTimeString}): Status mismatch`);
        console.log(`   Expected: ${expectedStatus}, Actual: ${game.status}`);
        console.log(`   Game ID: ${game._id}`);
        console.log(`   Start: ${gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   Bidding End: ${gameBiddingEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`   Game End: ${gameEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        statusIssues++;
      } else {
        console.log(`✅ Slot ${slotIndex}/47 (${slotTimeString}): ${game.status} (correct)`);
      }
    }

    // Check for results consistency
    console.log(`\n🏆 Checking results consistency:`);
    
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: 1 });

    console.log(`📊 Found ${todayResults.length} results for today`);

    // Check if each result_declared game has a corresponding result
    const resultDeclaredGames = todayGames.filter(game => game.status === 'result_declared');
    console.log(`📊 Found ${resultDeclaredGames.length} games with result_declared status`);

    let resultIssues = 0;
    
    for (const game of resultDeclaredGames) {
      const result = await Result.findOne({ game: game._id });
      if (!result) {
        console.log(`❌ Game ${game._id} is result_declared but no result record exists`);
        resultIssues++;
      }
    }

    // Check if each result has a corresponding result_declared game
    for (const result of todayResults) {
      const game = await Game.findById(result.game);
      if (!game) {
        console.log(`❌ Result ${result._id} exists but game ${result.game} not found`);
        resultIssues++;
      } else if (game.status !== 'result_declared') {
        console.log(`❌ Result ${result._id} exists but game ${result.game} status is ${game.status} (should be result_declared)`);
        resultIssues++;
      }
    }

    // Summary
    console.log(`\n📊 Verification Summary:`);
    console.log(`   Total time slots: ${allTimeSlots.length}/48`);
    console.log(`   Games found: ${todayGames.length}`);
    console.log(`   Results found: ${todayResults.length}`);
    console.log(`   Duplicate slots: ${duplicateSlots.length}`);
    console.log(`   Status issues: ${statusIssues}`);
    console.log(`   Result issues: ${resultIssues}`);
    
    if (duplicateSlots.length === 0 && statusIssues === 0 && resultIssues === 0) {
      console.log(`\n✅ All verifications passed! Game status is consistent.`);
    } else {
      console.log(`\n❌ Issues found! Run cleanup scripts to fix.`);
    }

  } catch (error) {
    console.error('❌ Error verifying game status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyGameStatus();
