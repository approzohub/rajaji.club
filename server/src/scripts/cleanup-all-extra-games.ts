import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { 
  getCurrentISTTime, 
  addMinutesIST,
  getTimeSlotIndex,
  getAllTimeSlotsForDate
} from '../utils/timezone';

async function cleanupAllExtraGames() {
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
    console.log(`\n🕐 Current IST time: ${now.toISOString()}`);
    console.log(`📅 IST time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}\n`);

    // Get all games from the last 2 hours
    const twoHoursAgo = addMinutesIST(now, -120); // 2 hours ago
    const recentGames = await Game.find({
      createdAt: { $gte: twoHoursAgo }
    }).sort({ createdAt: -1 });

    console.log(`📊 Found ${recentGames.length} games in the last 2 hours`);

    // Group games by 30-minute slots using consistent slot calculation
    const gamesBySlot: { [key: string]: any[] } = {};
    
    recentGames.forEach(game => {
      // Use consistent time slot calculation
      const gameTime = new Date(game.timeWindow);
      const slotIndex = getTimeSlotIndex(gameTime);
      const slotTime = getAllTimeSlotsForDate(gameTime)[slotIndex];
      const slotKey = slotTime.toISOString();
      
      if (!gamesBySlot[slotKey]) {
        gamesBySlot[slotKey] = [];
      }
      gamesBySlot[slotKey].push(game);
    });

    // Find slots with multiple games
    const duplicateSlots = Object.entries(gamesBySlot)
      .filter(([slot, games]) => games.length > 1)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime());

    if (duplicateSlots.length === 0) {
      console.log('✅ No duplicate slots found');
      return;
    }

    console.log(`\n🔍 Found ${duplicateSlots.length} slots with multiple games:\n`);

    let totalDeleted = 0;

    for (const [slot, games] of duplicateSlots) {
      const slotTime = new Date(slot);
      const slotIndex = getTimeSlotIndex(slotTime);
      const slotTimeString = slotTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`📅 Slot ${slotIndex}/47 (${slotTimeString}): ${slot}`);
      console.log(`   Games found: ${games.length}`);
      
      // Sort games by creation time (oldest first)
      games.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Keep the first (oldest) game, delete the rest
      const gameToKeep = games[0];
      const gamesToDelete = games.slice(1);
      
      console.log(`   Keeping: ${gameToKeep._id} (${gameToKeep.status}) - Created: ${gameToKeep.createdAt.toISOString()}`);
      console.log(`   Time Window: ${gameToKeep.timeWindow}`);
      
      for (const gameToDelete of gamesToDelete) {
        console.log(`   Deleting: ${gameToDelete._id} (${gameToDelete.status}) - Created: ${gameToDelete.createdAt.toISOString()}`);
        console.log(`   Time Window: ${gameToDelete.timeWindow}`);
        
        try {
          await Game.findByIdAndDelete(gameToDelete._id);
          totalDeleted++;
          console.log(`   ✅ Deleted: ${gameToDelete._id}`);
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${gameToDelete._id} - ${error}`);
        }
      }
      console.log('');
    }

    console.log(`\n🎯 Cleanup Summary:`);
    console.log(`   Slots processed: ${duplicateSlots.length}`);
    console.log(`   Total games deleted: ${totalDeleted}`);
    console.log(`   Games remaining: ${recentGames.length - totalDeleted}`);

    // Verify cleanup
    const remainingGames = await Game.find({
      createdAt: { $gte: twoHoursAgo }
    }).sort({ createdAt: -1 });

    console.log(`\n📊 Verification - Remaining games in last 2 hours: ${remainingGames.length}`);
    
    // Group remaining games by consistent slots
    const remainingBySlot: { [key: string]: any[] } = {};
    remainingGames.forEach(game => {
      const gameTime = new Date(game.timeWindow);
      const slotIndex = getTimeSlotIndex(gameTime);
      const slotTime = getAllTimeSlotsForDate(gameTime)[slotIndex];
      const slotKey = slotTime.toISOString();
      
      if (!remainingBySlot[slotKey]) {
        remainingBySlot[slotKey] = [];
      }
      remainingBySlot[slotKey].push(game);
    });

    const stillDuplicate = Object.entries(remainingBySlot)
      .filter(([slot, games]) => games.length > 1);

    if (stillDuplicate.length > 0) {
      console.log(`⚠️  Warning: ${stillDuplicate.length} slots still have multiple games`);
      stillDuplicate.forEach(([slot, games]) => {
        console.log(`   ${slot}: ${games.length} games`);
      });
    } else {
      console.log('✅ All slots now have only one game');
    }

    // Show remaining games
    console.log(`\n📋 Remaining games:`);
    remainingGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game._id} (${game.status}) - ${game.timeWindow} - Created: ${game.createdAt.toISOString()}`);
    });

  } catch (error) {
    console.error('Error cleaning up games:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanupAllExtraGames(); 