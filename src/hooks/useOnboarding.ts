import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'onboarding_complete';

interface UseOnboardingReturn {
  isOnboardingComplete: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkOnboardingStatus = useCallback(async (): Promise<boolean> => {
    try {
      const stored = await SecureStore.getItemAsync(ONBOARDING_KEY);
      const complete = stored === 'true';
      setIsOnboardingComplete(complete);
      setIsLoading(false);
      return complete;
    } catch (e) {
      console.error('Failed to check onboarding status:', e);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      setIsOnboardingComplete(true);
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
      throw e;
    }
  }, []);

  return {
    isOnboardingComplete,
    isLoading,
    completeOnboarding,
    checkOnboardingStatus,
  };
}