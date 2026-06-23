/**
 * D. 前端 Mocked 測試 — EmergencySOSScreen
 *
 * Uses mocked AsyncStorage to test EmergencySOS UI state
 *
 * Critical: SOS screen must render checklist, breathing exercise, and quick dial
 * without crashing. Tests the most safety-critical path in the app.
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmergencySOS from '../../app/(tabs)/emergency-sos';
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

describe('EmergencySOSScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    (safeGetItem as jest.Mock).mockResolvedValue(null);
    (safeSetItem as jest.Mock).mockResolvedValue(true);
  });

  it('should call safeGetItem on mount to load SOS events', async () => {
    renderWithProviders(<EmergencySOS />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
  });

  it('should render panic mode button', async () => {
    const { getByText } = renderWithProviders(<EmergencySOS />);
    await waitFor(() => {
      expect(getByText('🆘 PANIC')).toBeTruthy();
    });
  });

  it('should render 4-7-8 breathing exercise section', async () => {
    const { getByText } = renderWithProviders(<EmergencySOS />);
    await waitFor(() => {
      expect(getByText('4-7-8 Breathing')).toBeTruthy();
    });
  });

  it('should render Safe Space Checklist', async () => {
    const { getByText } = renderWithProviders(<EmergencySOS />);
    await waitFor(() => {
      expect(getByText('Safe Space Checklist')).toBeTruthy();
    });
  });

  it('should render Quick Dial section with emergency contacts', async () => {
    const { getByText } = renderWithProviders(<EmergencySOS />);
    await waitFor(() => {
      expect(getByText('Quick Dial')).toBeTruthy();
      expect(getByText('Doctor')).toBeTruthy();
      expect(getByText('Hospital')).toBeTruthy();
    });
  });
});
