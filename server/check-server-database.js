const mongoose = require('mongoose');
require('dotenv').config();

async function checkServerDatabase() {
  try {
    console.log('🔍 Checking server database configuration...\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? 'Set (hidden)' : 'Not set'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
    console.log(`  PORT: ${process.env.PORT || 'Not set'}`);
    
    // Try to connect using the server's MONGODB_URI
    if (process.env.MONGODB_URI) {
      console.log('\n🔌 Attempting to connect to server database...');
      
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to server database successfully!');
        
        // Get database info
        const dbName = mongoose.connection.db.databaseName;
        console.log(`📚 Database name: ${dbName}`);
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📋 Collections: ${collections.length}`);
        collections.forEach(col => {
          console.log(`  - ${col.name}`);
        });
        
        // Check for recent games
        if (collections.find(col => col.name === 'games')) {
          const gamesCollection = mongoose.connection.db.collection('games');
          const todayGames = await gamesCollection.find({
            createdAt: { $gte: new Date('2025-09-01') }
          }).sort({ createdAt: -1 }).toArray();
          
          console.log(`\n🎮 Games from today (Sept 1): ${todayGames.length}`);
          if (todayGames.length > 0) {
            todayGames.forEach((game, i) => {
              console.log(`  ${i+1}. ID: ${game._id}`);
              console.log(`     Status: ${game.status}`);
              console.log(`     Winning Card: ${game.winningCard || 'Not declared'}`);
              console.log(`     Created: ${game.createdAt}`);
            });
          }
          
          // Check for any recent games
          const recentGames = await gamesCollection.find({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }).sort({ createdAt: -1 }).limit(5).toArray();
          
          console.log(`\n📅 Recent games (last 24 hours): ${recentGames.length}`);
          if (recentGames.length > 0) {
            recentGames.forEach((game, i) => {
              console.log(`  ${i+1}. ID: ${game._id}, Status: ${game.status}, Card: ${game.winningCard || 'Not declared'}, Date: ${game.createdAt.toDateString()}`);
            });
          }
        }
        
        // Check for recent results
        if (collections.find(col => col.name === 'results')) {
          const resultsCollection = mongoose.connection.db.collection('results');
          const todayResults = await resultsCollection.find({
            createdAt: { $gte: new Date('2025-09-01') }
          }).sort({ createdAt: -1 }).toArray();
          
          console.log(`\n📊 Results from today: ${todayResults.length}`);
          if (todayResults.length > 0) {
            todayResults.forEach((result, i) => {
              console.log(`  ${i+1}. Game: ${result.game}, Card: ${result.winningCard}, Winners: ${result.totalWinners}, Amount: ₹${result.totalWinningAmount}`);
            });
          }
        }
        
        // Check for recent wallet transactions
        if (collections.find(col => col.name === 'wallettransactions')) {
          const txCollection = mongoose.connection.db.collection('wallettransactions');
          const todayTx = await txCollection.find({
            createdAt: { $gte: new Date('2025-09-01') },
            type: 'bonus'
          }).sort({ createdAt: -1 }).toArray();
          
          console.log(`\n💳 Bonus transactions from today: ${todayTx.length}`);
          if (todayTx.length > 0) {
            todayTx.forEach((tx, i) => {
              console.log(`  ${i+1}. User: ${tx.user}, Amount: +₹${tx.amount}, Note: ${tx.note}`);
            });
          }
        }
        
      } catch (error) {
        console.log(`❌ Failed to connect to server database: ${error.message}`);
      }
    } else {
      console.log('❌ MONGODB_URI not found in environment variables');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

checkServerDatabase();
