// Set timezone environment variable
process.env.TZ = 'Asia/Kolkata';

const mongoose = require('mongoose');
const { getCurrentISTTime, toIST } = require('./dist/utils/timezone.js');

console.log('=== Database Date Check ===');

async function checkDatabaseDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('Connected to MongoDB');

    // Import models
    const { Game } = require('./dist/models/game.model.js');

    // Get current IST time
    const now = getCurrentISTTime();
    console.log('Current IST time:', now.toString());

    // Find active games
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] }
    }).sort({ startTime: -1 }).limit(5);

    console.log(`\nFound ${activeGames.length} active games:`);

    for (const game of activeGames) {
      console.log(`\nGame ID: ${game._id}`);
      console.log(`Status: ${game.status}`);
      console.log(`Start Time (DB): ${game.startTime}`);
      console.log(`Start Time (IST): ${toIST(game.startTime).toString()}`);
      console.log(`Bidding End Time (DB): ${game.biddingEndTime}`);
      console.log(`Bidding End Time (IST): ${toIST(game.biddingEndTime).toString()}`);
      console.log(`Game End Time (DB): ${game.gameEndTime}`);
      console.log(`Game End Time (IST): ${toIST(game.gameEndTime).toString()}`);

      // Calculate timer
      if (game.status === 'open') {
        const timeUntilBiddingEnd = Math.max(0, toIST(game.biddingEndTime).getTime() - now.getTime());
        const currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
        console.log(`Time until bidding end (seconds): ${currentTimer}`);
      } else {
        const timeUntilGameEnd = Math.max(0, toIST(game.gameEndTime).getTime() - now.getTime());
        const currentTimer = Math.floor(timeUntilGameEnd / 1000);
        console.log(`Time until game end (seconds): ${currentTimer}`);
      }

      // Format result time
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
    console.error('Error checking database dates:', error);
  }
}

checkDatabaseDates();
