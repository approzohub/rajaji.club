const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Bid = require('./dist/models/bid.model').Bid;
const Result = require('./dist/models/result.model').Result;
const User = require('./dist/models/user.model').User;
const Wallet = require('./dist/models/wallet.model').Wallet;
const WalletTransaction = require('./dist/models/wallet-transaction.model').WalletTransaction;

async function verifyPayoutFix() {
  try {
    console.log('🔍 Verifying payout fix for 10:00 AM game...\n');

    const gameId = '68b3c8fca88ef023f8699e02';
    const resultId = '68b3cfc8a88ef023f869a498';

    // Get the updated result
    const result = await Result.findById(resultId);
    if (result) {
      console.log('📊 Updated result details:', {
        winningCard: result.winningCard,
        resultDeclaredAt: new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        totalWinners: result.totalWinners,
        totalWinningAmount: result.totalWinningAmount
      });

      if (result.winners && result.winners.length > 0) {
        console.log('\n🏆 Winners:');
        result.winners.forEach((winner, index) => {
          console.log(`  ${index + 1}. ${winner.userName} (${winner.userEmail})`);
          console.log(`     Bid Amount: ₹${winner.bidAmount}`);
          console.log(`     Payout Amount: ₹${winner.payoutAmount}`);
          console.log(`     Card: ${winner.cardName} (${winner.cardType} ${winner.cardSuit})`);
        });
      }
    }

    // Check wallet transactions
    const transactions = await WalletTransaction.find({
      user: { $in: result.winners.map(w => w.userId) }
    }).populate('user', 'fullName email').sort({ createdAt: -1 });

    console.log(`\n💰 Found ${transactions.length} wallet transactions:`);
    transactions.forEach(txn => {
      console.log(`  - User: ${txn.user.fullName}`);
      console.log(`    Type: ${txn.type}, Amount: ₹${txn.amount}`);
      console.log(`    Note: ${txn.note}`);
      console.log(`    Date: ${new Date(txn.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    });

    // Check user wallets
    console.log('\n👥 User wallet balances:');
    for (const winner of result.winners) {
      const wallet = await Wallet.findOne({ user: winner.userId });
      if (wallet) {
        console.log(`  ${winner.userName}: ₹${wallet.balance}`);
      } else {
        console.log(`  ${winner.userName}: No wallet found`);
      }
    }

    // Check if the user's game history will now show a win
    const winningBids = await Bid.find({ 
      game: gameId,
      user: { $in: result.winners.map(w => w.userId) }
    }).populate('user', 'fullName email');

    console.log(`\n🎯 Winning bids for this game:`);
    winningBids.forEach(bid => {
      const isWinningCard = bid.cardName === 'king_of_diamonds';
      console.log(`  - User: ${bid.user.fullName}`);
      console.log(`    Card: ${bid.cardName} (${bid.cardType} ${bid.cardSuit})`);
      console.log(`    Amount: ₹${bid.totalAmount}`);
      console.log(`    Status: ${isWinningCard ? '🏆 WIN' : 'Loss'}`);
    });

    console.log('\n✅ Payout fix verification completed!');

  } catch (error) {
    console.error('❌ Error verifying payout fix:', error);
  } finally {
    mongoose.disconnect();
  }
}

verifyPayoutFix();
