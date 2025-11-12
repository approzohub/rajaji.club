// Set timezone environment variable explicitly
process.env.TZ = 'Asia/Kolkata';

const moment = require('moment-timezone');

// Set moment.js default timezone
moment.tz.setDefault('Asia/Kolkata');

console.log('=== Timezone Fix Test ===');

// Check if timezone is set
console.log('Environment TZ:', process.env.TZ);

// Test moment.js
console.log('\nMoment.js Tests:');
console.log('Default timezone:', moment.tz.guess());
console.log('Moment local:', moment().format('YYYY-MM-DD HH:mm:ss Z'));
console.log('Moment IST:', moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss Z'));

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
  
  // Test the old method
  const oldMethod = now.toISOString().split('T')[0];
  console.log('Old method (ISO):', oldMethod);
  console.log('Old method is wrong:', oldMethod !== todayDateStr);
  
} catch (error) {
  console.log('Error loading timezone functions:', error.message);
}

console.log('\n✅ Timezone fix applied!');
