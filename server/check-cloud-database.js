const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Result } = require('./dist/models/result.model');
const { Bid } = require('./dist/models/bid.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');

// Connect to the actual cloud database your server uses
mongoose.connect('mongodb+srv://shiv:laGi7nTEvu7ufnWI@rajaji.p1vjtvl.mongodb.net/Rajaji?retryWrites=true&w=majority&appName=Rajaji');

async function checkCloudDatabase() {
  try {
    console.log('🔍 Checking cloud database for recent games and payout issues...\n');
    
    // Find games from today (September 1st)
    const todayGames = await Game.find({
      createdAt: { $gte: new Date('2025-09-01') }
    }).sort({ createdAt: -1 });
    
    console.log(`📅 Found ${todayGames.length} games from today (Sept 1):\n`);
    
    todayGames.forEach((game, index) => {
      console.log(`${index + 1}. Game ID: ${game._id}`);
      console.log(`   Status: ${game.status}`);
      console.log(`   Winning Card: ${game.winningCard || 'Not declared'}`);
      console.log(`   Created: ${game.createdAt}`);
      console.log(`   Result Declared: ${game.resultDeclaredAt || 'Not declared'}`);
      console.log('');
    });
    
    // Check results from today
    const todayResults = await Result.find({
      createdAt: { $gte: new Date('2025-09-01') }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${todayResults.length} results from today:\n`);
    
    todayResults.forEach((result, index) => {
      console.log(`${index + 1}. Result for Game: ${result.game?._id || 'Unknown'}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   Total Winners: ${result.totalWinners}`);
      console.log(`   Total Amount: ₹${result.totalWinningAmount}`);
      console.log(`   Created: ${result.createdAt}`);
      console.log('');
    });
    
    // Check for the specific game where J ♠ won
    const jSpadeGame = await Game.findOne({
      winningCard: { $regex: /J.*♠/ },
      createdAt: { $gte: new Date('2025-09-01') }
    });
    
    if (jSpadeGame) {
      console.log('🎯 Found the game where J ♠ won!\n');
      console.log('Game details:', {
        id: jSpadeGame._id,
        winningCard: jSpadeGame.winningCard,
        status: jSpadeGame.status,
        resultDeclaredAt: jSpadeGame.resultDeclaredAt
      });
      
      // Check winning bids
      const winningBids = await Bid.find({ 
        game: jSpadeGame._id, 
        cardName: { $regex: /J.*♠/ }
      }).populate('user');
      
      console.log(`\n💰 Winning bids for J ♠: ${winningBids.length}`);
      winningBids.forEach(bid => {
        console.log(`  - User: ${bid.user?.fullName}, Amount: ₹${bid.totalAmount}`);
      });
      
      // Check wallet transactions
      const userIds = winningBids.map(bid => bid.user._id);
      const transactions = await WalletTransaction.find({
        user: { $in: userIds },
        type: 'bonus',
        note: { $regex: new RegExp(jSpadeGame._id.toString()) }
      });
      
      console.log(`\n💳 Wallet transactions for this game: ${transactions.length}`);
      transactions.forEach(tx => {
        console.log(`  - User: ${tx.user}, Amount: +₹${tx.amount}, Note: ${tx.note}`);
      });
      
      // Check if there are any bonus transactions today
      const todayBonusTx = await WalletTransaction.find({
        type: 'bonus',
        createdAt: { $gte: new Date('2025-09-01') }
      });
      
      console.log(`\n🎁 All bonus transactions today: ${todayBonusTx.length}`);
      todayBonusTx.forEach(tx => {
        console.log(`  - User: ${tx.user}, Amount: +₹${tx.amount}, Note: ${tx.note}`);
      });
      
    } else {
      console.log('❌ No game found with J ♠ as winner from today');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkCloudDatabase();
