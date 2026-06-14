import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import * as Notifications from 'expo-notifications';
import OnboardingScreen from './screens/OnboardingScreen';
import DaycareViewScreen from './screens/DaycareViewScreen';
import FeedingTimerScreen from './screens/FeedingTimerScreen';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoPerformanceTracing: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
});

const PROFILE_KEY = '@jobble_baby_profile';

export default function RootLayout() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    checkProfile();
    checkDeepLink();
  }, []);

  const checkProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem(PROFILE_KEY);
      if (!profile) {
        setShowOnboarding(true);
      }
      setHasProfile(!!profile);
    } catch {
      setHasProfile(false);
    }
  };

  const checkDeepLink = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('daycare')) {
        setInitialRoute('daycare');
      }
    } catch { /* silent */ }
  };

  if (hasProfile === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0F' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (initialRoute === 'daycare' || showOnboarding) {
    if (!hasProfile && initialRoute !== 'daycare') {
      return (
        <ThemeProvider>
          <LanguageProvider>
            <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
          </LanguageProvider>
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider>
        <LanguageProvider>
          <DaycareViewScreen />
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <TabNavigator />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function TabNavigator() {
  const { t } = useLanguage();
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="tracking"
        options={{ title: t('tabs.tracking'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="edit" color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('tabs.schedule'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="schedule" color={color} /> }}
      />
      <Tabs.Screen
        name="allergens"
        options={{ title: t('tabs.allergens'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="no-food" color={color} /> }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ title: t('tabs.milestones'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="emoji-events" color={color} /> }}
      />
      <Tabs.Screen
        name="sleep-training"
        options={{ title: t('tabs.sleepTraining'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="nightlight" color={color} /> }}
      />
      <Tabs.Screen
        name="teething"
        options={{ title: t('tabs.teething'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="sentiment-satisfied" color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: t('tabs.products'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-bag" color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: t('tabs.growth'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} /> }}
      />
      <Tabs.Screen
        name="constellation"
        options={{ title: t('tabs.constellation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="stars" color={color} /> }}
      />
      <Tabs.Screen
        name="reflex-visual-motor"
        options={{ title: t('tabs.reflexVisualMotor'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="psychology" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person" color={color} /> }}
      />
    </Tabs>
  );
}