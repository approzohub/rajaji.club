const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;

async function checkGamesAround10am() {
  try {
    console.log('🔍 Checking games around 10:00 AM...\n');

    // Find games around 10:00 AM (9:30 AM to 10:30 AM IST)
    const games = await Game.find({
      timeWindow: {
        $gte: new Date('2025-08-31T04:00:00.000Z'), // 9:30 AM IST
        $lte: new Date('2025-08-31T05:00:00.000Z')  // 10:30 AM IST
      }
    }).sort({ timeWindow: 1 });

    console.log(`📋 Found ${games.length} games around 10:00 AM:`);
    
    games.forEach((game, index) => {
      console.log(`\n${index + 1}. Game ID: ${game._id}`);
      console.log(`   Time Window: ${new Date(game.timeWindow).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Winning Card: ${game.winningCard || 'N/A'}`);
      console.log(`   Total Pool: ₹${game.totalPool || 0}`);
      console.log(`   Result Declared At: ${game.resultDeclaredAt ? new Date(game.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) : 'N/A'}`);
    });

    // Find results around 10:00 AM
    const results = await Result.find({
      resultDeclaredAt: {
        $gte: new Date('2025-08-31T04:00:00.000Z'), // 9:30 AM IST
        $lte: new Date('2025-08-31T05:00:00.000Z')  // 10:30 AM IST
      }
    }).populate('game').sort({ resultDeclaredAt: 1 });

    console.log(`\n📊 Found ${results.length} results around 10:00 AM:`);
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Result ID: ${result._id}`);
      console.log(`   Game ID: ${result.game?._id || 'N/A'}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   Result Declared At: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Total Winners: ${result.totalWinners}`);
      console.log(`   Total Winning Amount: ₹${result.totalWinningAmount}`);
    });

    // Check for the specific 10:00 AM result mentioned by user
    const result10am = await Result.findOne({
      winningCard: 'K ♦'
    }).populate('game');

    if (result10am) {
      console.log(`\n🎯 Found result with K ♦:`);
      console.log(`   Result ID: ${result10am._id}`);
      console.log(`   Game ID: ${result10am.game?._id || 'N/A'}`);
      console.log(`   Result Declared At: ${new Date(result10am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Total Winners: ${result10am.totalWinners}`);
      console.log(`   Total Winning Amount: ₹${result10am.totalWinningAmount}`);
    } else {
      console.log(`\n❌ No result found with K ♦`);
    }

  } catch (error) {
    console.error('❌ Error checking games around 10:00 AM:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkGamesAround10am();
