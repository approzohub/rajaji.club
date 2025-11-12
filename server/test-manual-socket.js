const { Server } = require('socket.io');
const { createServer } = require('http');
const express = require('express');

// Create a simple test server
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Set up socket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Test endpoint to emit result
app.get('/test-result', (req, res) => {
  const testData = {
    time: "10:30 AM",
    result: "Q ♠"
  };
  
  io.emit('resultDeclared', testData);
  console.log('🎉 Test resultDeclared event emitted:', testData);
  
  res.json({ 
    message: 'Test event emitted', 
    data: testData,
    connectedClients: io.engine.clientsCount
  });
});

// Start server
const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Socket.IO ready`);
  console.log(`Test with: curl http://localhost:${PORT}/test-result`);
});

// Keep server running
process.on('SIGINT', () => {
  console.log('Shutting down test server...');
  httpServer.close();
  process.exit(0);
});
