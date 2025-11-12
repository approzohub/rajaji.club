"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoggedIn, isLoading, initializeAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Initialize auth on component mount
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Redirect to home if not logged in and not loading
    if (!isLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1a]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Show fallback or redirect if not logged in
  if (!isLoggedIn) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null; // Will redirect to home
  }

  // Show protected content if logged in
  return <>{children}</>;
} 