import { create } from 'zustand';
import { apiClient } from '../lib/api';
import { SessionManager } from '../lib/session-manager';

interface User {
  id: string;
  fullName: string;
  email: string;
  gameId: string;
  role: string;
  status?: 'active' | 'disabled' | 'banned';
}

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  mainBalance: number;
  bonusBalance: number;
  lastActivity: number;
  
  // Actions
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateBalances: (main: number, bonus: number) => void;
  refreshBalance: () => Promise<void>;
  getBalance: () => number;
  validateToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  updateLastActivity: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: true,
  mainBalance: 0,
  bonusBalance: 0,
  lastActivity: Date.now(),

      // Login action
      login: async (identifier: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await apiClient.login({ identifier, password });
          
          if (response.error) {
            set({ isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data?.token && response.data?.user) {
            // Set token in API client
            apiClient.setToken(response.data.token);
            
            // Update store state
            set({
              user: response.data.user,
              token: response.data.token,
              isLoggedIn: true,
              isLoading: false,
              lastActivity: Date.now(),
            });

            // Save session data
            SessionManager.saveSession({
              token: response.data.token,
              user: response.data.user as unknown as Record<string, unknown>,
              lastActivity: Date.now(),
            });

            // Fetch initial balance
            try {
              const walletResponse = await apiClient.getMyWallet();
              if (walletResponse.data) {
                set({ 
                  mainBalance: walletResponse.data.main, 
                  bonusBalance: walletResponse.data.bonus 
                });
              }
            } catch {
              // Balance fetch failed, continue without it
            }

            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Invalid response from server' };
        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Login failed' 
          };
        }
      },

      // Logout action
      logout: () => {
        // Clear token from API client
        apiClient.setToken(null);
        
        // Clear session data
        SessionManager.clearSession();
        
        // Clear store state
        set({
          user: null,
          token: null,
          isLoggedIn: false,
          isLoading: false,
          mainBalance: 0,
          bonusBalance: 0,
          lastActivity: Date.now(),
        });
      },

      // Update password
      updatePassword: async (newPassword: string) => {
        try {
          const response = await apiClient.updatePassword(newPassword);
          if (response.error) {
            return { success: false, error: response.error };
          }
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to update password' 
          };
        }
      },

      // Update balances
      updateBalances: (main: number, bonus: number) => {
        set({ mainBalance: main, bonusBalance: bonus });
      },

      // Refresh balance from API
      refreshBalance: async () => {
        try {
          const walletResponse = await apiClient.getMyWallet();
          if (walletResponse.data) {
            set({ 
              mainBalance: walletResponse.data.main, 
              bonusBalance: walletResponse.data.bonus 
            });
          }
        } catch (error) {
          console.error('Failed to refresh balance:', error);
        }
      },

      // Get total balance
      getBalance: () => {
        const { mainBalance, bonusBalance } = get();
        return mainBalance + bonusBalance;
      },

      // Validate token
      validateToken: async () => {
        // Check session first
        const session = SessionManager.loadSession();
        const { token } = get();
        const currentToken = token || session.token;
        
        if (!currentToken) {
          set({ isLoggedIn: false, isLoading: false });
          return false;
        }

        try {
          // Set token in API client
          apiClient.setToken(currentToken);
          
          const response = await apiClient.validateToken();
          
          if (response.error || !response.data?.valid) {
            // Only logout if it's a clear authentication error, not network issues
            if (response.error && (response.error.includes('token') || response.error.includes('unauthorized') || response.error.includes('401'))) {
              set({ 
                user: null, 
                token: null, 
                isLoggedIn: false, 
                isLoading: false 
              });
              return false;
            }
            // For network errors, keep the user logged in
            return true;
          }

          // Update user data if needed
          if (response.data.user) {
            set({ 
              user: response.data.user, 
              isLoggedIn: true, 
              isLoading: false,
              lastActivity: Date.now()
            });
          }

          return true;
        } catch (error) {
          // For network errors, keep the user logged in and try again later
          console.warn('Token validation failed due to network error, keeping user logged in:', error);
          return true;
        }
      },

      // Initialize auth on app start
      initializeAuth: async () => {
        // First check if we have a valid session
        const session = SessionManager.loadSession();
        
        if (!session.isValid) {
          set({ isLoading: false });
          return;
        }

        // Use session data if available
        const { token } = get();
        const currentToken = token || session.token;
        
        if (!currentToken) {
          set({ isLoading: false });
          return;
        }

        try {
          // Set token in API client
          apiClient.setToken(currentToken);
          
          const response = await apiClient.validateToken();
          
          if (response.error || !response.data?.valid) {
            // Only logout if it's a clear authentication error
            if (response.error && (response.error.includes('token') || response.error.includes('unauthorized') || response.error.includes('401'))) {
              set({ 
                user: null, 
                token: null, 
                isLoggedIn: false, 
                isLoading: false 
              });
              return;
            }
            // For network errors, keep the user logged in
            set({ 
              isLoggedIn: true, 
              isLoading: false 
            });
            return;
          }

          // Update user data
          if (response.data.user) {
            set({ 
              user: response.data.user, 
              isLoggedIn: true, 
              isLoading: false,
              lastActivity: Date.now()
            });
          }

          // Fetch balance
          try {
            const walletResponse = await apiClient.getMyWallet();
            if (walletResponse.data) {
              set({ 
                mainBalance: walletResponse.data.main, 
                bonusBalance: walletResponse.data.bonus 
              });
            }
          } catch (error) {
            console.error('Failed to fetch balance on init:', error);
          }
        } catch (error) {
          // For network errors, keep the user logged in
          console.warn('Auth initialization failed due to network error, keeping user logged in:', error);
          set({ 
            isLoggedIn: true, 
            isLoading: false 
          });
        }
      },

  // Update last activity timestamp
  updateLastActivity: () => {
    const now = Date.now();
    set({ lastActivity: now });
    SessionManager.updateActivity();
  },
})); 