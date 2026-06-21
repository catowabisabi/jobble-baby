/**
 * Jest Setup — JobbleBaby
 * 每次測試運行前執行
 */
import '@testing-library/jest-native/extend-expect';

// Mock Expo Linking
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  createURL: jest.fn((path: string) => `jobblebaby://${path}`),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Stack: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  captureException: jest.fn(),
}));

// Mock Notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated') ||
      args[0].includes('useNativeDriver') ||
      args[0].includes('component'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

// Suppress specific React Native warnings
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('ReactDOM'))
  ) {
    return;
  }
  originalError.apply(console, args);
};
