import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
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
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="tracking"
        options={{ title: 'Track', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: 'Schedule', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: 'Growth', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: 'Products', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shopping" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ title: 'Milestones', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="trophy-variant" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
