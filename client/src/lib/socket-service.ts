import { io, Socket } from 'socket.io-client';
import { formatTimeForDisplay } from './timezone';

export interface TimerUpdate {
  currentTime: number;
  isBreak: boolean;
  gameStatus: 'open' | 'waiting_result' | 'result_declared';
  activeGameId?: string | null;
  resultTime?: string;
}

export interface GameCreated {
  gameId: string;
  startTime: string;
  biddingEndTime: string;
  gameEndTime: string;
  resultTime: string;
}

export interface StatusChange {
  isBreak: boolean;
  gameStatus: 'open' | 'waiting_result' | 'result_declared';
  currentTime: number;
}

export interface ResultDeclared {
  time: string;
  result: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isInitialized = false;

  private timerListeners: Set<(data: TimerUpdate) => void> = new Set();
  private gameCreatedListeners: Set<(data: GameCreated) => void> = new Set();
  private statusChangeListeners: Set<(data: StatusChange) => void> = new Set();
  private resultDeclaredListeners: Set<(data: ResultDeclared) => void> = new Set();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  constructor() {
    // Don't connect immediately - wait for client-side initialization
  }

  private initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.connect();
  }

  private connect() {
    try {
      const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      // Attempting to connect to Socket.IO server
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        forceNew: true,
        withCredentials: true,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to connect to Socket.IO server:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // Connected to Socket.IO server
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.notifyConnectionListeners(true);
    });

    this.socket.on('disconnect', () => {
      // Disconnected from Socket.IO server
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    this.socket.on('reconnect', () => {
      // Reconnected to Socket.IO server
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionListeners(true);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to Socket.IO server');
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    });

    // Timer events
    this.socket.on('timerUpdate', (data: TimerUpdate) => {
      // Timer update received
      this.notifyTimerListeners(data);
    });

    this.socket.on('gameCreated', (data: GameCreated) => {
      // Game created
      this.notifyGameCreatedListeners(data);
    });

    this.socket.on('statusChange', (data: StatusChange) => {
      // Status change
      this.notifyStatusChangeListeners(data);
    });

    this.socket.on('resultDeclared', (data: ResultDeclared) => {
      console.log('🎉 resultDeclared event received from server:', data);
      // Result declared - convert IST time to user's local timezone
      const localData = {
        ...data,
        time: formatTimeForDisplay(data.time)
      };
      console.log('🎉 Processed resultDeclared data:', localData);
      this.notifyResultDeclaredListeners(localData);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff, max 30s
      
      setTimeout(() => {
        // Attempting to reconnect
        this.connect();
      }, this.reconnectDelay);
    }
  }

  private notifyTimerListeners(data: TimerUpdate) {
    this.timerListeners.forEach(listener => listener(data));
  }

  private notifyGameCreatedListeners(data: GameCreated) {
    this.gameCreatedListeners.forEach(listener => listener(data));
  }

  private notifyStatusChangeListeners(data: StatusChange) {
    this.statusChangeListeners.forEach(listener => listener(data));
  }

  private notifyResultDeclaredListeners(data: ResultDeclared) {
    this.resultDeclaredListeners.forEach(listener => listener(data));
  }

  private notifyConnectionListeners(connected: boolean) {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  // Public methods
  subscribeToTimer(listener: (data: TimerUpdate) => void): () => void {
    this.initialize(); // Initialize on first subscription
    this.timerListeners.add(listener);
    return () => {
      this.timerListeners.delete(listener);
    };
  }

  subscribeToGameCreated(listener: (data: GameCreated) => void): () => void {
    this.initialize(); // Initialize on first subscription
    this.gameCreatedListeners.add(listener);
    return () => {
      this.gameCreatedListeners.delete(listener);
    };
  }

  subscribeToStatusChange(listener: (data: StatusChange) => void): () => void {
    this.initialize(); // Initialize on first subscription
    this.statusChangeListeners.add(listener);
    return () => {
      this.statusChangeListeners.delete(listener);
    };
  }

  subscribeToResultDeclared(listener: (data: ResultDeclared) => void): () => void {
    this.initialize(); // Initialize on first subscription
    this.resultDeclaredListeners.add(listener);
    return () => {
      this.resultDeclaredListeners.delete(listener);
    };
  }

  subscribeToConnection(listener: (connected: boolean) => void): () => void {
    this.initialize(); // Initialize on first subscription
    this.connectionListeners.add(listener);
    // Immediately notify with current connection status
    listener(this.isConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

// Create singleton instance
export const socketService = new SocketService(); 