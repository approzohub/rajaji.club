const axios = require('axios');

async function testLastResultAPI() {
  try {
    console.log('🧪 Testing /api/games/last-result API...\n');

    const response = await axios.get('http://localhost:3000/api/games/last-result');
    
    console.log('📡 API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n✅ API is working correctly!');
    console.log(`Latest result: ${response.data.time} - ${response.data.result}`);
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testLastResultAPI();
