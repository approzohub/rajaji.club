const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;

async function checkAutomationFlow() {
  try {
    console.log('Checking automation flow...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Check what should be the current active slot
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Calculate current 30-minute slot
    let currentSlotHour = currentHour;
    let currentSlotMinute = currentMinute >= 30 ? 30 : 0;
    
    if (currentMinute >= 30) {
      currentSlotMinute = 30;
    } else {
      currentSlotMinute = 0;
    }

    console.log(`Current 30-minute slot: ${currentSlotHour}:${currentSlotMinute.toString().padStart(2, '0')} AM`);

    // Check for games that should have been processed
    const gamesNeedingResults = await Game.find({
      status: 'waiting_result',
      gameEndTime: { $lte: now }
    });

    console.log(`\nGames needing results: ${gamesNeedingResults.length}`);
    gamesNeedingResults.forEach((game, index) => {
      console.log(`${index + 1}. Game ID: ${game._id}`);
      console.log(`   Start: ${new Date(game.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   End: ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Should have been processed at: ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   isRandomResult: ${game.isRandomResult}`);
    });

    // Check for active games
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    console.log(`\nActive games: ${activeGames.length}`);
    activeGames.forEach((game, index) => {
      console.log(`${index + 1}. Game ID: ${game._id}`);
      console.log(`   Start: ${new Date(game.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   End: ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   isRandomResult: ${game.isRandomResult}`);
    });

    // Check recent results
    const recentResults = await Result.find({
      resultDeclaredAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) } // Last 2 hours
    }).sort({ resultDeclaredAt: -1 });

    console.log(`\nRecent results (last 2 hours): ${recentResults.length}`);
    recentResults.forEach((result, index) => {
      console.log(`${index + 1}. Result ID: ${result._id}`);
      console.log(`   Game Start: ${new Date(result.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   isRandomResult: ${result.isRandomResult}`);
    });

    console.log('\n🎯 Expected Flow:');
    console.log('1. Game created at 8:30 AM (isRandomResult: true)');
    console.log('2. At 9:00 AM, result should be declared automatically');
    console.log('3. New game should be created for 9:00 AM slot');
    console.log('4. At 9:30 AM, result should be declared for 9:00 AM game');
    console.log('5. New game should be created for 9:30 AM slot');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAutomationFlow();
