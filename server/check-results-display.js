const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;
const Game = require('./dist/models/game.model').Game;

async function checkResultsDisplay() {
  try {
    console.log('Checking results display issue...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get today's results
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayResults = await Result.find({
      resultDeclaredAt: { $gte: todayStart }
    }).sort({ resultDeclaredAt: -1 });

    console.log(`Today's results: ${todayResults.length}`);
    todayResults.forEach((result, index) => {
      console.log(`${index + 1}. Result ID: ${result._id}`);
      console.log(`   Game Start: ${new Date(result.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   isRandomResult: ${result.isRandomResult}`);
    });

    // Check for 9:00 AM result specifically
    const result9am = await Result.findOne({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:30:00.000Z'), // 9:00 AM IST
        $lt: new Date('2025-08-31T03:31:00.000Z')
      }
    });

    if (result9am) {
      console.log('\n✅ 9:00 AM result found:');
      console.log(`Result ID: ${result9am._id}`);
      console.log(`Game Start: ${new Date(result9am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result9am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Winning Card: ${result9am.winningCard}`);
    } else {
      console.log('\n❌ 9:00 AM result not found');
    }

    // Check for 8:30 AM result specifically
    const result830am = await Result.findOne({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:00:00.000Z'), // 8:30 AM IST
        $lt: new Date('2025-08-31T03:01:00.000Z')
      }
    });

    if (result830am) {
      console.log('\n✅ 8:30 AM result found:');
      console.log(`Result ID: ${result830am._id}`);
      console.log(`Game Start: ${new Date(result830am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result830am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Winning Card: ${result830am.winningCard}`);
    } else {
      console.log('\n❌ 8:30 AM result not found');
    }

    // Check the last declared result API logic
    const lastResult = await Result.findOne().sort({ resultDeclaredAt: -1 });
    
    if (lastResult) {
      console.log('\n📊 Last Result API would return:');
      console.log(`Result ID: ${lastResult._id}`);
      console.log(`Game Start: ${new Date(lastResult.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(lastResult.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Winning Card: ${lastResult.winningCard}`);
      
      // Format time for API response
      const timeString = new Date(lastResult.gameStartTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`\nAPI Response would be:`);
      console.log(`{"time":"${timeString}","result":"${lastResult.winningCard}","timezone":"Asia/Kolkata"}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkResultsDisplay();
