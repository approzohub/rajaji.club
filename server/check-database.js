const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...\n');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/playwin');
    console.log('📡 Connected to database');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📚 Found ${collections.length} collections:`);
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check games collection specifically
    const gamesCollection = mongoose.connection.db.collection('games');
    const gamesCount = await gamesCollection.countDocuments();
    console.log(`\n🎮 Games collection has ${gamesCount} documents`);
    
    if (gamesCount > 0) {
      const recentGames = await gamesCollection.find({}).sort({ createdAt: -1 }).limit(3).toArray();
      console.log('\n📅 Recent games:');
      recentGames.forEach((game, index) => {
        console.log(`  ${index + 1}. ID: ${game._id}`);
        console.log(`     Status: ${game.status}`);
        console.log(`     Created: ${game.createdAt}`);
        console.log(`     Winning Card: ${game.winningCard || 'Not declared'}`);
      });
    }
    
    // Check results collection
    const resultsCollection = mongoose.connection.db.collection('results');
    const resultsCount = await resultsCollection.countDocuments();
    console.log(`\n📊 Results collection has ${resultsCount} documents`);
    
    if (resultsCount > 0) {
      const recentResults = await resultsCollection.find({}).sort({ createdAt: -1 }).limit(3).toArray();
      console.log('\n📈 Recent results:');
      recentResults.forEach((result, index) => {
        console.log(`  ${index + 1}. Game: ${result.game}`);
        console.log(`     Winning Card: ${result.winningCard}`);
        console.log(`     Total Winners: ${result.totalWinners}`);
        console.log(`     Created: ${result.createdAt}`);
      });
    }
    
    // Check bids collection
    const bidsCollection = mongoose.connection.db.collection('bids');
    const bidsCount = await bidsCollection.countDocuments();
    console.log(`\n💰 Bids collection has ${bidsCount} documents`);
    
    if (bidsCount > 0) {
      const recentBids = await bidsCollection.find({}).sort({ createdAt: -1 }).limit(3).toArray();
      console.log('\n🎯 Recent bids:');
      recentBids.forEach((bid, index) => {
        console.log(`  ${index + 1}. User: ${bid.user}`);
        console.log(`     Card: ${bid.cardName}`);
        console.log(`     Amount: ₹${bid.totalAmount}`);
        console.log(`     Created: ${bid.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
