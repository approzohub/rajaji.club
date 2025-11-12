const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function createCorrectGame() {
  try {
    console.log('Creating correct 9:00 AM game...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Delete any existing 9:00 AM games
    const existingGames = await Game.find({
      startTime: {
        $gte: new Date('2025-08-31T03:30:00.000Z'), // 9:00 AM IST
        $lt: new Date('2025-08-31T03:31:00.000Z')
      }
    });

    if (existingGames.length > 0) {
      console.log(`Found ${existingGames.length} existing 9:00 AM games, deleting them...`);
      for (const game of existingGames) {
        await Game.findByIdAndDelete(game._id);
        console.log(`Deleted game: ${game._id} (${game.status})`);
      }
    }

    // Create the correct 9:00 AM game
    const gameStartTime = new Date('2025-08-31T03:30:00.000Z'); // 9:00 AM IST
    const biddingEndTime = new Date(gameStartTime.getTime() + 25 * 60 * 1000); // 25 minutes
    const gameEndTime = new Date(gameStartTime.getTime() + 30 * 60 * 1000); // 30 minutes

    const newGame = await Game.create({
      timeWindow: gameStartTime.toISOString(),
      status: 'open',
      totalPool: 0,
      startTime: gameStartTime,
      biddingEndTime,
      gameEndTime,
      isRandomResult: false // This is the key fix - active games should NOT have isRandomResult: true
    });

    console.log('✅ Created correct 9:00 AM game:');
    console.log(`Game ID: ${newGame._id}`);
    console.log(`Status: ${newGame.status}`);
    console.log(`isRandomResult: ${newGame.isRandomResult}`);
    console.log(`Start: ${newGame.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Bidding End: ${newGame.biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Game End: ${newGame.gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    console.log('\n🎯 Benefits:');
    console.log('1. Game has isRandomResult: false - can accept real bids');
    console.log('2. Game is in open status - bidding is active');
    console.log('3. Admin can declare results when it goes to waiting_result status');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

createCorrectGame();
