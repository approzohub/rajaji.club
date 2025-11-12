const moment = require('moment-timezone');

console.log('=== Timezone Debug Test ===');

// Check environment variables
console.log('Environment Variables:');
console.log('TZ:', process.env.TZ);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Check moment.js configuration
console.log('\nMoment.js Configuration:');
console.log('Default timezone:', moment.tz.guess());
console.log('Available timezones:', moment.tz.names().filter(tz => tz.includes('Asia')).slice(0, 5));

// Test different timezone methods
console.log('\nTime Tests:');
console.log('System time:', new Date().toString());
console.log('Moment local:', moment().format('YYYY-MM-DD HH:mm:ss Z'));
console.log('Moment IST:', moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'));
console.log('Moment UTC:', moment().utc().format('YYYY-MM-DD HH:mm:ss Z'));

// Test our timezone functions
try {
  const { getCurrentISTTime, toIST } = require('./dist/utils/timezone.js');
  
  console.log('\nOur Timezone Functions:');
  const now = getCurrentISTTime();
  console.log('getCurrentISTTime():', now.toString());
  console.log('toIST(new Date()):', toIST(new Date()).toString());
  
  // Test date comparison
  const todayDateStr = now.toLocaleDateString('en-CA');
  console.log('Today date string:', todayDateStr);
  console.log('Is 2025-08-31 today?', '2025-08-31' === todayDateStr);
  
} catch (error) {
  console.log('Error loading timezone functions:', error.message);
}

// Test setting timezone explicitly
console.log('\nExplicit Timezone Test:');
moment.tz.setDefault('Asia/Kolkata');
console.log('After setDefault Asia/Kolkata:');
console.log('Moment local:', moment().format('YYYY-MM-DD HH:mm:ss Z'));
console.log('Moment IST:', moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'));
