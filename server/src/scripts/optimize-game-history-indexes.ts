import { connectDB } from '../config/db';
import { Bid } from '../models/bid.model';
import { Game } from '../models/game.model';

async function optimizeGameHistoryIndexes() {
  try {
    await connectDB();
    
    console.log('🔧 Optimizing database indexes for game history queries...');
    
    // Create indexes for Bid collection
    console.log('📊 Creating Bid collection indexes...');
    
    await Bid.collection.createIndex(
      { user: 1, createdAt: -1 },
      { name: 'user_createdAt_desc' }
    );
    console.log('✅ Created index: user_createdAt_desc');
    
    await Bid.collection.createIndex(
      { game: 1, user: 1 },
      { name: 'game_user' }
    );
    console.log('✅ Created index: game_user');
    
    await Bid.collection.createIndex(
      { user: 1, game: 1, cardName: 1 },
      { name: 'user_game_cardName' }
    );
    console.log('✅ Created index: user_game_cardName');
    
    // Create indexes for Game collection
    console.log('📊 Creating Game collection indexes...');
    
    await Game.collection.createIndex(
      { status: 1, resultDeclaredAt: -1 },
      { name: 'status_resultDeclaredAt_desc' }
    );
    console.log('✅ Created index: status_resultDeclaredAt_desc');
    
    await Game.collection.createIndex(
      { startTime: -1 },
      { name: 'startTime_desc' }
    );
    console.log('✅ Created index: startTime_desc');
    
    // Verify indexes
    console.log('\n🔍 Verifying indexes...');
    
    const bidIndexes = await Bid.collection.indexes();
    const gameIndexes = await Game.collection.indexes();
    
    console.log('📊 Bid collection indexes:');
    bidIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('📊 Game collection indexes:');
    gameIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n✅ Database optimization completed successfully!');
    console.log('🚀 Game history queries should now be much faster.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error optimizing indexes:', error);
    process.exit(1);
  }
}

optimizeGameHistoryIndexes(); 