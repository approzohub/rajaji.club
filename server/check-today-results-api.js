const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;

async function checkTodayResultsAPI() {
  try {
    console.log('Checking today-results API logic...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Simulate the today-results API query
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    console.log(`Today start: ${todayStart.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Today end: ${todayEnd.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Query like the today-results API
    const results = await Result.find({
      resultDeclaredAt: {
        $gte: todayStart,
        $lte: now // Only up to current time
      }
    })
    .sort({ resultDeclaredAt: -1 })
    .select('winningCard resultDeclaredAt gameStartTime')
    .limit(100);

    console.log(`\n📊 Today Results API would return ${results.length} results:`);
    results.forEach((result, index) => {
      const gameStartTime = new Date(result.gameStartTime);
      const timeString = gameStartTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      console.log(`${index + 1}. Time: ${timeString}`);
      console.log(`   Game Start: ${gameStartTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Winning Card: ${result.winningCard}`);
      console.log(`   API Response: {"time":"${timeString}","result":"${result.winningCard}","timezone":"Asia/Kolkata"}`);
      console.log('');
    });

    // Check if there are any results with gameStartTime around 9:00 AM
    const resultsAround9am = await Result.find({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:25:00.000Z'), // 8:55 AM IST
        $lte: new Date('2025-08-31T03:35:00.000Z')  // 9:05 AM IST
      }
    });

    console.log(`\n📊 Results around 9:00 AM: ${resultsAround9am.length}`);
    resultsAround9am.forEach((result, index) => {
      console.log(`${index + 1}. Result ID: ${result._id}`);
      console.log(`   Game Start: ${new Date(result.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Winning Card: ${result.winningCard}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkTodayResultsAPI();
