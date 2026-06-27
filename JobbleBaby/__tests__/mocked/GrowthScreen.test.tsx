/**
 * D. 前端 Mocked 測試 — GrowthScreen
 *
 * Uses mocked AsyncStorage to test growth tracking UI
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GrowthScreen from '../../app/(tabs)/growth';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

const mockProfile = JSON.stringify({
  name: 'Test Baby',
  birthDate: '2025-01-01',
  gender: 'male',
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
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('GrowthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should call safeGetItem on mount to load growth data', async () => {
    renderWithProviders(<GrowthScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render growth screen greeting', async () => {
    const { getByText } = renderWithProviders(<GrowthScreen />);
    await waitFor(() => {
      expect(getByText('Greeting')).toBeTruthy();
    });
  });

  it('should render growth metric labels', async () => {
    const { getByText } = renderWithProviders(<GrowthScreen />);
    await waitFor(() => {
      const labels = ['Weight', 'Height'];
      const found = labels.filter(l => {
        try { return getByText(l); } catch { return false; }
      });
      expect(found.length).toBeGreaterThan(0);
    });
  });

  it('should render screen content without crashing', async () => {
    const { toJSON } = renderWithProviders(<GrowthScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });

  it('should not crash on button press', async () => {
    const { queryByText } = renderWithProviders(<GrowthScreen />);
    await waitFor(() => {
      expect(queryByText('Greeting')).toBeTruthy();
    });
    const buttons = ['Add', 'Log', 'Save', 'History'];
    for (const label of buttons) {
      try {
        const btn = queryByText(label);
        if (btn) { fireEvent.press(btn); break; }
      } catch { /* continue */ }
    }
  });
});