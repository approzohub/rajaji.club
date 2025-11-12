import { connectDB } from '../config/db';
import { Game } from '../models/game.model';
import { getCurrentISTTime } from '../utils/timezone';

async function cleanupMultipleGames() {
  try {
    await connectDB();
    
    console.log('🔍 Checking for multiple open games...');
    
    // Find all open games
    const openGames = await Game.find({ 
      status: 'open' 
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${openGames.length} open games`);
    
    if (openGames.length <= 1) {
      console.log('✅ No cleanup needed - only one or zero open games found');
      return;
    }
    
    // Keep the most recent game, close the others
    const [keepGame, ...gamesToClose] = openGames;
    
    console.log(`📋 Keeping game: ${keepGame._id} (created: ${keepGame.createdAt})`);
    console.log(`🗑️  Closing ${gamesToClose.length} duplicate games...`);
    
    // Close the duplicate games
    for (const game of gamesToClose) {
      game.status = 'result_declared';
      game.resultDeclaredAt = getCurrentISTTime();
      game.isRandomResult = true;
      await game.save();
      console.log(`   Closed game: ${game._id} (created: ${game.createdAt})`);
    }
    
    // Also check for multiple waiting_result games
    const waitingGames = await Game.find({ 
      status: 'waiting_result' 
    }).sort({ createdAt: -1 });
    
    if (waitingGames.length > 1) {
      console.log(`🗑️  Found ${waitingGames.length} waiting_result games, keeping only the most recent...`);
      
      const [keepWaitingGame, ...waitingGamesToClose] = waitingGames;
      
      for (const game of waitingGamesToClose) {
        game.status = 'result_declared';
        game.resultDeclaredAt = getCurrentISTTime();
        game.isRandomResult = true;
        await game.save();
        console.log(`   Closed waiting game: ${game._id} (created: ${game.createdAt})`);
      }
    }
    
    // Show final status
    const finalStatus = await Game.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Final game status counts:');
    finalStatus.forEach(({ _id, count }) => {
      console.log(`   ${_id}: ${count}`);
    });
    
    console.log('\n✅ Cleanup completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupMultipleGames(); 