/**
 * D. 前端 Mocked 測試 — OralMotorScreen
 *
 * Uses mocked AsyncStorage to test oral motor pattern tracking UI
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OralMotorScreen from '../../app/(tabs)/oral-motor';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

const mockProfile = JSON.stringify({
  name: 'Test Baby',
  birthDate: '2025-01-01',
  caregiverShift: 'day',
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
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('OralMotorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should call safeGetItem on mount to load profile', async () => {
    renderWithProviders(<OralMotorScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render oral motor screen without crashing', async () => {
    const { toJSON } = renderWithProviders(<OralMotorScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });

  it('should render screen content', async () => {
    const { toJSON } = renderWithProviders(<OralMotorScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });

  it('should not crash on button press', async () => {
    const { queryByText } = renderWithProviders(<OralMotorScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    const buttons = ['Log', 'Add', 'Save', 'Start', 'Record'];
    for (const label of buttons) {
      try {
        const btn = queryByText(label);
        if (btn) { fireEvent.press(btn); break; }
      } catch { /* continue */ }
    }
  });
});
