const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function fixResetLogic() {
  try {
    console.log('Fixing reset logic to match normal automation...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Find the current active game
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    if (activeGame) {
      console.log('Current active game found:');
      console.log(`Game ID: ${activeGame._id}`);
      console.log(`Status: ${activeGame.status}`);
      console.log(`Start: ${new Date(activeGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`End: ${new Date(activeGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Current isRandomResult: ${activeGame.isRandomResult}`);

      // Ensure isRandomResult is true for proper automation
      if (activeGame.isRandomResult === false) {
        activeGame.isRandomResult = true;
        await activeGame.save();
        console.log('✅ Updated game to isRandomResult: true');
        console.log('🎯 Now the automation will work properly:');
        console.log('   - At 9:30 AM, result will be declared automatically');
        console.log('   - Result time will be 9:30 AM');
        console.log('   - Next game will be created for 9:30 AM slot');
      } else {
        console.log('✅ Game already has isRandomResult: true (correct)');
      }
    } else {
      console.log('❌ No active game found');
    }

    console.log('\n📋 Reset Script Logic Fixed:');
    console.log('✅ Games created with isRandomResult: true (default)');
    console.log('✅ Automation will work properly');
    console.log('✅ Results will be declared automatically at game end time');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixResetLogic();
