/**
 * 認證 Context - 管理全局用戶登入狀態
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';
const FETCH_TIMEOUT_MS = 15000;

// 用戶類型
interface User {
  id: number;
  email: string;
  name: string | null;
  subscription_tier: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token 存儲鍵
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Helper: safe JSON parse for stored user
function safeParseUser(json: string): User | null {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Helper: decode JWT payload (base64url, no signature verification)
function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64 (replace - with +, _ with /, add padding)
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Helper: check if JWT is expired (exp claim)
function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload || !payload.exp) return false;
  const expMs = (payload.exp as number) * 1000;
  return Date.now() >= expMs;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化 - 從 SecureStore 恢復會話
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUserRaw = await SecureStore.getItemAsync(USER_KEY);

      if (storedToken && storedUserRaw) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          // Clear expired credentials
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          setToken(null);
          setUser(null);
        } else {
          const storedUser = safeParseUser(storedUserRaw);
          if (storedUser) {
            setToken(storedToken);
            setUser(storedUser);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load auth from secure storage:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '登入失敗');
      }

      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));

      setToken(data.access_token);
      setUser(data.user);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setError('請求超時，請稍後再試');
      } else {
        setError(e.message || '網絡錯誤');
      }
      throw e;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '註冊失敗');
      }

      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));

      setToken(data.access_token);
      setUser(data.user);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setError('請求超時，請稍後再試');
      } else {
        setError(e.message || '網絡錯誤');
      }
      throw e;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        error,
      }}
    >
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