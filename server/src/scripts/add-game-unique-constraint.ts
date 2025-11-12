import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';

async function addGameUniqueConstraint() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('games');

    // Check if index already exists
    const indexes = await collection.indexes();
    const existingIndex = indexes.find(index => 
      index.key && 
      typeof index.key === 'object' &&
      'timeWindow' in index.key && 
      'status' in index.key
    );

    if (existingIndex) {
      console.log('Unique constraint already exists on timeWindow and status');
      return;
    }

    // Create unique compound index on timeWindow and status
    await collection.createIndex(
      { timeWindow: 1, status: 1 }, 
      { 
        unique: true,
        name: 'unique_timeWindow_status'
      }
    );

    console.log('✅ Successfully added unique constraint on timeWindow and status');
    
    // Verify the index was created
    const newIndexes = await collection.indexes();
    const newIndex = newIndexes.find(index => 
      index.key && 
      typeof index.key === 'object' &&
      'timeWindow' in index.key && 
      'status' in index.key
    );
    
    if (newIndex) {
      console.log('✅ Index verification successful:', newIndex);
    } else {
      console.log('❌ Index verification failed');
    }

  } catch (error) {
    console.error('Error adding unique constraint:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addGameUniqueConstraint(); 