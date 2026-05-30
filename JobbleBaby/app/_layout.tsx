import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useLanguage } from './context/LanguageContext';
import * as Notifications from 'expo-notifications';
import OnboardingScreen from './screens/OnboardingScreen';

const PROFILE_KEY = '@jobble_baby_profile';

export default function RootLayout() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    checkProfile();
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

  if (hasProfile === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0F' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (showOnboarding) {
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
        <Tabs>
          <Tabs.Screen
            name="index"
            options={{ title: t('home.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} /> }}
          />
          <Tabs.Screen
            name="tracking"
            options={{ title: t('tracking.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="edit" color={color} /> }}
          />
          <Tabs.Screen
            name="schedule"
            options={{ title: t('schedule.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="schedule" color={color} /> }}
          />
          <Tabs.Screen
            name="products"
            options={{ title: t('products.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-bag" color={color} /> }}
          />
          <Tabs.Screen
            name="growth"
            options={{ title: t('growth.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} /> }}
          />
          <Tabs.Screen
            name="profile"
            options={{ title: t('profile.title'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person" color={color} /> }}
          />
        </Tabs>
      </LanguageProvider>
    </ThemeProvider>
  );
}