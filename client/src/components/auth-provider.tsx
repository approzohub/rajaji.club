"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth, validateToken, isLoggedIn, updateLastActivity } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize auth when the app starts
    initializeAuth();
  }, [initializeAuth]);

  // Set up periodic token validation
  useEffect(() => {
    if (isLoggedIn) {
      // Validate token every 5 minutes
      intervalRef.current = setInterval(async () => {
        try {
          await validateToken();
        } catch {
          // Periodic token validation failed
        }
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      // Clear interval if user is not logged in
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoggedIn, validateToken]);

  // Add visibility change listener to validate token when user returns to the app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isLoggedIn) {
        try {
          await validateToken();
          updateLastActivity();
        } catch {
          // Visibility change token validation failed
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, validateToken, updateLastActivity]);

  // Track user activity
  useEffect(() => {
    const handleUserActivity = () => {
      if (isLoggedIn) {
        updateLastActivity();
      }
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isLoggedIn, updateLastActivity]);

  return <>{children}</>;
} 