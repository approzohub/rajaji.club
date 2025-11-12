import mongoose from 'mongoose';
import { Card } from '../models/card.model';
import { CardService } from '../services/card.service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDisplayOrder() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set in environment');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Test 1: Get all cards sorted by display order
    console.log('\n=== Test 1: Get all cards sorted by display order ===');
    const allCards = await CardService.getAllCards();
    console.log(`Found ${allCards.length} cards:`);
    allCards.forEach(card => {
      console.log(`${card.displayOrder}. ${card.name} (${card.card}${card.symbol})`);
    });

    // Test 2: Get active cards sorted by display order
    console.log('\n=== Test 2: Get active cards sorted by display order ===');
    const activeCards = await CardService.getActiveCards();
    console.log(`Found ${activeCards.length} active cards:`);
    activeCards.forEach(card => {
      console.log(`${card.displayOrder}. ${card.name} (${card.card}${card.symbol})`);
    });

    // Test 3: Get cards by type sorted by display order
    console.log('\n=== Test 3: Get cards by type (J) sorted by display order ===');
    const jackCards = await CardService.getCardsByType('J');
    console.log(`Found ${jackCards.length} Jack cards:`);
    jackCards.forEach(card => {
      console.log(`${card.displayOrder}. ${card.name} (${card.card}${card.symbol})`);
    });

    // Test 4: Get cards by suit sorted by display order
    console.log('\n=== Test 4: Get cards by suit (hearts) sorted by display order ===');
    const heartCards = await CardService.getCardsBySuit('hearts');
    console.log(`Found ${heartCards.length} heart cards:`);
    heartCards.forEach(card => {
      console.log(`${card.displayOrder}. ${card.name} (${card.card}${card.symbol})`);
    });

    console.log('\n=== Display Order Test Completed Successfully ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDisplayOrder();
}

export default testDisplayOrder;
