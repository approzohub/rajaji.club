const { displayToDatabaseFormat } = require('./dist/utils/game-automation');

function debugCardConversion() {
  console.log('🔍 Debugging card name conversion...\n');

  const testCard = 'Q ♠';
  
  console.log('Test card:', testCard);
  console.log('Length:', testCard.length);
  console.log('Character codes:');
  for (let i = 0; i < testCard.length; i++) {
    console.log(`  ${i}: '${testCard.charAt(i)}' (code: ${testCard.charCodeAt(i)})`);
  }
  
  console.log('\nTesting conversion:');
  const converted = displayToDatabaseFormat(testCard);
  console.log('Converted:', converted);
  
  // Test individual parts
  const cardType = testCard.charAt(0);
  const cardSuitSymbol = testCard.charAt(2); // Fix: suit symbol is at position 2
  
  console.log('\nIndividual parts:');
  console.log('Card type:', cardType);
  console.log('Card suit symbol:', cardSuitSymbol);
  console.log('Suit symbol code:', cardSuitSymbol.charCodeAt(0));
  
  const suitMap = {
    '♥': 'hearts',
    '♦': 'diamonds',
    '♣': 'clubs',
    '♠': 'spades'
  };
  
  console.log('\nSuit map lookup:');
  console.log('Available keys:', Object.keys(suitMap));
  console.log('Lookup result:', suitMap[cardSuitSymbol]);
  console.log('Is undefined?', suitMap[cardSuitSymbol] === undefined);
}

debugCardConversion();
