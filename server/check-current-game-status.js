const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function checkCurrentGameStatus() {
  try {
    console.log('Checking current game status...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Find the current active game
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    if (activeGame) {
      console.log('✅ Active game found:');
      console.log(`Game ID: ${activeGame._id}`);
      console.log(`Status: ${activeGame.status}`);
      console.log(`Start: ${new Date(activeGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Bidding End: ${new Date(activeGame.biddingEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Game End: ${new Date(activeGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`isRandomResult: ${activeGame.isRandomResult}`);

      // Check what the status should be
      const biddingEndTime = new Date(activeGame.biddingEndTime);
      const gameEndTime = new Date(activeGame.gameEndTime);
      
      console.log('\nStatus Analysis:');
      console.log(`Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Bidding end: ${biddingEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Game end: ${gameEndTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      
      if (now < biddingEndTime) {
        console.log('✅ Status should be: open (bidding phase)');
        console.log(`   Current status: ${activeGame.status}`);
        console.log(`   Status correct: ${activeGame.status === 'open' ? 'YES' : 'NO'}`);
      } else if (now >= biddingEndTime && now < gameEndTime) {
        console.log('✅ Status should be: waiting_result (break phase)');
        console.log(`   Current status: ${activeGame.status}`);
        console.log(`   Status correct: ${activeGame.status === 'waiting_result' ? 'YES' : 'NO'}`);
      } else {
        console.log('❌ Game should be ended and result declared');
        console.log(`   Current status: ${activeGame.status}`);
      }
    } else {
      console.log('❌ No active game found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkCurrentGameStatus();
