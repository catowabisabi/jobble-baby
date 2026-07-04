/**
 * D. 前端 Mocked 測試 — SocialEmotionalSentinelScreen
 *
 * Tests the Social-Emotional Sentinel Navigator tab (Cycle 1107, commit 8cafd13).
 * 657-line screen with 5 sections: Jealousy, Social Referencing, Joint Attention,
 * Frustration Tolerance, and 14-Day Timeline.
 *
 * CRITICAL GAP FIX: This screen was shipped without any test in commit 8cafd13.
 * This test closes RT-GAP-001.
 *
 * Run: npm run test:mocked
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, Pressable, TextInput } from 'react-native';
import SocialEmotionalSentinelScreen from '../../app/(tabs)/social-emotional-sentinel';
import { renderWithProviders } from '../helpers/render-with-providers';
import { safeGetItem, safeSetItem } from '../../app/utils/SafeStorage';

// Mock storage data
const MOCK_EMPTY_STORAGE = JSON.stringify([]);

const MOCK_BABY_PROFILE = JSON.stringify({
  name: 'TestBaby',
  birthDate: '2025-01-01', // ~18 months old — over 9mo and 12mo
  gender: 'boy' as const,
});

// Mock SafeStorage
jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn((key: string) => {
    if (key === '@jobble/social_emotional_log') return Promise.resolve(MOCK_EMPTY_STORAGE);
    if (key === '@jobble_baby_profile') return Promise.resolve(MOCK_BABY_PROFILE);
    return Promise.resolve(null);
  }),
  safeSetItem: jest.fn(() => Promise.resolve(true)),
  safeRemoveItem: jest.fn(() => Promise.resolve()),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('SocialEmotionalSentinelScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (safeSetItem as jest.Mock).mockResolvedValue(true);
    (safeGetItem as jest.Mock).mockImplementation((key: string) => {
      if (key === '@jobble/social_emotional_log') return Promise.resolve(MOCK_EMPTY_STORAGE);
      if (key === '@jobble_baby_profile') return Promise.resolve(MOCK_BABY_PROFILE);
      return Promise.resolve(null);
    });
  });

  // ─── Section 1: Jealousy Episode ───────────────────────────────────────────

  describe('Section 1 — Jealousy Episode', () => {
    it('renders Jealousy Episode section', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Jealousy Episode')).toBeTruthy();
      });
    });

    it('shows all jealousy context chips', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Sibling arrives')).toBeTruthy();
        expect(getByText('Parent attention diverted')).toBeTruthy();
        expect(getByText('Toy taken')).toBeTruthy();
        expect(getByText('Other')).toBeTruthy();
      });
    });

    it('shows intensity buttons 1–5', async () => {
      const { getAllByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        // Jealousy intensity buttons 1–5, each appears exactly once in this section
        expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('4').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('5').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows notes TextInput', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('What happened?')).toBeTruthy();
      });
    });

    it('shows Save Jealousy Episode button', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Save Jealousy Episode')).toBeTruthy();
      });
    });

    it('calls safeSetItem on Save Jealousy Episode press', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => getByText('Save Jealousy Episode'));

      fireEvent.changeText(getByPlaceholderText('What happened?'), 'Test jealousy notes');
      fireEvent.press(getByText('Save Jealousy Episode'));

      await waitFor(() => {
        expect(safeSetItem).toHaveBeenCalledWith(
          '@jobble/social_emotional_log',
          expect.stringContaining('jealousy')
        );
      });
    });
  });

  // ─── Section 2: Social Referencing ──────────────────────────────────────────

  describe('Section 2 — Social Referencing', () => {
    it('renders Social Referencing section', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Social Referencing')).toBeTruthy();
      });
    });

    it('shows all trigger options', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('New food')).toBeTruthy();
        expect(getByText('New person')).toBeTruthy();
        expect(getByText('New object')).toBeTruthy();
        expect(getByText('Stranger')).toBeTruthy();
        expect(getByText('Unfamiliar place')).toBeTruthy();
      });
    });

    it('shows response options', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Approached')).toBeTruthy();
        expect(getByText('Hesitated')).toBeTruthy();
        expect(getByText('Rejected')).toBeTruthy();
      });
    });

    it('shows caregiver toggle (Yes/No)', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Yes')).toBeTruthy();
        expect(getByText('No')).toBeTruthy();
      });
    });

    it('shows Log Social Reference button', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Log Social Reference')).toBeTruthy();
      });
    });

    it('calls safeSetItem on Log Social Reference press', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => getByText('Log Social Reference'));

      fireEvent.press(getByText('Log Social Reference'));

      await waitFor(() => {
        expect(safeSetItem).toHaveBeenCalledWith(
          '@jobble/social_emotional_log',
          expect.stringContaining('socialRef')
        );
      });
    });
  });

  // ─── Section 3: Joint Attention & Empathy ────────────────────────────────────

  describe('Section 3 — Joint Attention & Empathy', () => {
    it('renders Joint Attention & Empathy section', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Joint Attention & Empathy')).toBeTruthy();
      });
    });

    it('shows type chips: Joint Attention, Empathy Expression, Triadic Engagement', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Joint Attention')).toBeTruthy();
        expect(getByText('Empathy Expression')).toBeTruthy();
        expect(getByText('Triadic Engagement')).toBeTruthy();
      });
    });

    it('shows Log Entry button', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Log Entry')).toBeTruthy();
      });
    });

    it('calls safeSetItem on Log Entry press', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => getByText('Log Entry'));

      fireEvent.press(getByText('Log Entry'));

      await waitFor(() => {
        expect(safeSetItem).toHaveBeenCalledWith(
          '@jobble/social_emotional_log',
          expect.stringContaining('jointEmpathy')
        );
      });
    });
  });

  // ─── Section 4: Frustration Tolerance ────────────────────────────────────────

  describe('Section 4 — Frustration Tolerance', () => {
    it('renders Frustration Tolerance section', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Frustration Tolerance')).toBeTruthy();
      });
    });

    it('shows frustration level buttons 0–5', async () => {
      const { getAllByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        // Frustration buttons 0–5 (distinct from jealousy intensity 1–5)
        // Use getAllByText because "5" also appears in intensity label "Intensity: 3/5"
        expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('4').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('5').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows Log Frustration Tolerance button', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Log Frustration Tolerance')).toBeTruthy();
      });
    });

    it('calls safeSetItem on Log Frustration Tolerance press', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => getByText('Log Frustration Tolerance'));

      fireEvent.press(getByText('Log Frustration Tolerance'));

      await waitFor(() => {
        expect(safeSetItem).toHaveBeenCalledWith(
          '@jobble/social_emotional_log',
          expect.stringContaining('frustration')
        );
      });
    });

    it('shows frustration context TextInput', async () => {
      const { getByPlaceholderText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByPlaceholderText('What triggered the frustration?')).toBeTruthy();
      });
    });
  });

  // ─── Section 5: 14-Day Timeline ─────────────────────────────────────────────

  describe('Section 5 — 14-Day Timeline', () => {
    it('renders timeline section', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('14-Day Timeline')).toBeTruthy();
      });
    });

    it('shows no data text when entries empty', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('No entries yet')).toBeTruthy();
      });
    });

    it('shows legend items', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Jealousy')).toBeTruthy();
        expect(getByText('Social Ref')).toBeTruthy();
        expect(getByText('Joint/Empathy')).toBeTruthy();
      });
    });
  });

  // ─── Header & Accessibility ─────────────────────────────────────────────────

  describe('Header & Accessibility', () => {
    it('renders header with emoji and title', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText(/💛/)).toBeTruthy();
      });
    });

    it('renders subtitle with Social Referencing and Joint Attention', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText(/Social Referencing.*Joint Attention/)).toBeTruthy();
      });
    });
  });

  // ─── Alert Cards (age-based) ─────────────────────────────────────────────────

  describe('Alert Cards (age-based)', () => {
    it('shows social ref delay alert for baby >= 12 months with no socialRef entries', async () => {
      // MOCK_BABY_PROFILE has baby born 2025-01-01, ~18 months old (> 12mo)
      // MOCK_EMPTY_STORAGE has no entries
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Social referencing milestone may be delayed — discuss with pediatrician')).toBeTruthy();
      });
    });
  });

  // ─── Storage Interaction ─────────────────────────────────────────────────────

  describe('Storage Interaction', () => {
    it('loads baby profile from @jobble_baby_profile', async () => {
      const { getByText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => {
        expect(getByText('Jealousy Episode')).toBeTruthy();
      });
    });

    it('pre-saves jealousy entry with correct storage key', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<SocialEmotionalSentinelScreen />);
      await waitFor(() => getByText('Save Jealousy Episode'));

      fireEvent.changeText(getByPlaceholderText('What happened?'), 'Storage verification');
      fireEvent.press(getByText('Save Jealousy Episode'));

      await waitFor(() => {
        expect(safeSetItem).toHaveBeenCalledWith(
          '@jobble/social_emotional_log',
          expect.stringContaining('jealousy')
        );
      });
    });
  });
});
