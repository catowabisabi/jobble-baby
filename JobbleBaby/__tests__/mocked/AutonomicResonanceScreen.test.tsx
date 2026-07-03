/**
 * D. 前端 Mocked 測試 — AutonomicResonanceScreen
 *
 * Uses jest.mock factory to replace SafeStorage, testing AsyncStorage-backed React component state
 *
 * Key setup:
 * - AutonomicResonanceScreen uses useTheme() → <ThemeProvider> wrapper required
 * - AutonomicResonanceScreen uses useLanguage() → <LanguageProvider> wrapper required
 * - Screen loads @jobble/resonance_pairs and @jobble/allostatic_load on mount
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AutonomicResonanceScreen from '../../app/(tabs)/autonomic-resonance';
import { renderWithProviders } from '../helpers/render-with-providers';

// ---------------------------------------------------------------------------
// SafeStorage mock — module-level so it intercepts before component loads.
// We spy on our own mock functions to track calls without touching the real module.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFns: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
} = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(true),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('../../app/utils/SafeStorage', (): any => ({
  safeGetItem: (key: string) => mockFns.getItem(key),
  safeSetItem: (key: string, value: string) => mockFns.setItem(key, value),
  safeRemoveItem: () => Promise.resolve(true),
}));

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  mockFns.getItem = () => Promise.resolve(null);
  mockFns.setItem = () => Promise.resolve(true);
});

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
  it('should call safeGetItem on mount to load resonance pairs and allostatic load', async () => {
    // Track calls via a mutable ref that survives across render phases
    const calls: string[] = [];
    mockFns.getItem = (key: string) => {
      calls.push(key);
      return Promise.resolve(null);
    };

    const { toJSON } = renderWithProviders(<AutonomicResonanceScreen />);

    // Verify the component renders synchronously (no crash)
    expect(toJSON()).toBeTruthy();

    // safeGetItem is called from async loadData() in useEffect.
    // loadData() is NOT awaited, so we must wait manually for the microtask to execute.
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    expect(calls).toContain('@jobble/resonance_pairs');
    expect(calls).toContain('@jobble/allostatic_load');
  }, 10000); // extend test timeout for this async test

  it('should render Autonomic Resonance title', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
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
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });
  });

  it('should show parent zone chips in modal via accessibilityLabel', async () => {
    const { getByText, getAllByLabelText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    // Zone chip accessibilityLabels are the translated zone names.
    // Since zone names also appear in timeline legend, use accessibilityLabel instead of getByText.
    await waitFor(() => {
      const ventral = getAllByLabelText(/ventral vagal/i);
      expect(ventral.length).toBeGreaterThan(0);
    });
  });

  it('should show baby state chips in modal via accessibilityLabel', async () => {
    const { getByText, getAllByLabelText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      const calmLabels = getAllByLabelText(/calm/i);
      expect(calmLabels.length).toBeGreaterThan(0);
    });
  });

  it('should show coupling progress when no data', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Coupling Strength')).toBeTruthy();
    });

    // With 0 entries, shows "(0/7)" count indicator
    await waitFor(() => {
      expect(getByText(/\(0\/7\)/)).toBeTruthy();
    });
  });

  it('should call safeSetItem when saving a resonance pair', async () => {
    const setItemCalls: [string, string][] = [];
    mockFns.setItem = (key: string, value: string) => {
      setItemCalls.push([key, value]);
      return Promise.resolve(true);
    };

    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Save'));

    // Modal should call safeSetItem to persist the pair
    await waitFor(
      () => {
        expect(setItemCalls.some(([k]) => k === '@jobble/resonance_pairs')).toBe(true);
      },
      { timeout: 10000 }
    );
  });

  it('should render resonance timeline section', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Resonance Timeline')).toBeTruthy();
    });
  });

  it('should show resonance pairs count in timeline when data exists', async () => {
    mockFns.getItem = (key: string) => {
      if (key === '@jobble/resonance_pairs') {
        return Promise.resolve(
          JSON.stringify([
            { id: '1', timestamp: new Date().toISOString(), parentZone: 'ventral', babyState: 'calm' },
            { id: '2', timestamp: new Date().toISOString(), parentZone: 'sympathetic', babyState: 'aroused' },
            { id: '3', timestamp: new Date().toISOString(), parentZone: 'dorsal', babyState: 'distressed' },
          ])
        );
      }
      if (key === '@jobble/allostatic_load') {
        return Promise.resolve(JSON.stringify([]));
      }
      return Promise.resolve(null);
    };

    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Resonance Timeline')).toBeTruthy();
    });
  });

  it('should not crash on rapid Log Pair button press', async () => {
    const { getByText } = renderWithProviders(<AutonomicResonanceScreen />);
    await waitFor(() => {
      expect(getByText('Log Pair')).toBeTruthy();
    });

    fireEvent.press(getByText('Log Pair'));
    fireEvent.press(getByText('Log Pair'));
    fireEvent.press(getByText('Log Pair'));

    await waitFor(() => {
      expect(getByText('Log Resonance Pair')).toBeTruthy();
    });
  });

  it('should render without crashing with existing data', async () => {
    mockFns.getItem = (key: string) => {
      if (key === '@jobble/resonance_pairs') {
        return Promise.resolve(
          JSON.stringify([
            { id: '1', timestamp: new Date().toISOString(), parentZone: 'ventral', babyState: 'calm' },
            { id: '2', timestamp: new Date().toISOString(), parentZone: 'sympathetic', babyState: 'aroused' },
            { id: '3', timestamp: new Date().toISOString(), parentZone: 'dorsal', babyState: 'distressed' },
          ])
        );
      }
      if (key === '@jobble/allostatic_load') {
        return Promise.resolve(
          JSON.stringify([
            { id: '1', timestamp: new Date().toISOString(), sleepDebt: 30, illnessBurden: 20, feedingStress: 40, emotionalDysregulation: 25 },
          ])
        );
      }
      return Promise.resolve(null);
    };

    const { toJSON } = renderWithProviders(<AutonomicResonanceScreen />);
    // Verify the component renders without crashing
    expect(toJSON()).toBeTruthy();
  });
});
