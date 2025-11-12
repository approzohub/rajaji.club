const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;
const Result = require('./dist/models/result.model').Result;
const Bid = require('./dist/models/bid.model').Bid;
const User = require('./dist/models/user.model').User;
const { declareWinner } = require('./dist/utils/game-automation');

async function testSocketUnique() {
  try {
    console.log('🧪 Testing socket events with unique game...\n');

    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = new User({
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'testpassword',
        role: 'user'
      });
      await testUser.save();
      console.log('✅ Test user created');
    }

    // Use a unique timeWindow (11:30 AM IST - far in the future)
    const uniqueTimeWindow = new Date('2025-08-31T06:00:00.000Z'); // 11:30 AM IST
    
    // Create a test game with unique timeWindow
    const testGame = new Game({
      timeWindow: uniqueTimeWindow,
      status: 'waiting_result',
      totalPool: 100,
      startTime: uniqueTimeWindow,
      biddingEndTime: new Date(uniqueTimeWindow.getTime() + 25 * 60 * 1000), // +25 minutes
      gameEndTime: new Date(uniqueTimeWindow.getTime() + 30 * 60 * 1000), // +30 minutes
      isRandomResult: true
    });

    const savedGame = await testGame.save();
    console.log('✅ Test game created:', {
      id: savedGame._id,
      timeWindow: savedGame.timeWindow,
      status: savedGame.status
    });

    // Create test bids
    const testBid = new Bid({
      user: testUser._id,
      game: savedGame._id,
      cardName: 'queen_of_spades', // Q♠ in database format
      cardType: 'Q',
      cardSuit: 'spades',
      cardPrice: 10,
      quantity: 1,
      totalAmount: 10
    });

    await testBid.save();
    console.log('✅ Test bid created for Q♠');

    // Wait a moment for everything to be saved
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

    // Clean up - Delete all test data
    console.log('\n🧹 Cleaning up test data...');
    
    if (createdResult) {
      await Result.deleteOne({ _id: createdResult._id });
      console.log('✅ Test result deleted');
    }
    
    await Bid.deleteOne({ _id: testBid._id });
    console.log('✅ Test bid deleted');
    
    await Game.deleteOne({ _id: savedGame._id });
    console.log('✅ Test game deleted');

    console.log('✅ Test user kept for future tests');
    console.log('\n🎉 Test completed! Check server logs for socket emission messages.');

  } catch (error) {
    console.error('❌ Error testing socket unique flow:', error);
  } finally {
    mongoose.disconnect();
  }
}

testSocketUnique();
