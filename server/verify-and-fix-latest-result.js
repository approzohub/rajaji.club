const mongoose = require('mongoose');
require('dotenv').config();
require('ts-node/register/transpile-only');

const { Game } = require('./src/models/game.model');
const { Result } = require('./src/models/result.model');
const { Bid } = require('./src/models/bid.model');
const { Wallet } = require('./src/models/wallet.model');
const { WalletTransaction } = require('./src/models/wallet-transaction.model');
require('./src/models/user.model');

function calculateDeterministicPayouts(bids) {
  // bids: [{ userId, card, amount }]
  const cardPools = new Map();
  for (const bid of bids) {
    const current = cardPools.get(bid.card) || 0;
    cardPools.set(bid.card, current + (bid.amount || 0));
  }
  let lowestPool = Infinity;
  const lowestCards = new Set();
  for (const [card, pool] of Array.from(cardPools.entries())) {
    if (pool < lowestPool) {
      lowestPool = pool;
      lowestCards.clear();
      lowestCards.add(card);
    } else if (pool === lowestPool) lowestCards.add(card);
  }
  // If tie, pick first deterministically for calculation; actual winner already declared in DB
  const winningCard = Array.from(lowestCards)[0];
  
  // Calculate total game pool and potential payout
  const totalGamePool = bids.reduce((sum, bid) => sum + (bid.amount || 0), 0);
  const winningBids = bids.filter(bid => bid.card === winningCard);
  const potentialTotalPayout = winningBids.reduce((sum, bid) => sum + ((bid.amount || 0) * 10), 0);
  
  console.log(`💰 Verification Script Pool vs Payout Check:`);
  console.log(`  - Total Game Pool: ₹${totalGamePool}`);
  console.log(`  - Potential Total Payout: ₹${potentialTotalPayout} (${winningBids.length} winners × bid × 10)`);
  
  // SAFETY CHECK: If payout would exceed pool, return no winners
  if (potentialTotalPayout > totalGamePool) {
    console.warn(`⚠️ Verification script: Payout (₹${potentialTotalPayout}) would exceed pool (₹${totalGamePool}). Returning no winners.`);
    return bids.map(b => ({
      userId: b.userId,
      card: b.card,
      amount: b.amount,
      winner: false,
      payout: 0
    }));
  }
  
  return bids.map(b => ({
    userId: b.userId,
    card: b.card,
    amount: b.amount,
    winner: b.card === winningCard,
    payout: b.card === winningCard ? (b.amount || 0) * 10 : 0
  }));
}

async function main() {
  let fixedCount = 0;
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const latestResult = await Result.findOne({}).sort({ createdAt: -1 });
    if (!latestResult) {
      console.log('❌ No results found');
      return;
    }
    const gameId = latestResult.game;
    const game = await Game.findById(gameId);
    console.log(`\n🎮 Latest completed game: ${gameId}`);
    console.log(`- Winning Card (recorded): ${game?.winningCard || latestResult.winningCard}`);
    console.log(`- Declared at: ${new Date(latestResult.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    const bids = await Bid.find({ game: gameId }).populate('user', 'fullName');
    if (bids.length === 0) {
      console.log('ℹ️ No bids in this game. Nothing to fix.');
      return;
    }
    const payoutBids = bids.map(b => ({ userId: b.user?._id?.toString() || b.user?.toString(), card: b.cardName, amount: b.totalAmount }));
    const payouts = calculateDeterministicPayouts(payoutBids);
    const winners = payouts.filter(p => p.winner);
    console.log(`- Winners (expected): ${winners.length}`);

    // Attempt to update any zero-amount bonus transactions and result doc
    for (const w of winners) {
      const userId = w.userId;
      const expectedAmount = w.payout;
      // Find zero-amount bonus transaction for this game and user
      const zeroTxn = await WalletTransaction.findOne({
        user: userId,
        type: 'bonus',
        amount: 0,
        note: { $regex: new RegExp(gameId.toString()) }
      });
      if (zeroTxn) {
        zeroTxn.amount = expectedAmount;
        await zeroTxn.save();
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) wallet = await Wallet.create({ user: userId, main: 0 });
        wallet.main += expectedAmount;
        await wallet.save();
        fixedCount += 1;
      }
    }

    // Update result aggregates if any fixes were applied
    if (fixedCount > 0) {
      latestResult.totalWinners = winners.length;
      latestResult.totalWinningAmount = winners.reduce((sum, r) => sum + r.payout, 0);
      latestResult.winners = bids
        .filter(b => winners.some(w => w.userId === (b.user?._id?.toString() || b.user?.toString())))
        .map(b => ({
          userId: b.user?._id || b.user,
          userName: b.user?.fullName || 'N/A',
          userEmail: 'N/A',
          gameId: gameId?.toString(),
          bidAmount: b.totalAmount,
          payoutAmount: (b.totalAmount || 0) * 10,
          cardName: b.cardName,
          cardType: b.cardType,
          cardSuit: b.cardSuit,
          quantity: b.quantity
        }));
      await latestResult.save();
    }

    console.log(`\n✅ Verification complete. Fixed ${fixedCount} zero-amount transactions.`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();


