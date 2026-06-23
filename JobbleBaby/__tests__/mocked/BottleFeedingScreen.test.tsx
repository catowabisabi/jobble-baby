/**
 * D. 前端 Mocked 測試 — BottleFeedingScreen
 *
 * Uses mocked AsyncStorage to test bottle feeding tracking UI
 *
 * Critical: Bottle feeding is one of the 3 main Quick Entry types
 * (Diaper/Feed/Sleep). Must test nipple level selection, intake logging.
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottleFeedingScreen from '../../app/(tabs)/bottle-feeding';
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

describe('BottleFeedingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    (safeGetItem as jest.Mock).mockResolvedValue(null);
    (safeSetItem as jest.Mock).mockResolvedValue(true);
  });

  it('should call safeGetItem on mount to load feeding history', async () => {
    renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render bottle feeding title', async () => {
    const { getByText } = renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      expect(getByText('Bottle Feeding')).toBeTruthy();
    });
  });

  it('should render feeding-related tabs (multiple Nipple Level and Feeding Log)', async () => {
    const { getAllByText } = renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      const nippleLevelCount = getAllByText('Nipple Level').length;
      expect(nippleLevelCount).toBeGreaterThan(0);
      const feedingLogCount = getAllByText('Feeding Log').length;
      expect(feedingLogCount).toBeGreaterThan(0);
    });
  });

  it('should render nipple level options (Preemie, Newborn, etc.)', async () => {
    const { getAllByText } = renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      const newbornCount = getAllByText('Newborn').length;
      expect(newbornCount).toBeGreaterThan(0);
    });
  });

  it('should render Log Session button', async () => {
    const { getByText } = renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      expect(getByText('Log Session')).toBeTruthy();
    });
  });

  it('should have accessible nipple level selector', async () => {
    const { getByLabelText } = renderWithProviders(<BottleFeedingScreen />);
    await waitFor(() => {
      expect(getByLabelText('Preemie nipple level')).toBeTruthy();
      expect(getByLabelText('Newborn nipple level')).toBeTruthy();
    });
  });
});
