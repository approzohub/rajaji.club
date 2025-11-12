// Set timezone environment variable
process.env.TZ = 'Asia/Kolkata';

const { getCurrentISTTime, toIST, addMinutesIST } = require('./dist/utils/timezone.js');

console.log('=== Timer Calculation Test ===');

const now = getCurrentISTTime();
console.log('Current IST time:', now.toString());

// Simulate game times
const gameStartTime = now;
const biddingEndTime = addMinutesIST(now, 25); // 25 minutes bidding
const gameEndTime = addMinutesIST(now, 30); // 30 minutes total

console.log('\nGame Times:');
console.log('Game Start:', gameStartTime.toString());
console.log('Bidding End:', biddingEndTime.toString());
console.log('Game End:', gameEndTime.toString());

// Calculate timer
const timeUntilBiddingEnd = Math.max(0, toIST(biddingEndTime).getTime() - now.getTime());
const timeUntilGameEnd = Math.max(0, toIST(gameEndTime).getTime() - now.getTime());

console.log('\nTimer Calculations:');
console.log('Time until bidding end (seconds):', Math.floor(timeUntilBiddingEnd / 1000));
console.log('Time until game end (seconds):', Math.floor(timeUntilGameEnd / 1000));

// Format result time
const resultTime = toIST(gameEndTime).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

console.log('Result time:', resultTime);

console.log('\n✅ Timer calculation test complete!');
