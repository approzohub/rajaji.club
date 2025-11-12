import mongoose from 'mongoose';
import { Card } from '../models/card.model';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function migrateAddDisplayOrder() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not set in environment');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get all cards and sort them by card and suit
    const cards = await Card.find({}).sort({ card: 1, suit: 1 });
    console.log(`Found ${cards.length} cards to migrate`);

    // Update each card with displayOrder
    let order = 1;
    for (const card of cards) {
      if (!card.displayOrder) {
        card.displayOrder = order++;
        await card.save();
        console.log(`Updated ${card.name} with displayOrder: ${card.displayOrder}`);
      } else {
        console.log(`Card ${card.name} already has displayOrder: ${card.displayOrder}`);
      }
    }

    console.log('Migration completed successfully');
    console.log(`Updated ${order - 1} cards with displayOrder`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAddDisplayOrder();
}

export default migrateAddDisplayOrder;
