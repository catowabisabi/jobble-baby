import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import GearCheckScreen from './gear-check';

export default function TabsLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E5E7EB' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="allergens"
        options={{ title: t('tabs.allergens'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="food-apple" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="tracking"
        options={{ title: t('tabs.tracking'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('tabs.schedule'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: t('tabs.growth'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: t('tabs.products'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shopping" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ title: t('tabs.milestones'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="trophy-variant" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="sleep-training"
        options={{ title: t('tabs.sleepTraining'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="weather-night" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="teething"
        options={{ title: t('tabs.teething'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tooth" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="monitor-correlation"
        options={{
          title: t('tabs.monitorCorrelation') || 'Monitor',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="baby-face-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="milk-prep"
        options={{
          title: t('tabs.milkPrep'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="snowflake" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="shift-handoff"
        options={{
          title: t('tabs.shiftHandoff') || 'Shift',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-switch" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="stress-cascade"
        options={{
          title: t('tabs.stressCascade'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="doctor-visit"
        options={{
          title: t('tabs.doctorVisit'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="sleep-debt"
        options={{
          title: t('tabs.sleepDebt'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sleep" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="tummy-time"
        options={{
          title: t('tabs.tummyTime'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-handsup" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="bottle-refusal"
        options={{
          title: t('tabs.bottleRefusal'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="baby-bottle" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="gear-check"
        options={{
          title: t('tabs.gearCheck'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="backpack" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="reflex-tracker"
        options={{
          title: t('tabs.reflexTracker'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
