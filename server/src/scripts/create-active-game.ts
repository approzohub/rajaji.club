import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { 
  getCurrentISTTime, 
  getCurrentThirtyMinuteSlot,
  getNextThirtyMinuteSlot,
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

async function createActiveGame() {
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
    
    // Get current and next slot information
    const currentSlot = getCurrentThirtyMinuteSlot(now);
    const nextSlot = getNextThirtyMinuteSlot(now);
    const currentSlotIndex = getTimeSlotIndex(now);
    const nextSlotIndex = getTimeSlotIndex(nextSlot);
    
    console.log(`📅 Current slot: ${currentSlotIndex}/47 (${currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`📅 Next slot: ${nextSlotIndex}/47 (${nextSlot.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })})`);

    // Check for active games (open or waiting_result)
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    console.log(`\n🎯 Active games found: ${activeGames.length}`);

    if (activeGames.length > 0) {
      console.log(`✅ Active game already exists:`);
      activeGames.forEach((game, index) => {
        const gameSlotIndex = getTimeSlotIndex(new Date(game.timeWindow));
        const gameSlotTime = new Date(game.timeWindow).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
        console.log(`   ${index + 1}. ${game._id} (${game.status}) - Slot ${gameSlotIndex}/47 (${gameSlotTime})`);
        console.log(`      Start: ${new Date(game.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`      Bidding End: ${new Date(game.biddingEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        console.log(`      Game End: ${new Date(game.gameEndTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      });
      return;
    }

    // No active games found - determine which game to create
    console.log(`\n⚠️ No active games found - creating new game`);

    // Check if we should create game for current slot or next slot
    let gameStartTime: Date;
    let gameSlotIndex: number;
    let gameSlotTime: string;

    if (now < currentSlot) {
      // Current slot hasn't started yet - create game for current slot
      gameStartTime = currentSlot;
      gameSlotIndex = currentSlotIndex;
      gameSlotTime = currentSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`📅 Creating game for current slot ${gameSlotIndex}/47 (${gameSlotTime})`);
    } else {
      // Current slot has passed - create game for next slot
      gameStartTime = nextSlot;
      gameSlotIndex = nextSlotIndex;
      gameSlotTime = nextSlot.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' });
      console.log(`📅 Creating game for next slot ${gameSlotIndex}/47 (${gameSlotTime})`);
    }

    // Calculate game timing
    const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
    const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());

    console.log(`\n📅 Game timing calculation:`);
    console.log(`   Game start: ${gameStartTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Bidding end: ${biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Game end: ${gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Check if game already exists for this time window
    const existingGame = await Game.findOne({ 
      timeWindow: gameStartTime.toISOString() 
    });

    if (existingGame) {
      console.log(`⚠️ Game already exists for slot ${gameSlotIndex}/47 (${gameSlotTime})`);
      console.log(`   Game ID: ${existingGame._id} (${existingGame.status})`);
      
      // Update existing game to open status if it's not already
      if (existingGame.status !== 'open') {
        await Game.findByIdAndUpdate(existingGame._id, { status: 'open' });
        console.log(`✅ Updated game ${existingGame._id} to open status`);
      }
      return;
    }

    // Create new game
    const newGame = await Game.create({
      timeWindow: gameStartTime.toISOString(),
      status: 'open',
      totalPool: 0,
      startTime: gameStartTime,
      biddingEndTime,
      gameEndTime
    });

    console.log(`\n✅ Created new active game:`);
    console.log(`   Game ID: ${newGame._id}`);
    console.log(`   Slot: ${gameSlotIndex}/47 (${gameSlotTime})`);
    console.log(`   Status: ${newGame.status}`);
    console.log(`   Start: ${newGame.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Bidding End: ${newGame.biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Game End: ${newGame.gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Calculate remaining time for bidding
    const timeUntilBiddingEnd = Math.max(0, biddingEndTime.getTime() - now.getTime());
    const minutesRemaining = Math.floor(timeUntilBiddingEnd / (60 * 1000));
    const secondsRemaining = Math.floor((timeUntilBiddingEnd % (60 * 1000)) / 1000);

    console.log(`\n⏰ Bidding phase:`);
    console.log(`   Time remaining: ${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')}`);
    console.log(`   Status: Active for bidding`);

  } catch (error) {
    console.error('❌ Error creating active game:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createActiveGame();
