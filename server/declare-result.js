const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;
const Card = require('./dist/models/card.model').Card;

async function declareResult() {
  try {
    console.log('Manually declaring result for 8:00 AM game...\n');

    const gameId = '68b3b6a7d96bf8e91d9d1ff8';
    const game = await Game.findById(gameId);

    if (!game) {
      console.log('❌ Game not found');
      return;
    }

    console.log('Game found:');
    console.log(`ID: ${game._id}`);
    console.log(`Status: ${game.status}`);
    console.log(`Start: ${new Date(game.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`End: ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    if (game.status === 'result_declared') {
      console.log('✅ Result already declared');
      return;
    }

    // Get active cards for random result
    const activeCards = await Card.find({ isActive: true }).select('card symbol');
    
    if (activeCards.length === 0) {
      console.error('❌ No active cards available');
      return;
    }

    const activeCardNames = activeCards.map(card => `${card.card} ${card.symbol}`);
    console.log(`Using ${activeCardNames.length} active cards for random result`);

    // Select random winner
    const randomIndex = Math.floor(Math.random() * activeCardNames.length);
    const winningCard = activeCardNames[randomIndex];

    console.log(`Selected winning card: ${winningCard}`);

    // Update game with result
    game.status = 'result_declared';
    game.winningCard = winningCard;
    game.resultDeclaredAt = new Date();
    await game.save();

    // Create Result record
    await Result.create({
      game: game._id,
      gameId: game._id?.toString() || '',
      winningCard,
      winningCardType: winningCard.charAt(0),
      winningCardSuit: winningCard.charAt(1) === '♥' ? 'hearts' : 
                      winningCard.charAt(1) === '♦' ? 'diamonds' : 
                      winningCard.charAt(1) === '♣' ? 'clubs' : 
                      winningCard.charAt(1) === '♠' ? 'spades' : 'unknown',
      totalPool: game.totalPool || 0,
      winningCardPool: 0,
      losingCardsPool: 0,
      totalWinners: 0,
      totalWinningAmount: 0,
      adminCommission: 0,
      totalAgentCommission: 0,
      winners: [],
      agentCommissions: [],
      resultDeclaredAt: new Date(),
      gameStartTime: game.startTime,
      gameEndTime: game.gameEndTime,
      biddingEndTime: game.biddingEndTime,
      isRandomResult: false
    });

    console.log('✅ Result declared successfully!');
    console.log(`Winning card: ${winningCard}`);
    console.log(`Game status: ${game.status}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

declareResult();
