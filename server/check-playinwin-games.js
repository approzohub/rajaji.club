const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Result } = require('./dist/models/result.model');
const { Bid } = require('./dist/models/bid.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');

mongoose.connect('mongodb://localhost:27017/playinwin');

async function checkPlayinwinGames() {
  try {
    console.log('🔍 Checking games in playinwin database...\n');
    
    // Find all games
    const games = await Game.find({}).sort({ createdAt: -1 });
    
    console.log(`📅 Found ${games.length} games:\n`);
    
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
    const results = await Result.find({}).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${results.length} results:\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. Result for Game: ${result.game?._id || 'Unknown'}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   Total Winners: ${result.totalWinners}`);
      console.log(`   Total Amount: ₹${result.totalWinningAmount}`);
      console.log(`   Created: ${result.createdAt}`);
      console.log(`   Date: ${result.createdAt.toDateString()}`);
      console.log('');
    });
    
    // Check bids
    const bids = await Bid.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`💰 Found ${bids.length} recent bids:\n`);
    
    bids.forEach((bid, index) => {
      console.log(`${index + 1}. Bid ID: ${bid._id}`);
      console.log(`   User: ${bid.user}`);
      console.log(`   Card: ${bid.cardName}`);
      console.log(`   Amount: ₹${bid.totalAmount}`);
      console.log(`   Game: ${bid.game}`);
      console.log(`   Created: ${bid.createdAt}`);
      console.log(`   Date: ${bid.createdAt.toDateString()}`);
      console.log('');
    });
    
    // Check wallet transactions
    const transactions = await WalletTransaction.find({}).sort({ createdAt: -1 }).limit(10);
    
    console.log(`💳 Found ${transactions.length} recent wallet transactions:\n`);
    
    transactions.forEach((tx, index) => {
      console.log(`${index + 1}. Transaction ID: ${tx._id}`);
      console.log(`   User: ${tx.user}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ₹${tx.amount}`);
      console.log(`   Note: ${tx.note || 'No note'}`);
      console.log(`   Created: ${tx.createdAt}`);
      console.log(`   Date: ${tx.createdAt.toDateString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkPlayinwinGames();
