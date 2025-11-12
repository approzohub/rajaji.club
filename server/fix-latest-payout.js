const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Bid } = require('./dist/models/bid.model');
const { Result } = require('./dist/models/result.model');
const { Wallet } = require('./dist/models/wallet.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');
const { displayToDatabaseFormat } = require('./dist/utils/game-automation');

mongoose.connect('mongodb+srv://shiv:laGi7nTEvu7ufnWI@rajaji.p1vjtvl.mongodb.net/Rajaji?retryWrites=true&w=majority&appName=Rajaji');

async function fixLatestPayout() {
  try {
    console.log('🔧 Fixing latest completed game payout...');
    const game = await Game.findOne({ status: 'result_declared' }).sort({ createdAt: -1 });
    if (!game) {
      console.log('❌ No completed game found');
      return;
    }

    const winningCardDb = game.winningCard.includes('_of_') ? game.winningCard : displayToDatabaseFormat(game.winningCard);
    console.log('🎮 Game:', game._id.toString(), 'Winning:', winningCardDb);

    // Find winning bids
    const winningBids = await Bid.find({ game: game._id, cardName: winningCardDb });
    if (winningBids.length === 0) {
      console.log('❌ No winning bids found');
      return;
    }

    // Calculate total game pool and potential payout
    const allBids = await Bid.find({ game: game._id });
    const totalGamePool = allBids.reduce((sum, bid) => sum + bid.totalAmount, 0);
    const potentialTotalPayout = winningBids.reduce((sum, bid) => sum + (bid.totalAmount * 10), 0);
    
    console.log(`💰 Pool vs Payout Check:`);
    console.log(`  - Total Game Pool: ₹${totalGamePool}`);
    console.log(`  - Potential Total Payout: ₹${potentialTotalPayout} (${winningBids.length} winners × bid × 10)`);
    
    // SAFETY CHECK: If payout would exceed pool, don't process payouts
    if (potentialTotalPayout > totalGamePool) {
      console.warn(`⚠️ Payout (₹${potentialTotalPayout}) would exceed pool (₹${totalGamePool}). Skipping payout fix to protect pool.`);
      return;
    }

    let totalWinningAmount = 0;
    for (const bid of winningBids) {
      const expectedPayout = bid.totalAmount * 10;
      totalWinningAmount += expectedPayout;

      // Ensure wallet exists
      let wallet = await Wallet.findOne({ user: bid.user });
      if (!wallet) wallet = await Wallet.create({ user: bid.user });

      // Find existing bonus tx for this game
      let tx = await WalletTransaction.findOne({
        user: bid.user,
        type: 'bonus',
        note: { $regex: new RegExp(game._id.toString()) }
      });

      if (tx) {
        const delta = expectedPayout - (Number(tx.amount) || 0);
        if (delta !== 0) {
          tx.amount = expectedPayout;
          await tx.save();
          wallet.main += delta;
          await wallet.save();
          console.log(`  ✅ Updated existing bonus tx for user ${bid.user}: +₹${expectedPayout}`);
        } else {
          console.log(`  ℹ️ Bonus tx already correct for user ${bid.user}`);
        }
      } else {
        // Create new bonus tx
        await WalletTransaction.create({
          user: bid.user,
          initiator: null,
          initiatorRole: 'system',
          amount: expectedPayout,
          walletType: 'main',
          type: 'bonus',
          note: `Game win payout for card ${winningCardDb} in game ${game._id}`
        });
        wallet.main += expectedPayout;
        await wallet.save();
        console.log(`  ✅ Created bonus tx for user ${bid.user}: +₹${expectedPayout}`);
      }
    }

    // Update Result document totals
    const result = await Result.findOne({ game: game._id });
    if (result) {
      result.totalWinners = winningBids.length;
      result.totalWinningAmount = totalWinningAmount;
      // winners array may lack details; leave as-is
      await result.save();
      console.log('🧾 Result updated:', {
        totalWinners: result.totalWinners,
        totalWinningAmount: result.totalWinningAmount
      });
    }

    console.log('🎉 Payout fix completed.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixLatestPayout();
