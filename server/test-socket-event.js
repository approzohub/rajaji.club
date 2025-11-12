const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const { declareWinner } = require('./dist/utils/game-automation');
const Game = require('./dist/models/game.model').Game;

async function testSocketEvent() {
  try {
    console.log('🧪 Testing socket event emission...\n');

    // Find a game that needs result declaration
    const game = await Game.findOne({
      status: 'waiting_result'
    });

    if (!game) {
      console.log('❌ No game found with waiting_result status');
      
      // Check for open games
      const openGame = await Game.findOne({
        status: 'open'
      });
      
      if (openGame) {
        console.log('📋 Found open game:', {
          id: openGame._id,
          timeWindow: openGame.timeWindow,
          status: openGame.status,
          startTime: new Date(openGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
          gameEndTime: new Date(openGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
        });
      }
      return;
    }

    console.log('🎮 Found game waiting for result:', {
      id: game._id,
      timeWindow: game.timeWindow,
      status: game.status,
      startTime: new Date(game.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      gameEndTime: new Date(game.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    });

    // Test with a random winning card
    const winningCard = 'Q ♠';
    console.log(`\n🎯 Declaring winner: ${winningCard}`);

    // Call declareWinner function
    const result = await declareWinner(game._id.toString(), winningCard, true);
    
    console.log('\n✅ Result declaration completed:');
    console.log('Winner count:', result.count);
    console.log('Payout per winner:', result.payoutPerWinner);
    console.log('Winner details:', result.winnerDetails);

    console.log('\n🔌 Socket event should have been emitted for real-time updates');
    console.log('Check the server logs for socket emission messages');

  } catch (error) {
    console.error('❌ Error testing socket event:', error);
  } finally {
    mongoose.disconnect();
  }
}

testSocketEvent();
