// Set timezone environment variable at the very beginning
process.env.TZ = 'Asia/Kolkata';

import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";
import { initGameAutomation } from "./utils/game-automation";
import { createServer } from "http";
import { Server } from "socket.io";
import { Game } from "./models/game.model";
import { setIO } from "./utils/socket-io";
import { 
  getCurrentISTTime, 
  addMinutesIST, 
  toIST, 
  getCurrentThirtyMinuteSlot, 
  getNextThirtyMinuteSlot,
  getTimeSlotIndex,
  getAllTimeSlotsForDate
} from "./utils/timezone";
// Timer configuration from environment variables
const BIDDING_DURATION = parseInt(process.env.BIDDING_DURATION || '9');
const BREAK_DURATION = parseInt(process.env.BREAK_DURATION || '1');
const GAME_CREATION_INTERVAL = parseInt(process.env.GAME_CREATION_INTERVAL || '10');

// Helper function to get total game duration
function getTotalGameDuration(): number {
  return BIDDING_DURATION + BREAK_DURATION;
}



// Helper function to log timer configuration
function logTimerConfig(): void {
  console.log('🎮 Timer Configuration:');
  console.log(`   Bidding Duration: ${BIDDING_DURATION} minutes`);
  console.log(`   Break Duration: ${BREAK_DURATION} minutes`);
  console.log(`   Game Creation Interval: ${GAME_CREATION_INTERVAL} minutes`);
  console.log(`   Total Game Duration: ${getTotalGameDuration()} minutes`);
}

const PORT = process.env.PORT || 4000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: [
      "*",
      process.env.FRONTEND_URL || "http://localhost:5000",
      process.env.RAJAJI_CLIENT_URL1 || "",
      "https://rajaji-three.vercel.app",
      "https://rajaji.club",
      "https://admin.rajaji.club",
      "http://localhost:3001",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }
});

// Set io instance for game automation
setIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Socket.IO client connected:', socket.id);
  
  socket.on('test_connection', (data) => {
    console.log('🧪 Test connection received from:', socket.id, data);
    socket.emit('test_response', { 
      message: 'Backend received test connection',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Socket.IO client disconnected:', socket.id);
  });
});

// Timer state
let currentTimer = BIDDING_DURATION * 60; // Use environment variable
let isBreak = false;
let activeGameId: string | null = null;
let gameStatus: 'open' | 'waiting_result' | 'result_declared' = 'open';
let resultTime = '';

// Timer interval
let timerInterval: NodeJS.Timeout | null = null;

// Start timer
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(async () => {
    // Recalculate timer from database to ensure accuracy
    const now = getCurrentISTTime();
    
    if (activeGameId) {
      try {
        const activeGame = await Game.findById(activeGameId);
        if (activeGame) {
          if (activeGame.status === 'open') {
            // Calculate time until bidding ends
            const timeUntilBiddingEnd = Math.max(0, toIST(activeGame.biddingEndTime).getTime() - now.getTime());
            currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
            isBreak = false;
            gameStatus = 'open';
            
            // Set result time
            resultTime = toIST(activeGame.gameEndTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          } else if (activeGame.status === 'waiting_result') {
            // Calculate time until game ends
            const timeUntilGameEnd = Math.max(0, toIST(activeGame.gameEndTime).getTime() - now.getTime());
            currentTimer = Math.floor(timeUntilGameEnd / 1000);
            isBreak = true;
            gameStatus = 'waiting_result';
            
            // Set result time
            resultTime = toIST(activeGame.gameEndTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }
        }
      } catch (error) {
        console.error('Error updating timer from database:', error);
      }
    } else {
      // No active game - calculate proper game phases using IST functions
      const nextSlot = getNextThirtyMinuteSlot(now);
      const gameStartTime = addMinutesIST(nextSlot, -GAME_CREATION_INTERVAL); // One full slot before next slot
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      
      if (now < gameStartTime) {
        // Game hasn't started yet - countdown to game start
        const timeUntilGameStart = Math.max(0, toIST(gameStartTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilGameStart / 1000);
        gameStatus = 'open';
        isBreak = false;
      } else if (now < biddingEndTime) {
        // In bidding phase - countdown to bidding end
        const timeUntilBiddingEnd = Math.max(0, toIST(biddingEndTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
        gameStatus = 'open';
        isBreak = false;
      } else {
        // In break phase - countdown to game end
        const timeUntilGameEnd = Math.max(0, toIST(nextSlot).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilGameEnd / 1000);
        gameStatus = 'waiting_result';
        isBreak = true;
      }
      
      // Update result time using IST function
      resultTime = toIST(nextSlot).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    
    // Emit timer update to all clients
    io.emit('timerUpdate', {
      currentTime: currentTimer,
      isBreak,
      gameStatus,
      activeGameId,
      resultTime
    });

    // Check if timer reached zero
    if (currentTimer <= 0) {
      if (isBreak) {
        // Break finished, start new game cycle
        isBreak = false;
        gameStatus = 'open';
        currentTimer = BIDDING_DURATION * 60;
        
        // Game automation will handle creating new games
        // Just update the timer state
        activeGameId = null;
        gameStatus = 'open';
        currentTimer = BIDDING_DURATION * 60;
        
        // Set result time for next game (aligned with slot interval)
        const nextGameEndTime = addMinutesIST(now, getTotalGameDuration());
        resultTime = nextGameEndTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // Game finished, start break
        isBreak = true;
        gameStatus = 'waiting_result';
        currentTimer = BREAK_DURATION * 60;
        
        // Update game status in database
        if (activeGameId) {
          try {
            await Game.findByIdAndUpdate(activeGameId, { status: 'waiting_result' });
          } catch (error) {
            console.error('Failed to update game status:', error);
          }
        }
      }
      
      // Emit status change
      io.emit('statusChange', {
        isBreak,
        gameStatus,
        currentTime: currentTimer
      });
    }
  }, 1000);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current timer state to new client
  socket.emit('timerUpdate', {
    currentTime: currentTimer,
    isBreak,
    gameStatus,
    activeGameId,
    resultTime
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Update active game from database
async function updateActiveGame() {
  try {
    const now = getCurrentISTTime();
    const activeGame = await Game.findOne({
      status: { $in: ['open', 'waiting_result'] },
      startTime: { $lte: now },
      gameEndTime: { $gte: now }
    }).sort({ startTime: -1 });

    // Debug: Log what we found
    console.log('updateActiveGame - Found game:', activeGame ? {
      id: activeGame._id,
      status: activeGame.status,
      startTime: new Date(activeGame.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      biddingEndTime: new Date(activeGame.biddingEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      gameEndTime: new Date(activeGame.gameEndTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    } : 'No game found');

    if (activeGame) {
      activeGameId = activeGame._id?.toString() || null;
      gameStatus = activeGame.status;
      
      // Set result time from game end time
      resultTime = toIST(activeGame.gameEndTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      // Calculate remaining time
      if (activeGame.status === 'open') {
        const timeUntilBiddingEnd = Math.max(0, toIST(activeGame.biddingEndTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
        isBreak = false;
      } else {
        const timeUntilGameEnd = Math.max(0, toIST(activeGame.gameEndTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilGameEnd / 1000);
        isBreak = true;
      }
      
      console.log('Active game updated:', {
        gameId: activeGameId,
        status: gameStatus,
        currentTime: currentTimer,
        isBreak,
        resultTime
      });
    } else {
      // No active game found - calculate proper game phases
      activeGameId = null;
      
      // Calculate current slot and game phases using IST functions
      const currentSlot = getCurrentThirtyMinuteSlot(now);
      const gameStartTime = currentSlot;
      const biddingEndTime = addMinutesIST(gameStartTime, BIDDING_DURATION);
      
      // Get slot information for logging
      const slotIndex = getTimeSlotIndex(now);
      const slotTimeString = toIST(gameStartTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      if (now < gameStartTime) {
        // Game hasn't started yet - countdown to game start
        const timeUntilGameStart = Math.max(0, toIST(gameStartTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilGameStart / 1000);
        gameStatus = 'open';
        isBreak = false;
      } else if (now < biddingEndTime) {
        // In bidding phase - countdown to bidding end
        const timeUntilBiddingEnd = Math.max(0, toIST(biddingEndTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilBiddingEnd / 1000);
        gameStatus = 'open';
        isBreak = false;
      } else {
        // In break phase - countdown to game end
        const gameEndTime = addMinutesIST(gameStartTime, getTotalGameDuration());
        const timeUntilGameEnd = Math.max(0, toIST(gameEndTime).getTime() - now.getTime());
        currentTimer = Math.floor(timeUntilGameEnd / 1000);
        gameStatus = 'waiting_result';
        isBreak = true;
      }
      
      // Set result time for current slot using IST function
      resultTime = toIST(gameStartTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`No active game found, calculating game phases (Slot ${slotIndex}/47 - ${slotTimeString}):`, {
        currentTime: now.toString(),
        gameStartTime: gameStartTime.toString(),
        biddingEndTime: biddingEndTime.toString(),
        gameEndTime: addMinutesIST(gameStartTime, getTotalGameDuration()).toString(),
        currentTimer,
        gameStatus,
        isBreak,
        resultTime
      });
    }
  } catch (error) {
    console.error('Error updating active game:', error);
  }
}

// Initialize timer on server start
async function initializeTimer() {
  try {
    // Update active game
    await updateActiveGame();
    
    // Start timer
    startTimer();
    
    // Update active game every 30 seconds to ensure accuracy
    setInterval(updateActiveGame, 30000);
    
    console.log('Timer initialized:', {
      currentTime: currentTimer,
      isBreak,
      gameStatus,
      activeGameId
    });
  } catch (error) {
    console.error('Failed to initialize timer:', error);
    // Start with default values
    startTimer();
  }
}

connectDB()
  .then(() => {
    initializeTimer();
    
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready`);
      
      // Initialize game automation AFTER server starts to ensure socket.io is available
      initGameAutomation();
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }); // Force reload
