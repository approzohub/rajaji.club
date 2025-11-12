const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;
const { declareWinner } = require('./dist/utils/game-automation');

async function testSocketWithGame() {
  try {
    console.log('🧪 Testing socket events with a test game...\n');

    // Create a test game
    const testGame = new Game({
      timeWindow: new Date('2025-08-31T05:00:00.000Z'), // 10:30 AM IST
      status: 'waiting_result',
      totalPool: 100,
      startTime: new Date('2025-08-31T05:00:00.000Z'),
      biddingEndTime: new Date('2025-08-31T05:25:00.000Z'),
      gameEndTime: new Date('2025-08-31T05:30:00.000Z'),
      isRandomResult: true
    });

    const savedGame = await testGame.save();
    console.log('✅ Test game created:', {
      id: savedGame._id,
      timeWindow: savedGame.timeWindow,
      status: savedGame.status
    });

    // Wait a moment for the game to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Declare a winner
    const winningCard = 'Q ♠';
    console.log(`\n🎯 Declaring winner: ${winningCard}`);

    const result = await declareWinner(savedGame._id.toString(), winningCard, true);
    
    console.log('\n✅ Result declaration completed:');
    console.log('Winner count:', result.count);
    console.log('Payout per winner:', result.payoutPerWinner);
    console.log('Winner details:', result.winnerDetails);

    // Check if result was created
    const createdResult = await Result.findOne({ game: savedGame._id });
    if (createdResult) {
      console.log('\n📊 Result created:', {
        winningCard: createdResult.winningCard,
        resultDeclaredAt: createdResult.resultDeclaredAt
      });
    }

    // Wait a moment to see if socket events are emitted
    console.log('\n⏳ Waiting 3 seconds to check for socket events...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clean up - Delete the test game and result
    console.log('\n🧹 Cleaning up test data...');
    
    if (createdResult) {
      await Result.deleteOne({ _id: createdResult._id });
      console.log('✅ Test result deleted');
    }
    
    await Game.deleteOne({ _id: savedGame._id });
    console.log('✅ Test game deleted');

    console.log('\n🎉 Test completed! Check server logs for socket emission messages.');

  } catch (error) {
    console.error('❌ Error testing socket with game:', error);
  } finally {
    mongoose.disconnect();
  }
}

testSocketWithGame();
