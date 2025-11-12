const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Game = require('./dist/models/game.model').Game;

async function fixGameSlot() {
  try {
    console.log('Fixing game slot issue...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Delete the wrong 9:00 AM game
    const wrongGame = await Game.findOne({
      startTime: {
        $gte: new Date('2025-08-31T03:30:00.000Z'), // 9:00 AM IST
        $lt: new Date('2025-08-31T03:31:00.000Z')
      }
    });

    if (wrongGame) {
      console.log('Found wrong 9:00 AM game:');
      console.log(`Game ID: ${wrongGame._id}`);
      console.log(`Status: ${wrongGame.status}`);
      console.log(`isRandomResult: ${wrongGame.isRandomResult}`);
      
      await Game.findByIdAndDelete(wrongGame._id);
      console.log('✅ Deleted wrong 9:00 AM game');
    } else {
      console.log('No wrong 9:00 AM game found');
    }

    // Check if 8:30 AM game exists and is in correct status
    const game830am = await Game.findOne({
      startTime: {
        $gte: new Date('2025-08-31T03:00:00.000Z'), // 8:30 AM IST
        $lt: new Date('2025-08-31T03:01:00.000Z')
      }
    });

    if (game830am) {
      console.log('\nFound 8:30 AM game:');
      console.log(`Game ID: ${game830am._id}`);
      console.log(`Status: ${game830am.status}`);
      console.log(`isRandomResult: ${game830am.isRandomResult}`);
      
      // Update to correct status based on current time
      const biddingEndTime = new Date(game830am.biddingEndTime);
      const gameEndTime = new Date(game830am.gameEndTime);
      
      if (now >= biddingEndTime && now < gameEndTime) {
        // Should be in waiting_result status
        if (game830am.status !== 'waiting_result') {
          game830am.status = 'waiting_result';
          game830am.isRandomResult = false; // Allow admin to declare
          await game830am.save();
          console.log('✅ Updated 8:30 AM game to waiting_result status');
        } else {
          console.log('✅ 8:30 AM game already in correct waiting_result status');
        }
      } else if (now >= gameEndTime) {
        // Should be result_declared
        if (game830am.status !== 'result_declared') {
          console.log('❌ 8:30 AM game should be result_declared but is not');
        } else {
          console.log('✅ 8:30 AM game already has result declared');
        }
      }
    } else {
      console.log('❌ 8:30 AM game not found');
    }

    console.log('\n🎯 Next steps:');
    console.log('1. The 8:30 AM game should now be in waiting_result status');
    console.log('2. Admin can declare result from dashboard');
    console.log('3. The automation system will create the next game properly');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixGameSlot();
