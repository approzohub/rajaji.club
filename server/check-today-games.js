const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Result } = require('./dist/models/result.model');

mongoose.connect('mongodb://localhost:27017/playwin');

async function checkTodayGames() {
  try {
    console.log('🔍 Checking all games from today...\n');
    
    // Find all games from today
    const games = await Game.find({
      createdAt: { $gte: new Date('2025-09-01') }
    }).sort({ createdAt: 1 });
    
    console.log(`📅 Found ${games.length} games today:\n`);
    
    games.forEach((game, index) => {
      console.log(`${index + 1}. Game ID: ${game._id}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Winning Card: ${game.winningCard || 'Not declared'}`);
      console.log(`   Created: ${game.createdAt}`);
      console.log(`   Result Declared: ${game.resultDeclaredAt || 'Not declared'}`);
      console.log('');
    });
    
    // Check results
    const results = await Result.find({
      createdAt: { $gte: new Date('2025-09-01') }
    }).populate('game');
    
    console.log(`📊 Found ${results.length} results today:\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. Result for Game: ${result.game?._id || 'Unknown'}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   Total Winners: ${result.totalWinners}`);
      console.log(`   Total Amount: ₹${result.totalWinningAmount}`);
      console.log(`   Created: ${result.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkTodayGames();
