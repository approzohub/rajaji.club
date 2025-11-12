const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;

async function checkLatestResultDiscrepancy() {
  try {
    console.log('🔍 Checking latest result discrepancy...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all results from today, sorted by resultDeclaredAt
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const allResults = await Result.find({
      resultDeclaredAt: { $gte: todayStart }
    }).sort({ resultDeclaredAt: -1 });

    console.log(`\n📊 All Results Today (sorted by resultDeclaredAt):`);
    allResults.forEach((result, index) => {
      const gameStart = new Date(result.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const resultDeclared = new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      
      console.log(`${index + 1}. ${result.winningCard} - Game: ${gameStart} | Declared: ${resultDeclared}`);
    });

    // Check the latest result specifically
    const latestResult = allResults[0];
    if (latestResult) {
      console.log(`\n🏆 LATEST RESULT (should be returned by /api/games/last-result):`);
      console.log(`Card: ${latestResult.winningCard}`);
      console.log(`Game Start: ${new Date(latestResult.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(latestResult.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      
      const timeString = new Date(latestResult.resultDeclaredAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`\n📡 Expected API Response:`);
      console.log(`{"time":"${timeString}","result":"${latestResult.winningCard}","timezone":"Asia/Kolkata"}`);
    }

    // Check for 9:30 AM result specifically
    const result930am = await Result.findOne({
      resultDeclaredAt: {
        $gte: new Date('2025-08-31T04:00:00.000Z'), // 9:30 AM IST
        $lt: new Date('2025-08-31T04:01:00.000Z')
      }
    });

    if (result930am) {
      console.log(`\n🎯 9:30 AM Result Found:`);
      console.log(`Card: ${result930am.winningCard}`);
      console.log(`Game Start: ${new Date(result930am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result930am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    } else {
      console.log(`\n❌ No 9:30 AM result found in database`);
    }

    // Check for 9:00 AM result specifically
    const result900am = await Result.findOne({
      resultDeclaredAt: {
        $gte: new Date('2025-08-31T03:30:00.000Z'), // 9:00 AM IST
        $lt: new Date('2025-08-31T03:31:00.000Z')
      }
    });

    if (result900am) {
      console.log(`\n🎯 9:00 AM Result Found:`);
      console.log(`Card: ${result900am.winningCard}`);
      console.log(`Game Start: ${new Date(result900am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result900am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    }

    // Simulate the getLastDeclaredResult API logic
    console.log(`\n🔧 Simulating /api/games/last-result API logic:`);
    const lastDeclaredResult = await Result.findOne({
      resultDeclaredAt: { $exists: true, $ne: null }
    }).sort({ resultDeclaredAt: -1 });

    if (lastDeclaredResult) {
      const time = new Date(lastDeclaredResult.resultDeclaredAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`API would return: {"time":"${time}","result":"${lastDeclaredResult.winningCard}","timezone":"Asia/Kolkata"}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkLatestResultDiscrepancy();
