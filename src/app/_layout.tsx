import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Colors } from '@/constants/theme';

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isOnboardingComplete, isLoading: isOnboardingLoading } = useOnboarding();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isAuthLoading || isOnboardingLoading) return;

    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isOnboardingComplete) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/onboarding' as any);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, isOnboardingComplete, isAuthLoading, isOnboardingLoading, pathname]);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <OnboardingGate>
          <AppTabs />
        </OnboardingGate>
      </AuthProvider>
    </ThemeProvider>
  );
}