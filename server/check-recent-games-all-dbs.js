const mongoose = require('mongoose');

async function checkRecentGamesAllDBs() {
  try {
    console.log('🔍 Checking all databases for recent games from today...\n');
    
    // Connect to MongoDB without specifying database
    await mongoose.connect('mongodb://localhost:27017/');
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    
    const relevantDBs = ['playinwin', 'playwin', 'sunderstorm', 'Rajaji'];
    
    for (const dbName of relevantDBs) {
      if (dbList.databases.find(db => db.name === dbName)) {
        console.log(`\n🔍 Checking database: ${dbName}`);
        
        try {
          const db = mongoose.connection.client.db(dbName);
          
          // Check games collection
          if (await db.listCollections({ name: 'games' }).hasNext()) {
            const gamesCollection = db.collection('games');
            const todayGames = await gamesCollection.find({
              createdAt: { $gte: new Date('2025-09-01') }
            }).sort({ createdAt: -1 }).toArray();
            
            console.log(`  🎮 Games from today (Sept 1): ${todayGames.length}`);
            
            if (todayGames.length > 0) {
              todayGames.forEach((game, i) => {
                console.log(`    ${i+1}. ID: ${game._id}`);
                console.log(`       Status: ${game.status}`);
                console.log(`       Winning Card: ${game.winningCard || 'Not declared'}`);
                console.log(`       Created: ${game.createdAt}`);
              });
            }
            
            // Check for any recent games (last 7 days)
            const recentGames = await gamesCollection.find({
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }).sort({ createdAt: -1 }).limit(5).toArray();
            
            console.log(`  📅 Recent games (last 7 days): ${recentGames.length}`);
            if (recentGames.length > 0) {
              recentGames.forEach((game, i) => {
                console.log(`    ${i+1}. ID: ${game._id}, Status: ${game.status}, Card: ${game.winningCard || 'Not declared'}, Date: ${game.createdAt.toDateString()}`);
              });
            }
          } else {
            console.log(`  ❌ No games collection found`);
          }
          
          // Check results collection
          if (await db.listCollections({ name: 'results' }).hasNext()) {
            const resultsCollection = db.collection('results');
            const todayResults = await resultsCollection.find({
              createdAt: { $gte: new Date('2025-09-01') }
            }).sort({ createdAt: -1 }).toArray();
            
            console.log(`  📊 Results from today: ${todayResults.length}`);
            if (todayResults.length > 0) {
              todayResults.forEach((result, i) => {
                console.log(`    ${i+1}. Game: ${result.game}, Card: ${result.winningCard}, Winners: ${result.totalWinners}, Amount: ₹${result.totalWinningAmount}`);
              });
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Error accessing database: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkRecentGamesAllDBs();
