/**
 * D. 前端 Mocked 測試 — HomeScreen
 *
 * Uses mocked AsyncStorage to test HomeScreen UI state
 *
 * Key setup:
 * - HomeScreen uses useTheme() → <ThemeProvider> wrapper required
 * - HomeScreen uses useLanguage() → <LanguageProvider> wrapper required
 * - expo-router useRouter() → mocked
 * - SafeStorage calls → jest.fn() mocks
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../../app/(tabs)/index';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem } from '../../app/utils/SafeStorage';

// Mock the dependencies
jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn(),
  safeSetItem: jest.fn(),
  safeRemoveItem: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    // Default: all safeGetItem calls return null (no data)
    (safeGetItem as jest.Mock).mockResolvedValue(null);
  });

  it('should call safeGetItem on mount', async () => {
    renderWithProviders(<HomeScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render Quick Entry buttons even with no profile', async () => {
    const { getAllByText } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      const diaper = getAllByText('Diaper');
      const feed = getAllByText('Feed');
      const sleep = getAllByText('Sleep');
      expect(diaper.length).toBeGreaterThan(0);
      expect(feed.length).toBeGreaterThan(0);
      expect(sleep.length).toBeGreaterThan(0);
    });
  });

  it('should call safeGetItem with profile key on mount', async () => {
    renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalledWith('@jobble_baby_profile');
    });
  });

  it('should render projection card', async () => {
    const { getByText } = renderWithProviders(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('🔮')).toBeTruthy();
    });
  });
});
