const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function deleteProblematicGame() {
  try {
    console.log('Deleting problematic game with isRandomResult: true...\n');

    const gameId = '68b3bbdcb88c2efe1012cd5e';
    const game = await Game.findById(gameId);

    if (!game) {
      console.log('❌ Game not found');
      return;
    }

    console.log('Game found:');
    console.log(`ID: ${game._id}`);
    console.log(`Status: ${game.status}`);
    console.log(`isRandomResult: ${game.isRandomResult}`);
    console.log(`Start: ${new Date(game.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`End: ${new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    if (game.isRandomResult) {
      await Game.findByIdAndDelete(gameId);
      console.log('✅ Deleted problematic game with isRandomResult: true');
      console.log('🎯 The automation system will now create a proper game');
    } else {
      console.log('✅ Game is not problematic (isRandomResult: false)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

deleteProblematicGame();
