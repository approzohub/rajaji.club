import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { Result } from '../models/result.model';
import { getCurrentISTTime, addMinutesIST } from '../utils/timezone';

async function testGameLogic() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Test 1: Check for existing games with same timeWindow
    const testTimeWindow = '2025-08-12T15:00:00.000Z';
    console.log('\n=== Test 1: Checking for existing games ===');
    
    const existingGames = await Game.find({ timeWindow: testTimeWindow });
    console.log(`Found ${existingGames.length} games for timeWindow: ${testTimeWindow}`);
    
    existingGames.forEach((game, index) => {
      console.log(`Game ${index + 1}: ID=${game._id}, Status=${game.status}, Created=${game.createdAt}`);
    });

    // Test 2: Check for duplicate result_declared games
    console.log('\n=== Test 2: Checking for duplicate result_declared games ===');
    
    const resultDeclaredGames = await Game.find({ 
      timeWindow: testTimeWindow, 
      status: 'result_declared' 
    });
    
    console.log(`Found ${resultDeclaredGames.length} result_declared games for timeWindow: ${testTimeWindow}`);
    
    if (resultDeclaredGames.length > 1) {
      console.log('❌ DUPLICATE FOUND: Multiple result_declared games for same timeWindow');
      resultDeclaredGames.forEach((game, index) => {
        console.log(`Duplicate ${index + 1}: ID=${game._id}, Status=${game.status}, Created=${game.createdAt}`);
      });
    } else {
      console.log('✅ No duplicates found');
    }

    // Test 3: Check all games for this timeWindow
    console.log('\n=== Test 3: All games for timeWindow ===');
    
    const allGames = await Game.find({ timeWindow: testTimeWindow }).sort({ createdAt: 1 });
    console.log(`Total games for timeWindow: ${allGames.length}`);
    
    allGames.forEach((game, index) => {
      console.log(`Game ${index + 1}: ID=${game._id}, Status=${game.status}, Created=${game.createdAt.toISOString()}`);
    });

    // Test 4: Check for any games with same timeWindow and result_declared status
    console.log('\n=== Test 4: Checking unique constraint violations ===');
    
    const games = await Game.find({}).sort({ timeWindow: 1, createdAt: 1 });
    const timeWindowStatusMap = new Map();
    
    for (const game of games) {
      const key = `${game.timeWindow}_${game.status}`;
      if (timeWindowStatusMap.has(key)) {
        console.log(`❌ DUPLICATE FOUND: timeWindow=${game.timeWindow}, status=${game.status}`);
        console.log(`   Existing: ${timeWindowStatusMap.get(key)}`);
        console.log(`   Duplicate: ${game._id}`);
      } else {
        timeWindowStatusMap.set(key, game._id);
      }
    }
    
    console.log(`✅ Checked ${games.length} games for unique constraint violations`);

    // Test 5: Check recent games (last 24 hours)
    console.log('\n=== Test 5: Recent games (last 24 hours) ===');
    
    const oneDayAgo = addMinutesIST(getCurrentISTTime(), -1440); // 24 hours ago
    const recentGames = await Game.find({ 
      createdAt: { $gte: oneDayAgo } 
    }).sort({ timeWindow: 1, createdAt: 1 });
    
    console.log(`Found ${recentGames.length} games in the last 24 hours`);
    
    const timeWindowCounts = new Map();
    for (const game of recentGames) {
      const count = timeWindowCounts.get(game.timeWindow) || 0;
      timeWindowCounts.set(game.timeWindow, count + 1);
    }
    
    for (const [timeWindow, count] of timeWindowCounts) {
      if (count > 1) {
        console.log(`⚠️  Multiple games for timeWindow: ${timeWindow} (${count} games)`);
      }
    }

  } catch (error) {
    console.error('Error testing game logic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testGameLogic(); 