import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserInfo } from '../types';
import * as authApi from '../api/auth';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!authApi.getToken();

  const fetchUser = useCallback(async () => {
    try {
      const userInfo = await authApi.getUserInfo();
      setUser(userInfo);
    } catch {
      authApi.clearToken();
    }
  }, []);

  useEffect(() => {
    if (authApi.getToken()) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    authApi.setToken(tokens.access_token);
    await fetchUser();
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    await authApi.register(firstName, lastName, email, password);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
