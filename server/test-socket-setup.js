const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

const { getIO } = require('./dist/utils/socket-io');

async function testSocketSetup() {
  try {
    console.log('🔌 Testing Socket.IO setup...\n');

    // Check if socket.io instance is available
    const io = getIO();
    
    if (io) {
      console.log('✅ Socket.IO instance is available');
      console.log('Socket.IO server info:', {
        connected: io.engine.clientsCount,
        namespace: io.name,
        rooms: Array.from(io.sockets.adapter.rooms.keys())
      });
      
      // Test emitting an event
      io.emit('testEvent', { message: 'Socket.IO is working!', timestamp: new Date().toISOString() });
      console.log('✅ Test event emitted successfully');
      
    } else {
      console.log('❌ Socket.IO instance is NULL - not initialized properly');
      console.log('This means real-time events will not work!');
    }

    // Check if the server is running
    console.log('\n🌐 Checking server status...');
    const { exec } = require('child_process');
    
    exec('curl -s http://localhost:4000/api/games/last-result', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Server not responding on port 4000');
      } else {
        console.log('✅ Server is responding on port 4000');
        console.log('Response:', stdout);
      }
    });

  } catch (error) {
    console.error('❌ Error testing socket setup:', error);
  } finally {
    mongoose.disconnect();
  }
}

testSocketSetup();
