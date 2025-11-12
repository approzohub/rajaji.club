import { connectDB } from '../config/db';
import { Game } from '../models/game.model';

async function addUniqueIndex() {
  try {
    await connectDB();
    
    console.log('🔧 Adding unique index on timeWindow...');
    
    // Create a unique index on timeWindow to prevent duplicate games
    await Game.collection.createIndex(
      { timeWindow: 1 }, 
      { 
        unique: true,
        name: 'unique_timeWindow'
      }
    );
    
    console.log('✅ Unique index created successfully on timeWindow');
    
    // Test the index
    const indexInfo = await Game.collection.indexes();
    const timeWindowIndex = indexInfo.find(index => index.name === 'unique_timeWindow');
    
    if (timeWindowIndex) {
      console.log('✅ Index verification successful');
    } else {
      console.log('❌ Index verification failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating index:', error);
    process.exit(1);
  }
}

addUniqueIndex(); 