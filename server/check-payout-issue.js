const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Bid } = require('./dist/models/bid.model');
const { Result } = require('./dist/models/result.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');

mongoose.connect('mongodb://localhost:27017/Rajaji');

async function checkPayoutIssue() {
  try {
    console.log('🔍 Checking payout issue in Rajaji database...\n');
    
    // Find the game where J ♠ won (around 11:11 AM today)
    const game = await Game.findOne({
      winningCard: { $regex: /J.*♠/ },
      createdAt: { $gte: new Date('2025-09-01') }
    });
    
    if (!game) {
      console.log('❌ No game found with J ♠ as winner');
      
      // Let's check what games exist today
      const todayGames = await Game.find({
        createdAt: { $gte: new Date('2025-09-01') }
      }).sort({ createdAt: 1 });
      
      console.log(`\n📅 Found ${todayGames.length} games today:`);
      todayGames.forEach((g, i) => {
        console.log(`  ${i+1}. ID: ${g._id}, Status: ${g.status}, Winning Card: ${g.winningCard || 'Not declared'}`);
      });
      return;
    }
    
    console.log('🎮 Game found:', {
      id: game._id,
      winningCard: game.winningCard,
      status: game.status,
      resultDeclaredAt: game.resultDeclaredAt
    });
    
    // Check if result exists
    const result = await Result.findOne({ game: game._id });
    console.log('\n📊 Result:', result ? {
      totalWinners: result.totalWinners,
      totalWinningAmount: result.totalWinningAmount,
      winners: result.winners?.length || 0
    } : '❌ No result found');
    
    // Check winning bids
    const winningBids = await Bid.find({ 
      game: game._id, 
      cardName: { $regex: /J.*♠/ }
    }).populate('user');
    
    console.log('\n💰 Winning bids:', winningBids.length);
    winningBids.forEach(bid => {
      console.log(`  - User: ${bid.user?.fullName}, Amount: ₹${bid.totalAmount}`);
    });
    
    // Check wallet transactions
    const userIds = winningBids.map(bid => bid.user._id);
    const transactions = await WalletTransaction.find({
      user: { $in: userIds },
      type: 'bonus',
      note: { $regex: new RegExp(game._id.toString()) }
    });
    
    console.log('\n💳 Wallet transactions:', transactions.length);
    transactions.forEach(tx => {
      console.log(`  - User: ${tx.user}, Amount: +₹${tx.amount}, Note: ${tx.note}`);
    });
    
    // Check if there are any bonus transactions today
    const todayBonusTx = await WalletTransaction.find({
      type: 'bonus',
      createdAt: { $gte: new Date('2025-09-01') }
    });
    
    console.log('\n🎁 All bonus transactions today:', todayBonusTx.length);
    todayBonusTx.forEach(tx => {
      console.log(`  - User: ${tx.user}, Amount: +₹${tx.amount}, Note: ${tx.note}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkPayoutIssue();
