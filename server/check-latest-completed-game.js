const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Result } = require('./dist/models/result.model');
const { Bid } = require('./dist/models/bid.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');

// Connect to the actual cloud database your server uses
mongoose.connect('mongodb+srv://shiv:laGi7nTEvu7ufnWI@rajaji.p1vjtvl.mongodb.net/Rajaji?retryWrites=true&w=majority&appName=Rajaji');

async function checkLatestCompletedGame() {
  try {
    console.log('🔍 Checking the latest COMPLETED game in detail...\n');
    
    // Find the most recent COMPLETED game (result_declared status)
    const latestCompletedGame = await Game.findOne({ 
      status: 'result_declared' 
    }).sort({ createdAt: -1 });
    
    if (!latestCompletedGame) {
      console.log('❌ No completed games found');
      return;
    }
    
    console.log('🎮 Latest COMPLETED Game Details:');
    console.log('==================================');
    console.log(`ID: ${latestCompletedGame._id}`);
    console.log(`Status: ${latestCompletedGame.status}`);
    console.log(`Winning Card: ${latestCompletedGame.winningCard || 'Not declared'}`);
    console.log(`Created: ${latestCompletedGame.createdAt}`);
    console.log(`Result Declared: ${latestCompletedGame.resultDeclaredAt || 'Not declared'}`);
    console.log(`Start Time: ${latestCompletedGame.startTime}`);
    console.log(`Bidding End Time: ${latestCompletedGame.biddingEndTime}`);
    console.log(`Game End Time: ${latestCompletedGame.gameEndTime}`);
    console.log('');
    
    // Check if there's a result for this game
    const result = await Result.findOne({ game: latestCompletedGame._id });
    
    if (result) {
      console.log('📊 Result Details:');
      console.log('==================');
      console.log(`Total Winners: ${result.totalWinners}`);
      console.log(`Total Winning Amount: ₹${result.totalWinningAmount}`);
      console.log(`Winners Array: ${result.winners?.length || 0} entries`);
      console.log(`Is Random Result: ${result.isRandomResult}`);
      console.log(`Created: ${result.createdAt}`);
      console.log('');
      
      if (result.winners && result.winners.length > 0) {
        console.log('🏆 Winner Details:');
        result.winners.forEach((winner, index) => {
          console.log(`  ${index + 1}. User ID: ${winner.userId}`);
          console.log(`     User Name: ${winner.userName || 'N/A'}`);
          console.log(`     Bid Amount: ₹${winner.bidAmount || 'N/A'}`);
          console.log(`     Payout Amount: ₹${winner.payoutAmount || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('❌ No winners in the result record!');
      }
    } else {
      console.log('❌ No result found for this completed game');
    }
    
    // Check all bids for this game (without populating user)
    const allBids = await Bid.find({ game: latestCompletedGame._id });
    
    console.log(`💰 Bids for this game: ${allBids.length}`);
    console.log('========================');
    
    if (allBids.length > 0) {
      // Group bids by card
      const bidsByCard = {};
      allBids.forEach(bid => {
        const cardKey = bid.cardName;
        if (!bidsByCard[cardKey]) {
          bidsByCard[cardKey] = [];
        }
        bidsByCard[cardKey].push(bid);
      });
      
      // Show bids by card
      Object.keys(bidsByCard).forEach(cardName => {
        const cardBids = bidsByCard[cardName];
        const totalAmount = cardBids.reduce((sum, bid) => sum + bid.totalAmount, 0);
        const isWinningCard = cardName === latestCompletedGame.winningCard;
        
        console.log(`\n🃏 ${cardName}: ${cardBids.length} bids, Total: ₹${totalAmount} ${isWinningCard ? '🏆 WINNER' : ''}`);
        
        cardBids.forEach(bid => {
          console.log(`  - User ID: ${bid.user}`);
          console.log(`    Amount: ₹${bid.totalAmount}, Quantity: ${bid.quantity}`);
        });
      });
      
      // Check if there are winning bids (bids on the winning card)
      if (latestCompletedGame.winningCard) {
        const winningBids = allBids.filter(bid => bid.cardName === latestCompletedGame.winningCard);
        console.log(`\n🎯 Winning bids (${latestCompletedGame.winningCard}): ${winningBids.length}`);
        
        if (winningBids.length > 0) {
          winningBids.forEach((bid, index) => {
            console.log(`  ${index + 1}. User ID: ${bid.user}`);
            console.log(`     Amount: ₹${bid.totalAmount}, Expected Payout: ₹${bid.totalAmount * 10}`);
          });
        } else {
          console.log('  ❌ No bids found on the winning card!');
          console.log('  🔍 This explains why Total Winners = 0!');
        }
      }
    } else {
      console.log('❌ No bids found for this game');
    }
    
    // Check wallet transactions for this game
    const transactions = await WalletTransaction.find({
      note: { $regex: new RegExp(latestCompletedGame._id.toString()) }
    });
    
    console.log(`\n💳 Wallet transactions for this game: ${transactions.length}`);
    console.log('==========================================');
    
    if (transactions.length > 0) {
      transactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. User: ${tx.user}`);
        console.log(`     Type: ${tx.type}`);
        console.log(`     Amount: ₹${tx.amount}`);
        console.log(`     Note: ${tx.note}`);
        console.log(`     Created: ${tx.createdAt}`);
      });
    } else {
      console.log('  ❌ No wallet transactions found for this game');
      console.log('  🔍 This confirms the payout distribution is failing!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkLatestCompletedGame();
