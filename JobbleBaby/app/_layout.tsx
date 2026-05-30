import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import * as Notifications from 'expo-notifications';
import OnboardingScreen from './screens/OnboardingScreen';

const PROFILE_KEY = '@jobble_baby_profile';

export default function RootLayout() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
        <TabNavigator />
      </LanguageProvider>
    </ThemeProvider>
  );
}

// Extracted to separate component so it renders INSIDE LanguageProvider
function TabNavigator() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
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
        name="products"
        options={{ title: t('tabs.products'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-bag" color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: t('tabs.growth'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person" color={color} /> }}
      />
    </Tabs>
  );
}