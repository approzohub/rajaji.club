// Set timezone environment variable
process.env.TZ = 'Asia/Kolkata';

const mongoose = require('mongoose');
const { getCurrentISTTime, toIST, addMinutesIST } = require('./dist/utils/timezone.js');

console.log('=== Fix Database Games ===');

async function fixDatabaseGames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('Connected to MongoDB');

    // Import models
    const { Game } = require('./dist/models/game.model.js');

    // Get current IST time
    const now = getCurrentISTTime();
    console.log('Current IST time:', now.toString());

    // Find all active games
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] }
    });

    console.log(`\nFound ${activeGames.length} active games to check:`);

    for (const game of activeGames) {
      console.log(`\nChecking Game ID: ${game._id}`);
      console.log(`Status: ${game.status}`);
      console.log(`Original Start Time: ${game.startTime}`);
      console.log(`Original Bidding End Time: ${game.biddingEndTime}`);
      console.log(`Original Game End Time: ${game.gameEndTime}`);

      // Check if the times are in the wrong timezone (UTC instead of IST)
      const startTimeIST = toIST(game.startTime);
      const biddingEndTimeIST = toIST(game.biddingEndTime);
      const gameEndTimeIST = toIST(game.gameEndTime);

      // If the times are more than 5 hours off from IST, they're likely in UTC
      const timeDiff = Math.abs(startTimeIST.getTime() - game.startTime.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff > 4) {
        console.log(`⚠️  Game ${game._id} has wrong timezone dates (${hoursDiff.toFixed(1)} hours difference)`);
        
        // Recalculate the correct times based on the time window
        const timeWindow = new Date(game.timeWindow);
        const correctStartTime = getCurrentISTTime();
        const correctBiddingEndTime = addMinutesIST(correctStartTime, 25); // 25 minutes bidding
        const correctGameEndTime = addMinutesIST(correctStartTime, 30); // 30 minutes total

        // Update the game with correct times
        await Game.findByIdAndUpdate(game._id, {
          startTime: correctStartTime,
          biddingEndTime: correctBiddingEndTime,
          gameEndTime: correctGameEndTime
        });

        console.log(`✅ Fixed Game ${game._id} with correct IST times:`);
        console.log(`   Start Time: ${correctStartTime.toString()}`);
        console.log(`   Bidding End: ${correctBiddingEndTime.toString()}`);
        console.log(`   Game End: ${correctGameEndTime.toString()}`);
      } else {
        console.log(`✅ Game ${game._id} has correct timezone dates`);
      }
    }

    // Now check the timer calculation for the fixed games
    console.log('\n=== Timer Calculation Check ===');
    const updatedGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] }
    }).sort({ startTime: -1 }).limit(3);

    for (const game of updatedGames) {
      console.log(`\nGame ID: ${game._id}`);
      console.log(`Status: ${game.status}`);
      
      if (game.status === 'open') {
        const timeUntilBiddingEnd = Math.max(0, toIST(game.biddingEndTime).getTime() - now.getTime());
        const currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
        console.log(`Time until bidding end (seconds): ${currentTimer}`);
      } else {
        const timeUntilGameEnd = Math.max(0, toIST(game.gameEndTime).getTime() - now.getTime());
        const currentTimer = Math.floor(timeUntilGameEnd / 1000);
        console.log(`Time until game end (seconds): ${currentTimer}`);
      }

      const resultTime = toIST(game.gameEndTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`Result time: ${resultTime}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error fixing database games:', error);
  }
}

fixDatabaseGames();
