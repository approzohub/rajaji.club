const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Result } = require('./dist/models/result.model');

mongoose.connect('mongodb://localhost:27017/playwin');

async function checkAllGames() {
  try {
    console.log('🔍 Checking all games...\n');
    
    // Find all games
    const games = await Game.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📅 Found ${games.length} recent games:\n`);
    
    games.forEach((game, index) => {
      console.log(`${index + 1}. Game ID: ${game._id}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Winning Card: ${game.winningCard || 'Not declared'}`);
      console.log(`   Created: ${game.createdAt}`);
      console.log(`   Date: ${game.createdAt.toDateString()}`);
      console.log(`   Result Declared: ${game.resultDeclaredAt || 'Not declared'}`);
      console.log('');
    });
    
    // Check results
    const results = await Result.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${results.length} recent results:\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. Result for Game: ${result.game?._id || 'Unknown'}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   Total Winners: ${result.totalWinners}`);
      console.log(`   Total Amount: ₹${result.totalWinningAmount}`);
      console.log(`   Created: ${result.createdAt}`);
      console.log(`   Date: ${result.createdAt.toDateString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkAllGames();
