import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface SubscriptionStatus {
  is_premium: boolean;
  plan: 'free' | 'monthly' | 'yearly' | null;
  expires_at: string | null;
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    is_premium: false,
    plan: null,
    expires_at: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setStatus({ is_premium: false, plan: null, expires_at: null });
      return;
    }

    const fetchSubscription = async () => {
      setIsLoading(true);
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const response = await fetch(`${API_BASE_URL}/users/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStatus({
            is_premium: data.plan !== 'free' && data.plan !== null,
            plan: data.plan,
            expires_at: data.expires_at,
          });
        }
      } catch (e) {
        console.warn('Failed to fetch subscription status:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [isAuthenticated, user]);

  return { ...status, isLoading };
}