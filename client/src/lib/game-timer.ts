import { apiClient } from './api';
import { formatTimeForDisplay } from './timezone';

const DEFAULT_BIDDING_DURATION_MINUTES = parseInt(process.env.NEXT_PUBLIC_BIDDING_DURATION || '9');
const DEFAULT_BREAK_DURATION_MINUTES = parseInt(process.env.NEXT_PUBLIC_BREAK_DURATION || '1');

export interface GameTimerState {
  currentTime: number;
  gameStartTime: string;
  biddingEndTime: string;
  gameEndTime: string;
  resultTime: string;
  isBreak: boolean;
  gameStatus: 'open' | 'waiting_result' | 'result_declared';
  activeGameId?: string | null;
}

export interface GameResult {
  gameId: string;
  winningCard: string;
  resultTime: string;
  totalPool: number;
  status: 'completed' | 'result_declared';
}

class GameTimerService {
  private timerInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private currentState: GameTimerState | null = null;
  private listeners: Set<(state: GameTimerState) => void> = new Set();
  private resultListeners: Set<(result: GameResult) => void> = new Set();
  private isInitialized = false;

  constructor() {
    // Don't initialize immediately - wait for client-side initialization
  }

  private initializeIfNeeded() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    
    // Sync with server every 30 seconds
    this.syncInterval = setInterval(() => {
      this.syncWithServer();
    }, 30000);
  }

  async initialize(): Promise<GameTimerState> {
    this.initializeIfNeeded(); // Initialize on first call
    await this.syncWithServer();
    this.startLocalTimer();
    return this.currentState!;
  }

  private async syncWithServer(): Promise<void> {
    try {
      const response = await apiClient.getGameTimer();
      if (response.data) {
        // Convert IST times to user's local timezone
        this.currentState = {
          ...response.data,
          resultTime: formatTimeForDisplay(response.data.resultTime)
        };
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to sync timer with server:', error);
    }
  }

  private startLocalTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (this.currentState) {
        // Update local timer
        this.currentState.currentTime = Math.max(0, this.currentState.currentTime - 1);
        
        // Check if timer reached zero
        if (this.currentState.currentTime <= 0) {
          this.handleTimerComplete();
        }
        
        this.notifyListeners();
      }
    }, 1000);
  }

  private async handleTimerComplete(): Promise<void> {
    if (!this.currentState) return;

    if (this.currentState.isBreak) {
      // Break finished, start new game cycle
      this.currentState.isBreak = false;
      this.currentState.currentTime = DEFAULT_BIDDING_DURATION_MINUTES * 60;
      this.currentState.gameStatus = 'open';
    } else {
      // Game finished, start break
      this.currentState.isBreak = true;
      this.currentState.currentTime = DEFAULT_BREAK_DURATION_MINUTES * 60;
              this.currentState.gameStatus = 'waiting_result';
      
      // Check for game result
      if (this.currentState.activeGameId) {
        await this.checkGameResult(this.currentState.activeGameId);
      }
    }

    // Sync with server immediately after timer completion
    await this.syncWithServer();
  }

  private async checkGameResult(gameId: string): Promise<void> {
    try {
      const response = await apiClient.getGameResult(gameId);
      if (response.data) {
        this.notifyResultListeners(response.data);
      }
    } catch (error) {
      console.error('Failed to get game result:', error);
    }
  }

  private notifyListeners(): void {
    if (this.currentState) {
      this.listeners.forEach(listener => listener(this.currentState!));
    }
  }

  private notifyResultListeners(result: GameResult): void {
    this.resultListeners.forEach(listener => listener(result));
  }

  subscribe(listener: (state: GameTimerState) => void): () => void {
    this.initializeIfNeeded(); // Initialize on first subscription
    this.listeners.add(listener);
    
    // Immediately notify with current state if available
    if (this.currentState) {
      listener(this.currentState);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeToResults(listener: (result: GameResult) => void): () => void {
    this.initializeIfNeeded(); // Initialize on first subscription
    this.resultListeners.add(listener);
    return () => {
      this.resultListeners.delete(listener);
    };
  }

  getCurrentState(): GameTimerState | null {
    return this.currentState;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `00:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  destroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
    this.resultListeners.clear();
  }
}

export const gameTimerService = new GameTimerService(); 