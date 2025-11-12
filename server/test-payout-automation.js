const mongoose = require('mongoose');
require('dotenv').config();
require('ts-node/register/transpile-only');

const { CommissionService } = require('./src/services/commission.service');

// Mock data similar to the real game logs
const mockBids = [
  { userId: '687ae1940e95722bf1bc4244', card: 'king_of_diamonds', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'king_of_hearts', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'king_of_clubs', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'king_of_spades', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'queen_of_clubs', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'queen_of_spades', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'queen_of_hearts', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'queen_of_diamonds', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'jack_of_spades', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'jack_of_clubs', amount: 20 },
  { userId: '687ae1940e95722bf1bc4244', card: 'jack_of_hearts', amount: 10 }, // Winner
  { userId: '687ae1940e95722bf1bc4244', card: 'jack_of_diamonds', amount: 20 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'king_of_diamonds', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'king_of_hearts', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'king_of_clubs', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'king_of_spades', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'queen_of_clubs', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'queen_of_spades', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'queen_of_hearts', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'queen_of_diamonds', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'jack_of_spades', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'jack_of_clubs', amount: 10 },
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'jack_of_hearts', amount: 10 }, // Winner
  { userId: '688e1d5c73ce47ae87d88aa9', card: 'jack_of_diamonds', amount: 10 }
];

// Mock winning bids (from the actual logs)
const mockWinningBids = [
  {
    user: {
      _id: new mongoose.Types.ObjectId('687ae1940e95722bf1bc4244'),
      fullName: 'Agent User'
    },
    cardName: 'jack_of_hearts',
    totalAmount: 10
  },
  {
    user: {
      _id: new mongoose.Types.ObjectId('688e1d5c73ce47ae87d88aa9'),
      fullName: 'roy'
    },
    cardName: 'jack_of_hearts',
    totalAmount: 10
  }
];

function testPayoutLogic() {
  console.log('🧪 TESTING PAYOUT AUTOMATION LOGIC');
  console.log('==================================');
  
  console.log('📋 Mock PayoutBids being passed to CommissionService:');
  mockBids.forEach(pb => {
    console.log(`  User: ${pb.userId}, Card: ${pb.card}, Amount: ₹${pb.amount}`);
  });
  
  console.log('\\n🎯 Testing CommissionService.calculatePayouts...');
  
  // Test the actual CommissionService function
  const payoutResults = CommissionService.calculatePayouts(mockBids);
  
  console.log('\\n🔍 DEBUG - payoutResults content:');
  payoutResults.forEach((result, index) => {
    console.log(`  [${index}] userId: ${result.userId} (type: ${typeof result.userId}), card: ${result.card}, amount: ${result.amount}, winner: ${result.winner}, payout: ${result.payout}`);
  });
  
  // Show only winners for clarity
  const payoutWinners = payoutResults.filter(r => r.winner);
  console.log('\\n🏆 Winners in payoutResults:');
  payoutWinners.forEach((winner, index) => {
    console.log(`  [${index}] userId: ${winner.userId} (type: ${typeof winner.userId}), payout: ₹${winner.payout}`);
  });
  
  console.log('\\n💰 Testing individual winner lookup logic...');
  
  // Test the lookup logic for each winning bid
  for (const bid of mockWinningBids) {
    const user = bid.user;
    console.log(`\\nProcessing winner: ${user.fullName} (${user._id})`);
    
    // This is the exact same logic from the automation
    const userIdString = user._id.toString();
    console.log('🔍 Looking for userId:', userIdString, 'in payoutResults...');
    
    const userPayoutResult = payoutResults?.find(r => {
      const userMatch = r.userId === userIdString || 
                        r.userId === user._id || 
                        r.userId?.toString() === userIdString;
      const isWinner = r.winner === true;
      const match = userMatch && isWinner; // Must match userId AND be a winner
      
      if (userMatch && !isWinner) {
        console.log(`  📝 Found user record but not winner: ${r.card} (winner: ${r.winner})`);
      }
      if (match) {
        console.log('  ✅ WINNING MATCH FOUND:', r);
      }
      return match;
    });
    
    if (!userPayoutResult) {
      console.log('  ❌ NO MATCH - Checking all payoutResults for debugging:');
      payoutResults?.forEach((r, index) => {
        console.log(`    [${index}] ${r.userId} === ${userIdString}? ${r.userId === userIdString}`);
        console.log(`    [${index}] winner: ${r.winner}, payout: ${r.payout}`);
      });
    }
    
    console.log('UserPayoutResult found:', userPayoutResult ? `₹${userPayoutResult.payout}` : 'NOT FOUND');
    
    // Calculate final payout (same logic as automation)
    const payoutAmount = userPayoutResult !== undefined && userPayoutResult !== null
      ? Number(userPayoutResult.payout) || 0
      : (payoutResults ? (bid.totalAmount * 10) : 0);
    
    console.log(`Final payout calculation for ${user.fullName}:`);
    console.log(`- Bid amount: ₹${bid.totalAmount}`);
    console.log(`- Payout amount: ₹${payoutAmount}`);
    console.log(`- Payout source: ${userPayoutResult ? 'NEW SYSTEM' : payoutResults ? 'FALLBACK (bid×10)' : 'ERROR'}`);
  }
  
  console.log('\\n✅ Test completed!');
}

// Run the test
testPayoutLogic();
