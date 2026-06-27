/**
 * D. 前端 Mocked 測試 — ProfileScreen
 *
 * Uses mocked AsyncStorage to test profile/settings UI
 *
 * Run: npm run test:mocked
 */

// MOCK all expo dependencies BEFORE importing anything
jest.mock('expo', () => ({}), { virtual: true });
jest.mock('expo-modules-core', () => ({
  EventEmitter: class {},
  NativeModulesProxy: {},
  requireNativeModule: jest.fn(),
  requireOptionalNativeModule: jest.fn(),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons', { virtual: true });
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
  createURL: jest.fn(() => 'jobblebaby://'),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ cancelled: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileScreen from '../../app/(tabs)/profile';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem } from '../../app/utils/SafeStorage';

const mockProfile = JSON.stringify({
  name: 'Test Baby',
  birthDate: '2025-01-01',
  gender: 'female',
});

jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn((key: string) => {
    if (key === '@jobble_baby_profile') return Promise.resolve(mockProfile);
    return Promise.resolve(null);
  }),
  safeSetItem: jest.fn(() => Promise.resolve(true)),
  safeRemoveItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('../../app/components/BadgeGallery', () => ({
  __esModule: true,
  default: () => null,
  getBadgeCounts: jest.fn(() => ({ total: 0, earned: 0 })),
}));

jest.mock('../../app/utils/data-export', () => ({
  exportAllData: jest.fn(() => Promise.resolve()),
  shareExportedData: jest.fn(() => Promise.resolve()),
  importData: jest.fn(() => Promise.resolve()),
  pickBackupFile: jest.fn(() => Promise.resolve(null)),
  isSharingAvailable: jest.fn(() => true),
}));

jest.mock('../../app/utils/badgeService', () => ({
  awardBadge: jest.fn(),
  getBadgeCounts: jest.fn(() => ({ total: 0, earned: 0 })),
}));

jest.mock('../../app/utils/daycareToken', () => ({
  encodeDaycareToken: jest.fn(),
  storeDaycareToken: jest.fn(() => Promise.resolve()),
  getDaycareToken: jest.fn(() => Promise.resolve(null)),
  getTokenDaysRemaining: jest.fn(() => 0),
  isTokenExpired: jest.fn(() => false),
  DAYCARE_TOKEN_KEY: '@jobble_daycare_token',
}));

jest.mock('../../app/hooks/useMonitorLink', () => ({
  useMonitorLink: jest.fn(() => ({
    linked: false,
    app: null,
    getPreferredApp: jest.fn(() => Promise.resolve(null)),
    setPreferredApp: jest.fn(() => Promise.resolve()),
  })),
  getPreferredApp: jest.fn(() => Promise.resolve(null)),
  setPreferredApp: jest.fn(() => Promise.resolve()),
  MonitorApp: {},
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should call safeGetItem on mount to load profile', async () => {
    renderWithProviders(<ProfileScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render Parent Profile heading', async () => {
    const { getByText } = renderWithProviders(<ProfileScreen />);
    await waitFor(() => {
      expect(getByText('Parent Profile')).toBeTruthy();
    });
  });

  it('should render baby name from profile', async () => {
    const { getByText } = renderWithProviders(<ProfileScreen />);
    await waitFor(() => {
      expect(getByText('Test Baby')).toBeTruthy();
    });
  });

  it('should render screen content without crashing', async () => {
    const { toJSON } = renderWithProviders(<ProfileScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });
});