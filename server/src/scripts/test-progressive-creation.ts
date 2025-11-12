import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { 
  getCurrentISTTime, 
  getCurrentThirtyMinuteSlot,
  getNextThirtyMinuteSlot,
  getAllTimeSlotsForDate,
  getTimeSlotIndex,
  addMinutesIST
} from '../utils/timezone';

// Timer configuration from environment variables
const BIDDING_DURATION = parseInt(process.env.BIDDING_DURATION || '25');
const BREAK_DURATION = parseInt(process.env.BREAK_DURATION || '5');

// Helper function to get total game duration
function getTotalGameDuration(): number {
  return BIDDING_DURATION + BREAK_DURATION;
}

async function testProgressiveCreation() {
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

    // Get current and next 30-minute slots
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    
    console.log(`📅 Current slot: ${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`📅 Next slot: ${nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Check current game status
    console.log(`\n🔍 Checking current game status...`);
    
    // Check if we already have an active game (open or waiting_result)
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] }
    });
    
    if (activeGame) {
      console.log(`✅ Active game exists: ${activeGame._id} (${activeGame.status})`);
      console.log(`   Time Window: ${new Date(activeGame.timeWindow).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Start Time: ${new Date(activeGame.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Bidding End: ${new Date(activeGame.biddingEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Game End: ${new Date(activeGame.gameEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      console.log(`❌ No active game found`);
    }

    // Check games for current and next slots
    console.log(`\n🔍 Checking games for current and next slots...`);
    
    const currentSlotGame = await Game.findOne({
      timeWindow: currentSlot.toISOString()
    });
    
    const nextSlotGame = await Game.findOne({
      timeWindow: nextSlot.toISOString()
    });
    
    if (currentSlotGame) {
      console.log(`✅ Current slot game: ${currentSlotGame._id} (${currentSlotGame.status})`);
    } else {
      console.log(`❌ No game for current slot`);
    }
    
    if (nextSlotGame) {
      console.log(`✅ Next slot game: ${nextSlotGame._id} (${nextSlotGame.status})`);
    } else {
      console.log(`❌ No game for next slot`);
    }

    // Simulate the createNextGameIfNeeded logic
    console.log(`\n🎮 Simulating createNextGameIfNeeded logic...`);
    
    if (activeGame) {
      console.log(`✅ Active game exists - no need to create new game`);
    } else if (currentSlotGame) {
      console.log(`✅ Game exists for current slot: ${currentSlotGame._id} (${currentSlotGame.status})`);
      
      // Current slot game exists
      console.log(`✅ Current slot game exists: ${currentSlotGame._id} (${currentSlotGame.status})`);
    } else if (nextSlotGame) {
      console.log(`✅ Game exists for next slot: ${nextSlotGame._id} (${nextSlotGame.status})`);
    } else {
      console.log(`⚠️ No active game found - would create new game`);
      
      // Determine which slot to create game for
      let targetSlot: Date;
      let gameStatus: string;
      
      if (now >= currentSlot && now < nextSlot) {
        targetSlot = currentSlot;
        gameStatus = 'open';
        console.log(`📅 Would create game for current slot (${targetSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}) - status: ${gameStatus}`);
      } else {
        targetSlot = nextSlot;
        gameStatus = 'open';
        console.log(`📅 Would create game for next slot (${targetSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}) - status: ${gameStatus}`);
      }
      
      // Calculate game timing
      const gameStartTime = targetSlot;
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());
      
      console.log(`   Start: ${gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Bidding End: ${biddingEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Game End: ${gameEndTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }

    // Show all games for today
    console.log(`\n📊 All games for today:`);
    
    const allTimeSlots = getAllTimeSlotsForDate(now);
    const todayGames = await Game.find({
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      }
    }).sort({ timeWindow: 1 });

    console.log(`📊 Found ${todayGames.length} games for today`);
    
    todayGames.forEach((game, index) => {
      const gameStartTime = new Date(game.startTime);
      const slotIndex = getTimeSlotIndex(gameStartTime);
      const slotTimeString = gameStartTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`   ${index + 1}. ${game._id} (${game.status}) - Slot ${slotIndex}/47 (${slotTimeString})`);
    });

    console.log(`\n✅ Progressive creation test completed!`);

  } catch (error) {
    console.error('❌ Error testing progressive creation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testProgressiveCreation();
