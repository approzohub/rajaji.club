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
  getCurrentThirtyMinuteSlot,
  getNextThirtyMinuteSlot
} from '../utils/timezone';

async function verifyTimeSlots() {
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
    
    // Get current slot information
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    const currentSlotIndex = getTimeSlotIndex(now);
    
    console.log(`📅 Current slot: ${currentSlotIndex}/47 (${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`📅 Next slot: ${getTimeSlotIndex(nextSlot)}/47 (${nextSlot.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);

    // Get start and end of today
    const startOfToday = getStartOfDayIST(now);
    const endOfToday = getEndOfDayIST(now);
    
    console.log(`\n📊 Today's date range: ${startOfToday.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Start: ${startOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   End: ${endOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all time slots for today
    const allTimeSlots = getAllTimeSlotsForDate(now);
    console.log(`\n🎯 Total time slots for today: ${allTimeSlots.length}/48`);

    // Show first few and last few slots
    console.log(`\n📋 Sample time slots:`);
    console.log(`   First 5 slots:`);
    for (let i = 0; i < 5; i++) {
      const slotTime = allTimeSlots[i];
      console.log(`     Slot ${i}/47: ${slotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }
    
    console.log(`   Last 5 slots:`);
    for (let i = allTimeSlots.length - 5; i < allTimeSlots.length; i++) {
      const slotTime = allTimeSlots[i];
      console.log(`     Slot ${i}/47: ${slotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }

    // Check today's games
    const todayGames = await Game.find({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ createdAt: -1 });

    console.log(`\n🎮 Games created today: ${todayGames.length}`);

    if (todayGames.length > 0) {
      console.log(`\n📋 Recent games:`);
      todayGames.slice(0, 10).forEach((game, index) => {
        const gameSlotIndex = getTimeSlotIndex(new Date(game.timeWindow));
        const gameSlotTime = new Date(game.timeWindow).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        console.log(`   ${index + 1}. ${game._id} (${game.status}) - Slot ${gameSlotIndex}/47 (${gameSlotTime})`);
      });
    }

    // Check today's results
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: -1 });

    console.log(`\n🏆 Results declared today: ${todayResults.length}`);

    if (todayResults.length > 0) {
      console.log(`\n📋 Recent results:`);
      todayResults.slice(0, 10).forEach((result, index) => {
        const resultTime = new Date(result.resultDeclaredAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        console.log(`   ${index + 1}. ${result.winningCard} at ${resultTime}`);
      });
    }

    // Check for active games
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
        console.log(`      Start: ${new Date(game.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`      Bidding End: ${new Date(game.biddingEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`      Game End: ${new Date(game.gameEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      });
    } else {
      console.log(`   No active games found`);
    }

    // Verify slot consistency
    console.log(`\n✅ Time slot verification:`);
    console.log(`   Current time: ${now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Current slot index: ${currentSlotIndex}/47`);
    console.log(`   Current slot time: ${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Next slot time: ${nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    
    // Check if current time is within the expected slot
    const expectedSlotTime = allTimeSlots[currentSlotIndex];
    const isConsistent = Math.abs(expectedSlotTime.getTime() - currentSlot.getTime()) < 60000; // 1 minute tolerance
    
    console.log(`   Slot consistency: ${isConsistent ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error verifying time slots:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

verifyTimeSlots();
