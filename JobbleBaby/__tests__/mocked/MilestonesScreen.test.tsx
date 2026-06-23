/**
 * D. 前端 Mocked 測試 — MilestonesScreen
 *
 * Uses mocked AsyncStorage to test Milestones tracking UI
 *
 * Critical: Milestones screen handles photo capture, WHO developmental
 * windows, and growth percentiles — complex state that must be tested.
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MilestonesScreen from '../../app/(tabs)/milestones';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn(),
  safeSetItem: jest.fn(),
  safeRemoveItem: jest.fn(),
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

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

describe('MilestonesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    (safeGetItem as jest.Mock).mockResolvedValue(null);
    (safeSetItem as jest.Mock).mockResolvedValue(true);
  });

  it('should call safeGetItem on mount to load milestone photos', async () => {
    renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render milestone type selector with First Smile', async () => {
    const { getByText } = renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(getByText('First Smile')).toBeTruthy();
    });
  });

  it('should render developmental age window', async () => {
    const { getByText } = renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(getByText('0-2 months')).toBeTruthy();
    });
  });

  it('should render Brain Builder section', async () => {
    const { getByText } = renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(getByText('Brain Builder')).toBeTruthy();
    });
  });

  it('should render milestone type selector with First Steps', async () => {
    const { getByText } = renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(getByText('First Steps')).toBeTruthy();
    });
  });

  it('should render Milestone Gallery section', async () => {
    const { getByText } = renderWithProviders(<MilestonesScreen />);
    await waitFor(() => {
      expect(getByText('Milestone Gallery')).toBeTruthy();
    });
  });
});
