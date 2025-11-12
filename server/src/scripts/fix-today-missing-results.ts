import * as dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Game } from '../models/game.model';
import { Result } from '../models/result.model';
import { Card } from '../models/card.model';
import { 
  getCurrentISTTime, 
  getCurrentTimeWindowIST, 
  getStartOfDayIST, 
  getEndOfDayIST, 
  addMinutesIST,
  getAllTimeSlotsForDate,
  getTimeSlotIndex
} from '../utils/timezone';

async function fixTodayMissingResults() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const now = getCurrentISTTime();
    
    // Get the start of today in IST
    const startOfToday = getStartOfDayIST(now);
    
    // Get the end of today in IST
    const endOfToday = getEndOfDayIST(now);

    console.log(`🔍 Checking for missing results today: ${startOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} to ${endOfToday.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

    // Get all results from today
    const todayResults = await Result.find({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).sort({ resultDeclaredAt: 1 });

    console.log(`📊 Found ${todayResults.length} existing results today`);

    // Calculate expected result times for today up to current time (past slots only)
    const expectedResultTimes: Date[] = [];
    
    // Get all 48 time slots for today using consistent slot calculation
    const allTimeSlots = getAllTimeSlotsForDate(now);
    
    console.log(`🔍 Time calculation debug:`);
    console.log(`   Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`   Total slots for today: ${allTimeSlots.length}/48`);
    
    // Filter to only include slots that have passed (up to current time)
    for (const slot of allTimeSlots) {
      if (slot <= now) {
        // Add 30 minutes to get the result time (game end time)
        const resultTime = addMinutesIST(slot, 30);
        expectedResultTimes.push(resultTime);
      }
    }

    console.log(`📅 Expected ${expectedResultTimes.length} result times today`);

    // Find missing result times
    const existingResultTimes = todayResults.map(result => result.resultDeclaredAt);
    const missingResultTimes: Date[] = [];

    for (const expectedTime of expectedResultTimes) {
      // Check if result exists within 1 minute tolerance
      const hasResult = existingResultTimes.some(existingTime => {
        const timeDiff = Math.abs(existingTime.getTime() - expectedTime.getTime());
        return timeDiff <= 60000; // 1 minute tolerance
      });

      if (!hasResult) {
        missingResultTimes.push(expectedTime);
      }
    }

    console.log(`⚠️ Found ${missingResultTimes.length} missing result times`);

    if (missingResultTimes.length === 0) {
      console.log(`✅ All results for today are present!`);
      return;
    }

    // Get active cards for random results
    const activeCards = await Card.find({ isActive: true }).select('card symbol');
    
    if (activeCards.length === 0) {
      console.error('❌ No active cards available for random results');
      return;
    }

    const activeCardNames = activeCards.map(card => `${card.card} ${card.symbol}`);
    console.log(`🎴 Using ${activeCardNames.length} active cards for random results`);

    // Create missing results
    let createdCount = 0;
    for (const missingTime of missingResultTimes) {
      try {
        // Select random winner
        const randomIndex = Math.floor(Math.random() * activeCardNames.length);
        const winningCard = activeCardNames[randomIndex];
        
        // Calculate game start time (30 minutes before result time)
        const gameStartTime = addMinutesIST(missingTime, -30);
        
        // Get slot information for logging
        const slotIndex = getTimeSlotIndex(gameStartTime);
        const slotTimeString = gameStartTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        console.log(`🎯 Creating missing result for slot ${slotIndex}/47 (${slotTimeString})`);
        
        // Check if game exists for this time window
        const existingGame = await Game.findOne({ 
          timeWindow: gameStartTime.toISOString() 
        });
        
        let game;
        if (existingGame) {
          // Update existing game
          game = await Game.findByIdAndUpdate(
            existingGame._id,
            {
              status: 'result_declared',
              winningCard,
              resultDeclaredAt: missingTime,
              isRandomResult: true
            },
            { new: true }
          );
          console.log(`✅ Updated existing game ${existingGame._id} for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        } else {
          // Create new game
          const biddingEndTime = addMinutesIST(gameStartTime, 20); // 20 min bidding
          const gameEndTime = missingTime;
          
          game = await Game.create({
            timeWindow: gameStartTime.toISOString(),
            status: 'result_declared',
            totalPool: 0,
            startTime: gameStartTime,
            biddingEndTime,
            gameEndTime,
            winningCard,
            resultDeclaredAt: missingTime,
            isRandomResult: true
          });
          console.log(`✅ Created new game ${game._id} for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
        }

        if (!game) {
          console.error(`❌ Failed to create/update game for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
          continue;
        }

        // Create Result record
        await Result.create({
          game: game._id,
          gameId: game._id?.toString() || '',
          winningCard,
          winningCardType: winningCard.charAt(0),
          winningCardSuit: winningCard.charAt(1) === '♥' ? 'hearts' : 
                          winningCard.charAt(1) === '♦' ? 'diamonds' : 
                          winningCard.charAt(1) === '♣' ? 'clubs' : 
                          winningCard.charAt(1) === '♠' ? 'spades' : 'unknown',
          totalPool: 0,
          winningCardPool: 0,
          losingCardsPool: 0,
          totalWinners: 0,
          totalWinningAmount: 0,
          adminCommission: 0,
          totalAgentCommission: 0,
          winners: [],
          agentCommissions: [],
          resultDeclaredAt: missingTime,
          gameStartTime: game.startTime,
          gameEndTime: game.gameEndTime,
          biddingEndTime: game.biddingEndTime,
          isRandomResult: true
        });

        console.log(`✅ Created result for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}: ${winningCard}`);
        createdCount++;

      } catch (error) {
        console.error(`❌ Error creating result for ${missingTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}:`, error);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total missing results: ${missingResultTimes.length}`);
    console.log(`   Successfully created: ${createdCount}`);
    console.log(`   Failed to create: ${missingResultTimes.length - createdCount}`);

    // Final verification
    const finalResults = await Result.countDocuments({
      resultDeclaredAt: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    });

    console.log(`\n✅ Final verification: ${finalResults} results exist for today`);
    
    // Check if we need to create active game for bidding
    const activeGames = await Game.find({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    });

    if (activeGames.length === 0) {
      console.log(`\n⚠️ No active games found - you may need to run 'npm run create:all-slots' to create all time slots`);
    } else {
      console.log(`\n✅ Active games found: ${activeGames.length}`);
    }

  } catch (error) {
    console.error('❌ Error fixing missing results:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixTodayMissingResults();
