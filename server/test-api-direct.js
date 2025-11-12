const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const Result = require('./dist/models/result.model').Result;

async function testAPIDirect() {
  try {
    console.log('🧪 Testing API logic directly...\n');

    // Simulate the exact getLastDeclaredResult logic
    const lastDeclaredResult = await Result.findOne({
      resultDeclaredAt: { $exists: true, $ne: null }
    }).sort({ resultDeclaredAt: -1 });

    if (lastDeclaredResult) {
      const time = new Date(lastDeclaredResult.resultDeclaredAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      console.log('📡 /api/games/last-result API Response:');
      console.log(JSON.stringify({
        time: time,
        result: lastDeclaredResult.winningCard,
        timezone: 'Asia/Kolkata'
      }, null, 2));
      
      console.log('\n✅ This should match what the frontend receives!');
    } else {
      console.log('❌ No results found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testAPIDirect();
