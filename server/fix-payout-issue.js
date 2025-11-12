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
const { CommissionService } = require('./dist/services/commission.service');

async function fixPayoutIssue() {
  try {
    console.log('🔧 Fixing payout issue for 10:00 AM game...\n');

    const gameId = '68b3c8fca88ef023f8699e02';
    const resultId = '68b3cfc8a88ef023f869a498';

    // Get the game and result
    const game = await Game.findById(gameId);
    const result = await Result.findById(resultId);

    if (!game || !result) {
      console.log('❌ Game or result not found');
      return;
    }

    console.log('✅ Found game and result:', {
      gameId: game._id,
      winningCard: game.winningCard,
      totalPool: game.totalPool,
      resultId: result._id,
      totalWinners: result.totalWinners,
      totalWinningAmount: result.totalWinningAmount
    });

    // Get winning bids using the correct card conversion
    const { displayToDatabaseFormat } = require('./dist/utils/game-automation');
    const winningCardDB = displayToDatabaseFormat(game.winningCard);
    
    const winningBids = await Bid.find({ 
      game: gameId, 
      cardName: winningCardDB 
    }).populate('user', 'fullName email');

    console.log(`\n🎯 Found ${winningBids.length} winning bids for ${winningCardDB}:`);
    winningBids.forEach(bid => {
      console.log(`  - User: ${bid.user.fullName} (${bid.user.email})`);
      console.log(`    Amount: ₹${bid.totalAmount}, Quantity: ${bid.quantity}`);
    });

    if (winningBids.length === 0) {
      console.log('❌ No winning bids found - cannot process payout');
      return;
    }

    // Calculate payouts using CommissionService
    const payoutCalculation = await CommissionService.calculatePayouts(
      gameId,
      game.winningCard,
      winningBids
    );

    console.log('\n💰 Payout calculation:', {
      totalGamePool: payoutCalculation.totalGamePool,
      winningCardPool: payoutCalculation.winningCardPool,
      adminCommissionFromWinning: payoutCalculation.adminCommissionFromWinning,
      payoutPerWinner: payoutCalculation.payoutPerWinner,
      remainingAmount: payoutCalculation.remainingAmount
    });

    // Process payouts for each winner
    console.log('\n💸 Processing payouts...');
    
    for (const bid of winningBids) {
      const user = bid.user;
      
      // Get or create user wallet
      let wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        wallet = new Wallet({
          user: user._id,
          balance: 0
        });
        await wallet.save();
        console.log(`  ✅ Created wallet for user: ${user.fullName}`);
      }

      // Calculate payout amount
      const payoutAmount = payoutCalculation.payoutPerWinner;
      
      // Update wallet balance
      wallet.balance += payoutAmount;
      await wallet.save();

      // Create wallet transaction
      const transaction = new WalletTransaction({
        user: user._id,
        initiatorRole: 'system',
        amount: payoutAmount,
        walletType: 'main',
        type: 'bonus',
        note: `Winning payout for ${game.winningCard} - Game ${gameId}`
      });
      await transaction.save();

      console.log(`  ✅ Payout processed for ${user.fullName}:`);
      console.log(`     Amount: ₹${payoutAmount}`);
      console.log(`     New balance: ₹${wallet.balance}`);
    }

    // Update the result with correct winner count and amount
    result.totalWinners = winningBids.length;
    result.totalWinningAmount = payoutCalculation.winnerPayout;
    result.winners = winningBids.map(bid => ({
      userId: bid.user._id,
      userName: bid.user.fullName,
      userEmail: bid.user.email,
      bidAmount: bid.totalAmount,
      payoutAmount: payoutCalculation.payoutPerWinner,
      cardName: bid.cardName,
      cardType: bid.cardType,
      cardSuit: bid.cardSuit,
      quantity: bid.quantity
    }));
    await result.save();

    console.log('\n📊 Updated result:', {
      totalWinners: result.totalWinners,
      totalWinningAmount: result.totalWinningAmount
    });

    console.log('\n🎉 Payout fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing payout issue:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixPayoutIssue();
