const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;

async function check8amResult() {
  try {
    console.log('Checking 8:30 AM game and result...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Check for 8:30 AM game
    const game8am = await Game.findOne({
      startTime: {
        $gte: new Date('2025-08-31T03:00:00.000Z'), // 8:30 AM IST
        $lt: new Date('2025-08-31T03:01:00.000Z')
      }
    });

    if (game8am) {
      console.log('✅ 8:30 AM game found:');
      console.log(`Game ID: ${game8am._id}`);
      console.log(`Status: ${game8am.status}`);
      console.log(`Start: ${new Date(game8am.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`End: ${new Date(game8am.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`isRandomResult: ${game8am.isRandomResult}`);
      console.log(`Winning Card: ${game8am.winningCard || 'Not declared'}`);
    } else {
      console.log('❌ 8:30 AM game not found');
    }

    // Check for 8:30 AM result
    const result8am = await Result.findOne({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:00:00.000Z'), // 8:30 AM IST
        $lt: new Date('2025-08-31T03:01:00.000Z')
      }
    });

    if (result8am) {
      console.log('\n✅ 8:30 AM result found:');
      console.log(`Result ID: ${result8am._id}`);
      console.log(`Winning Card: ${result8am.winningCard}`);
      console.log(`Result Declared At: ${new Date(result8am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`isRandomResult: ${result8am.isRandomResult}`);
    } else {
      console.log('\n❌ 8:30 AM result not found');
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

check8amResult();
