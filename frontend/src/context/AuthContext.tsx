import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEMO_USERS } from '../data/mockData';
import { authService } from '../services/mockApiService';
import { DemoUser } from '../types';

interface AuthContextValue {
  user: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<DemoUser>;
  logout: () => void;
}

const STORAGE_KEY = 'certiflow_demo_user_id';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    try {
      const savedId = sessionStorage.getItem(STORAGE_KEY);
      if (!savedId) return null;
      return DEMO_USERS.find((u) => u.id === savedId) ?? null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEY, user.id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authenticated = await authService.authenticate(email, password);
      setUser(authenticated);
      return authenticated;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
