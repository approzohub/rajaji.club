"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient, type LoginRequest } from "../lib/api";

interface User {
  id: string;
  fullName: string;
  email: string;
  gameId: string;
  role: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  login: (gameId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and validate it
    const validateExistingToken = async () => {
      try {
        const response = await apiClient.validateToken();
        if (response.data?.valid && response.data?.user) {
          setIsLoggedIn(true);
          setUser(response.data.user);
        } else {
          // Invalid token, clear it
          apiClient.setToken(null);
          setIsLoggedIn(false);
          setUser(null);
        }
      } catch {
        // Token validation failed
        apiClient.setToken(null);
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateExistingToken();
  }, []);

  async function login(gameId: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials: LoginRequest = {
        identifier: gameId,
        password: password,
      };

      const response = await apiClient.login(credentials);
      
      if (response.error) {
        return { success: false, error: response.error };
      }

      if (response.data?.token && response.data?.user) {
        setIsLoggedIn(true);
        setUser(response.data.user);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch {
      // Login error
      return { success: false, error: 'Network error' };
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.logout();
    } catch {
      // Logout error
    } finally {
      setIsLoggedIn(false);
      setUser(null);
    }
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.changePassword({ oldPassword, newPassword });
      
      if (response.error) {
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch {
      // Change password error
      return { success: false, error: 'Network error' };
    }
  }

  async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiClient.updatePassword(newPassword);
      
      if (response.error) {
        return { success: false, error: response.error };
      }

      return { success: true };
    } catch {
      // Update password error
      return { success: false, error: 'Network error' };
    }
  }

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      user, 
      isLoading, 
      login, 
      logout, 
      changePassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
} 