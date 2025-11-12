const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;

async function check9amResult() {
  try {
    console.log('Checking 9:00 AM result data...\n');

    const now = new Date();
    console.log(`Current time (IST): ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Check for 9:00 AM result specifically
    const result9am = await Result.findOne({
      gameStartTime: {
        $gte: new Date('2025-08-31T03:30:00.000Z'), // 9:00 AM IST
        $lt: new Date('2025-08-31T03:31:00.000Z')
      }
    });

    if (result9am) {
      console.log('✅ 9:00 AM result found:');
      console.log(`Result ID: ${result9am._id}`);
      console.log(`Game Start: ${new Date(result9am.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(result9am.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Winning Card: ${result9am.winningCard}`);
      console.log(`isRandomResult: ${result9am.isRandomResult}`);
    } else {
      console.log('❌ 9:00 AM result not found');
    }

    // Check what the last-result API would return
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log('\n📊 Last Result API Query:');
    console.log(`Start of day: ${startOfDay.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`Current time: ${today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    const lastResult = await Result.findOne({
      resultDeclaredAt: {
        $gte: startOfDay,
        $lte: today
      }
    })
    .sort({ resultDeclaredAt: -1 })
    .select('winningCard resultDeclaredAt gameStartTime');

    if (lastResult) {
      console.log('\n📊 Last Result API would return:');
      console.log(`Result ID: ${lastResult._id}`);
      console.log(`Game Start: ${new Date(lastResult.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Result Declared: ${new Date(lastResult.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`Winning Card: ${lastResult.winningCard}`);
      
      const timeString = new Date(lastResult.gameStartTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`\nAPI Response would be:`);
      console.log(`{"time":"${timeString}","result":"${lastResult.winningCard}","timezone":"Asia/Kolkata"}`);
    }

    // Check all results sorted by resultDeclaredAt
    const allResults = await Result.find({
      resultDeclaredAt: { $gte: startOfDay }
    }).sort({ resultDeclaredAt: -1 }).limit(5);

    console.log('\n📊 All results sorted by resultDeclaredAt:');
    allResults.forEach((result, index) => {
      console.log(`${index + 1}. Game Start: ${new Date(result.gameStartTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Result Declared: ${new Date(result.resultDeclaredAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Winning Card: ${result.winningCard}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

check9amResult();
