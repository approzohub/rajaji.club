const mongoose = require('mongoose');
const { Game } = require('./dist/models/game.model');
const { Bid } = require('./dist/models/bid.model');
const { Result } = require('./dist/models/result.model');
const { Wallet } = require('./dist/models/wallet.model');
const { WalletTransaction } = require('./dist/models/wallet-transaction.model');

mongoose.connect('mongodb+srv://shiv:laGi7nTEvu7ufnWI@rajaji.p1vjtvl.mongodb.net/Rajaji?retryWrites=true&w=majority&appName=Rajaji');

async function fix130PMPayout() {
  try {
    console.log('🔧 Fixing 1:30 PM game payout...');
    
    // Find the 1:30 PM game (K ♠ winner)
    const game = await Game.findOne({ 
      winningCard: 'king_of_spades',
      createdAt: { $gte: new Date('2025-09-01T06:30:00.000Z') } // 12:00 PM IST
    });
    
    if (!game) {
      console.log('❌ 1:30 PM game not found');
      return;
    }

    console.log('🎮 Game:', game._id.toString(), 'Winning:', game.winningCard);

    // Find winning bids for K ♠
    const winningBids = await Bid.find({ 
      game: game._id, 
      cardName: 'king_of_spades' 
    });
    
    if (winningBids.length === 0) {
      console.log('❌ No winning bids found');
      return;
    }

    console.log(`💰 Found ${winningBids.length} winning bids`);

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

      // Check if bonus transaction already exists
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
          console.log(`  ✅ Updated bonus tx for user ${bid.user}: +₹${expectedPayout}`);
        }
      } else {
        // Create new bonus transaction
        await WalletTransaction.create({
          user: bid.user,
          initiator: null,
          initiatorRole: 'system',
          amount: expectedPayout,
          walletType: 'main',
          type: 'bonus',
          note: `Game win payout for card ${game.winningCard} in game ${game._id}`
        });
        wallet.main += expectedPayout;
        await wallet.save();
        console.log(`  ✅ Created bonus tx for user ${bid.user}: +₹${expectedPayout}`);
      }
    }

    // Update Result document
    const result = await Result.findOne({ game: game._id });
    if (result) {
      result.totalWinners = winningBids.length;
      result.totalWinningAmount = totalWinningAmount;
      await result.save();
      console.log('🧾 Result updated:', {
        totalWinners: result.totalWinners,
        totalWinningAmount: result.totalWinningAmount
      });
    }

    console.log('🎉 1:30 PM game payout fix completed.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fix130PMPayout();
