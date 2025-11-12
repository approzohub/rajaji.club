const { displayToDatabaseFormat } = require('./dist/utils/game-automation');

function testCardConversion() {
  console.log('🧪 Testing card name conversion...\n');

  const testCases = [
    'Q ♠',
    'K ♥',
    'A ♦',
    'J ♣'
  ];

  testCases.forEach(displayCard => {
    const dbFormat = displayToDatabaseFormat(displayCard);
    console.log(`"${displayCard}" -> "${dbFormat}"`);
  });

  // Test the specific case
  const testCard = 'Q ♠';
  const converted = displayToDatabaseFormat(testCard);
  console.log(`\n🎯 Test case: "${testCard}" -> "${converted}"`);
  
  if (converted === 'queen_of_spades') {
    console.log('✅ Conversion is working correctly!');
  } else {
    console.log('❌ Conversion is not working correctly!');
  }
}

testCardConversion();
