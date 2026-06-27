/**
 * D. 前端 Mocked 測試 — SleepTrainingScreen
 *
 * Uses mocked AsyncStorage to test sleep training UI
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SleepTrainingScreen from '../../app/(tabs)/sleep-training';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

const mockProfile = JSON.stringify({
  name: 'Test Baby',
  birthDate: '2025-01-01',
});

jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn((key: string) => {
    if (key === '@jobble_baby_profile') return Promise.resolve(mockProfile);
    return Promise.resolve(null);
  }),
  safeSetItem: jest.fn(() => Promise.resolve(true)),
  safeRemoveItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('../../app/utils/badgeService', () => ({
  awardBadge: jest.fn(),
}));

describe('SleepTrainingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should call safeGetItem on mount to load sleep data', async () => {
    renderWithProviders(<SleepTrainingScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render Choose a method text', async () => {
    const { getByText } = renderWithProviders(<SleepTrainingScreen />);
    await waitFor(() => {
      expect(getByText('Choose a method to begin')).toBeTruthy();
    });
  });

  it('should render Methods section', async () => {
    const { getByText } = renderWithProviders(<SleepTrainingScreen />);
    await waitFor(() => {
      expect(getByText('Methods')).toBeTruthy();
    });
  });

  it('should render screen content without crashing', async () => {
    const { toJSON } = renderWithProviders(<SleepTrainingScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });
});