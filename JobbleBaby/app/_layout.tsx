import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemeProvider } from './context/ThemeContext';
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
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Tabs>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} /> }}
        />
        <Tabs.Screen
          name="tracking"
          options={{ title: 'Tracking', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="edit" color={color} /> }}
        />
        <Tabs.Screen
          name="schedule"
          options={{ title: 'Schedule', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="schedule" color={color} /> }}
        />
        <Tabs.Screen
          name="products"
          options={{ title: 'Products', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-bag" color={color} /> }}
        />
        <Tabs.Screen
          name="growth"
          options={{ title: 'Growth', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: 'Profile', tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person" color={color} /> }}
        />
      </Tabs>
    </ThemeProvider>
  );
}