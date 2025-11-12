const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;

async function testResultTimeDisplay() {
  try {
    console.log('Testing result time display logic...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get today's results
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const results = await Result.find({
      resultDeclaredAt: { $gte: todayStart }
    }).sort({ resultDeclaredAt: -1 }).limit(5);

    console.log(`\n📊 Testing new time display logic:`);
    results.forEach((result, index) => {
      // OLD LOGIC (gameStartTime)
      const gameStartTime = new Date(result.gameStartTime);
      const oldTimeString = gameStartTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // NEW LOGIC (resultDeclaredAt)
      const resultDeclaredTime = new Date(result.resultDeclaredAt);
      const newTimeString = resultDeclaredTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      console.log(`${index + 1}. Game: ${result.winningCard}`);
      console.log(`   Game Start: ${gameStartTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${resultDeclaredTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   OLD API Response: {"time":"${oldTimeString}","result":"${result.winningCard}","timezone":"Asia/Kolkata"}`);
      console.log(`   NEW API Response: {"time":"${newTimeString}","result":"${result.winningCard}","timezone":"Asia/Kolkata"}`);
      console.log('');
    });

    // Test the 8:30 AM result specifically
    const result830am = await Result.findOne({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:00:00.000Z'), // 8:30 AM IST
        $lt: new Date('2025-08-31T03:01:00.000Z')
      }
    });

    if (result830am) {
      console.log('📊 8:30 AM Result Test:');
      console.log(`Game Start: ${new Date(result830am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result830am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      
      const oldTime = new Date(result830am.gameStartTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const newTime = new Date(result830am.resultDeclaredAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`OLD API: {"time":"${oldTime}","result":"${result830am.winningCard}","timezone":"Asia/Kolkata"}`);
      console.log(`NEW API: {"time":"${newTime}","result":"${result830am.winningCard}","timezone":"Asia/Kolkata"}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testResultTimeDisplay();
