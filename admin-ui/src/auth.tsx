import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loginApi, setAuthToken, validateTokenApi } from './api';
import { store } from './store';
import { usersApi } from './api/usersApi';
import { walletApi } from './api/walletApi';
import { withdrawalsApi } from './api/withdrawalsApi';
import { gamesApi } from './api/gamesApi';
import { bidsApi } from './api/bidsApi';
import { notificationsApi } from './api/notificationsApi';
import { cmsApi } from './api/cmsApi';

import { authApi } from './api/authApi';
import { dashboardApi } from './api/dashboardApi';

interface User {
  id: string;
  fullName: string;
  email: string;
  gameId: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to validate token with backend
  const validateToken = async (token: string) => {
    try {
      setAuthToken(token);
      const response = await validateTokenApi();
      return response.valid && response.user;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          // Validate the stored token
          const validationResult = await validateToken(storedToken);
          
          if (validationResult) {
            setToken(storedToken);
            // Use the user data from validation response (more up-to-date)
            setUser(validationResult);
            setAuthToken(storedToken);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuthToken(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const data = await loginApi(identifier, password);
    setToken(data.token);
    setUser(data.user || { role: data.role, mustChangePassword: data.mustChangePassword });
    localStorage.setItem('token', data.token);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    setAuthToken(data.token);
  };

  const logout = () => {
    // Clear auth state
    setToken(null);
    setUser(null);
    
    // Clear auth token
    setAuthToken(null);
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear all Redux store cache by dispatching reset actions
    store.dispatch(usersApi.util.resetApiState());
    store.dispatch(walletApi.util.resetApiState());
    store.dispatch(withdrawalsApi.util.resetApiState());
    store.dispatch(gamesApi.util.resetApiState());
    store.dispatch(bidsApi.util.resetApiState());
    store.dispatch(notificationsApi.util.resetApiState());
    store.dispatch(cmsApi.util.resetApiState());

    store.dispatch(authApi.util.resetApiState());
    store.dispatch(dashboardApi.util.resetApiState());
    
    // Clear any other cached data
    if (typeof window !== 'undefined') {
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any other stored data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('persist:') || key.includes('cache') || key.includes('query')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 