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

async function checkSpecificGame() {
  try {
    console.log('🔍 Checking specific game with K ♦ result...\n');

    const gameId = '68b3c8fca88ef023f8699e02';
    const resultId = '68b3cfc8a88ef023f869a498';

    // Get the game
    const game = await Game.findById(gameId);
    if (!game) {
      console.log('❌ Game not found');
      return;
    }

    console.log('✅ Game found:', {
      id: game._id,
      timeWindow: new Date(game.timeWindow).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      status: game.status,
      winningCard: game.winningCard,
      totalPool: game.totalPool
    });

    // Get the result
    const result = await Result.findById(resultId);
    if (result) {
      console.log('\n📊 Result details:', {
        winningCard: result.winningCard,
        resultDeclaredAt: new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        totalWinners: result.totalWinners,
        totalWinningAmount: result.totalWinningAmount
      });
    }

    // Get all bids for this game
    const bids = await Bid.find({ game: gameId }).populate('user', 'fullName email');
    console.log(`\n📋 Found ${bids.length} bids for this game`);

    // Group bids by card
    const bidsByCard = {};
    bids.forEach(bid => {
      const cardKey = bid.cardName;
      if (!bidsByCard[cardKey]) {
        bidsByCard[cardKey] = [];
      }
      bidsByCard[cardKey].push(bid);
    });

    console.log('\n🎯 Bids by card:');
    Object.keys(bidsByCard).forEach(cardName => {
      const cardBids = bidsByCard[cardName];
      const totalAmount = cardBids.reduce((sum, bid) => sum + bid.totalAmount, 0);
      const isWinningCard = cardName === 'king_of_diamonds'; // K ♦ in database format
      
      console.log(`  ${cardName}: ${cardBids.length} bids, ₹${totalAmount} ${isWinningCard ? '🏆 WINNER' : ''}`);
      
      if (isWinningCard) {
        console.log(`    Winning bids:`);
        cardBids.forEach(bid => {
          console.log(`      - User: ${bid.user.fullName} (${bid.user.email})`);
          console.log(`        Amount: ₹${bid.totalAmount}, Quantity: ${bid.quantity}`);
        });
      }
    });

    // Test card conversion
    const { displayToDatabaseFormat } = require('./dist/utils/game-automation');
    const winningCardDisplay = 'K ♦';
    const winningCardDB = displayToDatabaseFormat(winningCardDisplay);
    
    console.log(`\n🃏 Card conversion test:`);
    console.log(`  Display: "${winningCardDisplay}" -> Database: "${winningCardDB}"`);
    console.log(`  Expected: "king_of_diamonds"`);
    console.log(`  Match: ${winningCardDB === 'king_of_diamonds' ? '✅' : '❌'}`);

    // Check if bids exist for the winning card
    const winningBids = await Bid.find({ 
      game: gameId, 
      cardName: winningCardDB 
    }).populate('user', 'fullName email');

    console.log(`\n🎯 Winning card bids (${winningCardDB}):`);
    if (winningBids.length > 0) {
      winningBids.forEach(bid => {
        console.log(`  ✅ Found bid: ${bid.user.fullName} - ₹${bid.totalAmount}`);
      });
    } else {
      console.log(`  ❌ No bids found for winning card "${winningCardDB}"`);
      
      // Check what card names exist in the bids
      const existingCardNames = [...new Set(bids.map(bid => bid.cardName))];
      console.log(`  Available card names in bids: ${existingCardNames.join(', ')}`);
    }

    // Check wallet transactions
    const transactions = await WalletTransaction.find({
      gameId: gameId
    }).populate('user', 'fullName email');

    console.log(`\n💰 Found ${transactions.length} wallet transactions for this game`);
    transactions.forEach(txn => {
      console.log(`  - User: ${txn.user.fullName}`);
      console.log(`    Type: ${txn.type}, Amount: ₹${txn.amount}`);
      console.log(`    Description: ${txn.description}`);
    });

  } catch (error) {
    console.error('❌ Error checking specific game:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkSpecificGame();
