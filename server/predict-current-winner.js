const mongoose = require('mongoose');
require('dotenv').config();
require('ts-node/register/transpile-only');

const { Game } = require('./src/models/game.model');
const { Bid } = require('./src/models/bid.model');
const { Card } = require('./src/models/card.model');
// Register User model to allow populate('user')
require('./src/models/user.model');

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const now = new Date();
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    }).sort({ startTime: 1 });

    if (!activeGame) {
      console.log('❌ No active game found right now.');
      return;
    }

    console.log('🎮 Active Game:');
    console.log(`- ID: ${activeGame._id}`);
    console.log(`- Status: ${activeGame.status}`);
    console.log(`- Start: ${new Date(activeGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`- Bidding End: ${new Date(activeGame.biddingEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`- Game End: ${new Date(activeGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log('');

    const bids = await Bid.find({ game: activeGame._id }).populate('user', 'fullName email');
    console.log(`💰 Total bids placed: ${bids.length}`);

    if (bids.length === 0) {
      // No bids: show random winner pool from active cards context
      const activeCards = await Card.find({ isActive: true }).select('card symbol');
      console.log('\n⚠️ No bids placed yet. If this persists until result time, a random card will be declared among active cards.');
      console.log(`Active cards: ${activeCards.map(c => `${c.card} ${c.symbol}`).join(', ')}`);
      return;
    }

    // Aggregate pools by cardName
    const pools = new Map();
    for (const bid of bids) {
      const key = bid.cardName;
      const current = pools.get(key) || 0;
      pools.set(key, current + (bid.totalAmount || 0));
    }

    // Sort by pool ascending
    const sorted = Array.from(pools.entries()).sort((a, b) => a[1] - b[1]);
    console.log('\n📊 Pools by card (lowest first):');
    for (const [card, amount] of sorted) {
      console.log(`- ${card}: ₹${amount}`);
    }

    const lowestAmount = sorted[0][1];
    const lowestCards = sorted.filter(([, amt]) => amt === lowestAmount).map(([card]) => card);

    if (lowestCards.length === 1) {
      const winningCard = lowestCards[0];
      console.log(`\n🏆 Predicted winning card (deterministic, lowest pool): ${winningCard}`);
      const winningBids = bids.filter(b => b.cardName === winningCard);
      console.log(`Winning bids: ${winningBids.length}`);
      for (const bid of winningBids) {
        const userName = bid.user?.fullName || bid.user?._id || 'Unknown';
        const payout = (bid.totalAmount || 0) * 10;
        console.log(`- ${userName}: Bid ₹${bid.totalAmount} → Payout ₹${payout}`);
      }
      const totalPayout = winningBids.reduce((sum, b) => sum + (b.totalAmount || 0) * 10, 0);
      console.log(`Total expected payout: ₹${totalPayout}`);
    } else {
      console.log(`\n🤝 Tie detected among lowest pools (₹${lowestAmount}):`);
      lowestCards.forEach(c => console.log(`- ${c}`));
      console.log('A random tie-breaker will select one of these cards at result time.');
      for (const card of lowestCards) {
        const cardBids = bids.filter(b => b.cardName === card);
        console.log(`\nCandidates for ${card}:`);
        for (const bid of cardBids) {
          const userName = bid.user?.fullName || bid.user?._id || 'Unknown';
          const payout = (bid.totalAmount || 0) * 10;
          console.log(`- ${userName}: Bid ₹${bid.totalAmount} → Payout ₹${payout}`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();


