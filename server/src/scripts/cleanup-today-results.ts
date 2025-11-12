import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { Result } from '../models/result.model';
import { getCurrentISTTime, getStartOfDayIST, getEndOfDayIST } from '../utils/timezone';

async function cleanupTodayResults() {
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
    
    // Get the start of today in IST
    const startOfToday = getStartOfDayIST(now);
    
    // Get the end of today in IST
    const endOfToday = getEndOfDayIST(now);

    console.log(`🗑️ Cleaning up results and games for today: ${startOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} to ${endOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

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

    // Verify cleanup
    const remainingResults = await Result.countDocuments({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    const remainingGames = await Game.countDocuments({
      createdAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    console.log(`\n📊 Cleanup Verification:`);
    console.log(`   Remaining results from today: ${remainingResults}`);
    console.log(`   Remaining games from today: ${remainingGames}`);

    if (remainingResults === 0 && remainingGames === 0) {
      console.log(`\n✅ Cleanup completed successfully!`);
    } else {
      console.log(`\n⚠️ Some data still remains from today`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanupTodayResults();
