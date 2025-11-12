import { connectDB } from '../config/db';
import { Game } from '../models/game.model';

async function updateGameStatuses() {
  try {
    await connectDB();
    
    // Find all games with status 'result' and update them to 'result_declared'
    const result = await Game.updateMany(
      { status: 'result' },
      { $set: { status: 'result_declared' } }
    );
    
    console.log(`Updated ${result.modifiedCount} games from 'result' to 'result_declared'`);
    
    // Count games by status
    const statusCounts = await Game.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Current game status counts:');
    statusCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating game statuses:', error);
    process.exit(1);
  }
}

updateGameStatuses(); 