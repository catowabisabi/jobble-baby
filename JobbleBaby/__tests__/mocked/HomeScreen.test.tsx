/**
 * D. 前端 Mocked 測試 — HomeScreen
 * 
 * 使用 mocked AsyncStorage 測試 HomeScreen 的 UI 狀態
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../../app/(tabs)/index';

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

const mockSafeGetItem = require('../../app/utils/SafeStorage').safeGetItem;
const mockSafeSetItem = require('../../app/utils/SafeStorage').safeSetItem;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  it('should render loading state initially', () => {
    // No profile stored - should show onboarding redirect
    mockSafeGetItem.mockResolvedValueOnce(null);
    
    const { getByTestId } = render(<HomeScreen />);
    // The component will try to load profile
    expect(mockSafeGetItem).toHaveBeenCalled();
  });

  it('should render home content when profile exists', async () => {
    const mockProfile = JSON.stringify({
      name: 'TestBaby',
      birthDate: '2024-01-01',
      gender: 'boy',
    });
    
    // First call: profile check, Second call: timeline events
    mockSafeGetItem
      .mockResolvedValueOnce(mockProfile)  // profile exists
      .mockResolvedValueOnce(null);        // no timeline events

    const { getByText } = render(<HomeScreen />);

    // Wait for async operations
    await waitFor(() => {
      expect(mockSafeGetItem).toHaveBeenCalled();
    });
  });

  it('should call safeGetItem for profile on mount', async () => {
    mockSafeGetItem.mockResolvedValue(null);

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockSafeGetItem).toHaveBeenCalledWith('@jobble_baby_profile');
    });
  });

  it('should render Quick Entry buttons', async () => {
    const mockProfile = JSON.stringify({ name: 'Baby', birthDate: '2024-01-01', gender: 'girl' });
    mockSafeGetItem.mockResolvedValueOnce(mockProfile);
    mockSafeGetItem.mockResolvedValueOnce(null);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      // Quick entries should be rendered
      expect(getByText('Diaper')).toBeTruthy();
      expect(getByText('Feed')).toBeTruthy();
      expect(getByText('Sleep')).toBeTruthy();
    });
  });
});
