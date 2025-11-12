const mongoose = require('mongoose');

async function checkAllDatabases() {
  try {
    console.log('🔍 Checking all databases...\n');
    
    // Connect to MongoDB without specifying database
    await mongoose.connect('mongodb://localhost:27017/');
    
    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    
    console.log('📚 Available databases:');
    dbList.databases.forEach(db => {
      console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // Check each database for games/playwin related collections
    for (const dbInfo of dbList.databases) {
      if (dbInfo.name !== 'admin' && dbInfo.name !== 'local') {
        console.log(`\n🔍 Checking database: ${dbInfo.name}`);
        
        try {
          const db = mongoose.connection.client.db(dbInfo.name);
          const collections = await db.listCollections().toArray();
          
          const relevantCollections = collections.filter(col => 
            col.name.includes('game') || 
            col.name.includes('bid') || 
            col.name.includes('result') || 
            col.name.includes('wallet') ||
            col.name.includes('user')
          );
          
          if (relevantCollections.length > 0) {
            console.log(`  📋 Relevant collections:`);
            relevantCollections.forEach(col => {
              console.log(`    - ${col.name}`);
            });
            
            // Check games collection if it exists
            if (collections.find(col => col.name === 'games')) {
              const gamesCount = await db.collection('games').countDocuments();
              console.log(`    🎮 Games count: ${gamesCount}`);
              
              if (gamesCount > 0) {
                const recentGame = await db.collection('games').findOne({}, { sort: { createdAt: -1 } });
                console.log(`    📅 Most recent game: ${recentGame.createdAt}`);
              }
            }
          } else {
            console.log(`  ❌ No relevant collections found`);
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

checkAllDatabases();
