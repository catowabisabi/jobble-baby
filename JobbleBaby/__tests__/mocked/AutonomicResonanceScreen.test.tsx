/**
 * D. 前端 Mocked 測試 — AutonomicResonanceScreen
 *
 * Uses mocked AsyncStorage to test AutonomicResonanceScreen UI state
 *
 * Key setup:
 * - AutonomicResonanceScreen uses useTheme() → <ThemeProvider> wrapper required
 * - AutonomicResonanceScreen uses useLanguage() → <LanguageProvider> wrapper required
 * - AutonomicResonanceScreen uses SafeStorage (safeGetItem/safeSetItem)
 * - Screen loads @jobble/resonance_pairs and @jobble/allostatic_load on mount
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AutonomicResonanceScreen from '../../app/(tabs)/autonomic-resonance';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn(() => Promise.resolve(null)),
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
  Link: ({ children }: { children: React.ReactNode }) => children,
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  Stack: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AutonomicResonanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should call safeGetItem on mount to load resonance pairs and allostatic load', async () => {
    renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalledWith('@jobble/resonance_pairs');
    });
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalledWith('@jobble/allostatic_load');
    });
  });

  it('should render Autonomic Resonance title', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      // Title is from t('autonomicResonance.title') which is "Autonomic Resonance"
      expect(getByText('Autonomic Resonance')).toBeTruthy();
    });
  });

  it('should render resonance logger section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Resonance Logger')).toBeTruthy();
    });
  });

  it('should render coupling strength section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Coupling Strength')).toBeTruthy();
    });
  });

  it('should render allostatic load dashboard section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Allostatic Load Dashboard')).toBeTruthy();
    });
  });

  it('should render Log Pair button', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });
  });

  it('should open resonance log modal when Log Pair is pressed', async () => {
    const { getByText, queryByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    const logPairBtn = getByText('Log Pair');
    fireEvent.press(logPairBtn);

    await waitFor(() => {
      // Modal should show "Log Resonance Pair" title
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });
  });

  it('should show parent zone chips in modal', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Ventral Vagal (Calm)')).toBeTruthy();
      expect(getByText('Sympathetic (Stressed)')).toBeTruthy();
      expect(getByText('Dorsal Vagal (Shutdown)')).toBeTruthy();
    });
  });

  it('should show baby state chips in modal', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Calm')).toBeTruthy();
      expect(getByText('Aroused')).toBeTruthy();
      expect(getByText('Distressed')).toBeTruthy();
    });
  });

  it('should show minEntriesRequired message when no data', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Coupling Strength')).toBeTruthy();
    });

    // With 0 entries, should show the "Need 7+ entries" message
    await waitFor(() => {
      expect(getByText(/Need 7\+ entries to calculate/)).toBeTruthy();
    });
  });

  it('should call safeSetItem when saving a resonance pair', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });

    // Press the Save button
    const saveBtn = getByText('Save');
    fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(safeSetItem).toHaveBeenCalledWith('@jobble/resonance_pairs', expect.any(String));
    });
  });

  it('should render resonance timeline section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Last 14 Days')).toBeTruthy();
    });
  });

  it('should render vagal brake prompt section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Vagal Brake Prompt')).toBeTruthy();
    });
  });

  it('should not crash on rapid Log Pair button press', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    const logPairBtn = getByText('Log Pair');
    fireEvent.press(logPairBtn);
    fireEvent.press(logPairBtn);
    fireEvent.press(logPairBtn);

    // Should not crash — only one modal should open
    await waitFor(() => {
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });
  });

  it('should render without crashing with existing data', async () => {
    // Override mock to return some data
    (safeGetItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@jobble/resonance_pairs') {
        return Promise.resolve(JSON.stringify([
          { id: '1', timestamp: new Date().toISOString(), parentZone: 'ventral', babyState: 'calm' },
          { id: '2', timestamp: new Date().toISOString(), parentZone: 'sympathetic', babyState: 'aroused' },
          { id: '3', timestamp: new Date().toISOString(), parentZone: 'dorsal', babyState: 'distressed' },
        ]));
      }
      if (key === '@jobble/allostatic_load') {
        return Promise.resolve(JSON.stringify([
          { id: '1', timestamp: new Date().toISOString(), sleepDebt: 30, illnessBurden: 20, feedingStress: 40, emotionalDysregulation: 25 },
        ]));
      }
      return Promise.resolve(null);
    });

    const { toJSON } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(safeGetItem).toHaveBeenCalled();
    });
    expect(toJSON()).toBeTruthy();
  });
});
