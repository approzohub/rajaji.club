const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function checkGameStatus() {
  try {
    console.log('Checking current game status...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Find the current active game
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    if (activeGame) {
      console.log('✅ Active game found:');
      console.log(`Game ID: ${activeGame._id}`);
      console.log(`Status: ${activeGame.status}`);
      console.log(`Start Time: ${new Date(activeGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Bidding End: ${new Date(activeGame.biddingEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Game End: ${new Date(activeGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`isRandomResult: ${activeGame.isRandomResult}`);

      // Check if break time is over
      const gameEndTime = new Date(activeGame.gameEndTime);
      const isBreakTimeOver = now > gameEndTime;
      
      console.log(`\nBreak time analysis:`);
      console.log(`Game end time: ${gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Break time over: ${isBreakTimeOver ? 'YES' : 'NO'}`);
      
      if (isBreakTimeOver && activeGame.status === 'waiting_result') {
        console.log('❌ ISSUE: Break time is over but result not declared!');
        console.log('   The game automation should have declared a result by now.');
      }
    } else {
      console.log('❌ No active game found');
    }

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
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkGameStatus();
