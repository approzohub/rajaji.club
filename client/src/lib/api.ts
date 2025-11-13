import { safeLocalStorage } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

interface LoginRequest {
  identifier: string;
  password: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gameId: string;
  role: string;
  status?: 'active' | 'disabled' | 'banned';
}

interface LoginResponse {
  token: string;
  user: User;
}

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

interface GameTimerResponse {
  currentTime: number;
  gameStartTime: string;
  biddingEndTime: string;
  gameEndTime: string;
  resultTime: string;
  isBreak: boolean;
  gameStatus: 'open' | 'waiting_result' | 'result_declared';
  activeGameId?: string | null;
}

interface GameResultResponse {
  gameId: string;
  winningCard: string;
  resultTime: string;
  totalPool: number;
  status: 'result_declared';
}

interface Card {
  _id: string;
  name: string;
  card: string; // J, Q, K, A, 10
  symbol: string; // ♣, ♠, ♥, ♦
  suit: string; // clubs, spades, hearts, diamonds
  basePrice: number;
  currentPrice: number;
  isActive: boolean;
  totalBids: number;
  totalAmount: number;
  lastPriceUpdate: string;
  updatedBy?: string;
}

export interface Withdrawal {
  _id: string;
  amount: number;
  walletType: 'main'; // Only main wallet withdrawals allowed
  status: 'pending' | 'rejected' | 'completed';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  _id: string;
  name: string;
  upiId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    const storage = safeLocalStorage();
    this.token = storage ? storage.getItem('authToken') : null;
  }

  // Get token from localStorage
  private getStoredToken(): string | null {
    const storage = safeLocalStorage();
    return storage ? storage.getItem('authToken') : null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Always get the latest token from localStorage for each request
    const currentToken = this.token || this.getStoredToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (currentToken && !options.skipAuth) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // For authenticated requests only (not skipAuth), convert 401 to session-expired UX
        if (response.status === 401 && !options.skipAuth) {
          this.setToken(null);
          return {
            error: 'Session expired. Please login again.',
          };
        }
        return {
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  setToken(token: string | null) {
    this.token = token;
    const storage = safeLocalStorage();
    if (storage) {
      if (token) {
        storage.setItem('authToken', token);
      } else {
        storage.removeItem('authToken');
      }
    }
  }

  // Auth APIs
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/user/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    this.setToken(null);
    return response;
  }

  async changePassword(passwords: ChangePasswordRequest): Promise<ApiResponse> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  }

  async updatePassword(newPassword: string): Promise<ApiResponse> {
    return this.request('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async validateToken(): Promise<ApiResponse<{ valid: boolean; user: User }>> {
    return this.request('/auth/user/validate');
  }

  // Game APIs
  async getGameTimer(): Promise<ApiResponse<GameTimerResponse>> {
    return this.request('/games/timer', { skipAuth: true });
  }

  async getGameResult(gameId: string): Promise<ApiResponse<GameResultResponse>> {
    return this.request(`/games/${gameId}/result`);
  }

  async getActiveGame(): Promise<ApiResponse<GameTimerResponse>> {
    return this.request('/games/active', { skipAuth: true });
  }

  // Cards API
  async getCards(): Promise<ApiResponse<Card[]>> {
    return this.request('/games/cards');
  }

  // Today's Results API
  async getTodayResults(): Promise<ApiResponse<Array<{ time: string; result: string }>>> {
    return this.request('/games/today-results', { skipAuth: true });
  }

  // Last Declared Result API
  async getLastDeclaredResult(): Promise<ApiResponse<{ time: string; result: string }>> {
    return this.request('/games/last-result', { skipAuth: true });
  }

  // Results by Date Range API
  async getResultsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<Array<{ time: string; result: string; date: string }>>> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    return this.request(`/games/results-by-date-range?${params.toString()}`, { skipAuth: true });
  }

  async getUserGameHistory(page?: number, limit?: number): Promise<ApiResponse<{
    history: Array<{
      date: string;
      bid: {
        cardName: string;
        quantity: number;
        totalAmount: number;
      };
      result: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalGames: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/games/history${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getGameResults(page?: number, limit?: number): Promise<ApiResponse<{
    results: Array<{
      gameId: string;
      winningCard: string;
      resultTime: string;
      totalPool: number;
      status: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/games/results${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Results Chart API - New endpoint for results page
  async getResultsChart(page?: number, limit?: number): Promise<ApiResponse<{
    results: Array<{
      time: string;
      date: string;
      result: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/games/results-chart${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint, { skipAuth: true });
  }

  // Bid APIs
  async placeBid(bidData: {
    gameId: string;
    bids: Array<{
      cardId: string;
      quantity: number;
    }>;
  }): Promise<ApiResponse> {
    return this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(bidData),
    });
  }

  async getUserBids(gameId?: string): Promise<ApiResponse<unknown[]>> {
    const endpoint = gameId ? `/bids?gameId=${gameId}` : '/bids';
    return this.request(endpoint);
  }

  async getOngoingBids(): Promise<ApiResponse<unknown[]>> {
    return this.request('/bids/ongoing');
  }

  async getOpenGameBids(): Promise<ApiResponse<Array<{
    _id: string;
    cardName: string;
    cardType: string;
    cardSuit: string;
    quantity: number;
    totalAmount: number;
    cardPrice: number;
    createdAt: string;
    game?: {
      _id: string;
      status: string;
    } | null;
  }>>> {
    return this.request('/bids/open-game');
  }

  // Withdrawal APIs
  async getWithdrawals(): Promise<ApiResponse<Withdrawal[]>> {
    return this.request('/wallet/withdrawals');
  }

  async requestWithdrawal(data: {
    amount: number;
    walletType: 'main'; // Only main wallet withdrawals allowed
    note?: string;
    paymentMethodId?: string;
  }): Promise<ApiResponse> {
    return this.request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Payment History API
  async getPaymentHistory(page?: number, limit?: number): Promise<ApiResponse<{
    transactions: Array<{
      _id: string;
      type: 'wallet_transaction' | 'bid' | 'withdrawal';
      amount: number;
      transactionType: string;
      walletType: 'main' | 'bonus';
      paymentMode: 'UPI' | 'Wallet';
      note?: string;
      status?: string;
      processedBy?: {
        _id: string;
        fullName: string;
        email: string;
        gameId: string;
        role: string;
      };
      createdAt: string;
      updatedAt?: string;
      gameId?: string;
      gameStatus?: string;
      cardName?: string;
      cardType?: string;
      cardSuit?: string;
      quantity?: number;
      cardPrice?: number;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalTransactions: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/wallet/payment-history${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Wallet APIs
  async getMyWallet(): Promise<ApiResponse<{ main: number; bonus: number; user: User }>> {
    return this.request('/wallet/my-wallet');
  }

  async getWalletTransactions(): Promise<ApiResponse<unknown[]>> {
    return this.request('/wallet/transactions');
  }

  // Payment Methods APIs
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return this.request('/payments');
  }

  async addPaymentMethod(data: {
    name: string;
    upiId: string;
    isDefault?: boolean;
  }): Promise<ApiResponse<PaymentMethod>> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaymentMethod(paymentId: string, data: {
    name?: string;
    upiId?: string;
    isDefault?: boolean;
  }): Promise<ApiResponse<PaymentMethod>> {
    return this.request(`/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaymentMethod(paymentId: string): Promise<ApiResponse> {
    return this.request(`/payments/${paymentId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultPaymentMethod(paymentId: string): Promise<ApiResponse> {
    return this.request(`/payments/${paymentId}/default`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export type { ApiResponse, LoginRequest, LoginResponse, ChangePasswordRequest, GameTimerResponse, GameResultResponse, Card }; 