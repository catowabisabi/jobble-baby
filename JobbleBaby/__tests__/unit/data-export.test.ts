/**
 * B. 單元測試 — Data Export/Backup Utility
 *
 * 測試 app/utils/data-export.ts 的備份/還原功能
 * 使用 mock AsyncStorage，不依賴真實存儲
 *
 * 注意：expo-document-picker 和 expo-sharing 已在 __tests__/setup.ts 中 mock
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';
import {
  exportAllData,
  importData,
  pickBackupFile,
  isSharingAvailable,
} from '../../app/utils/data-export';
import { STORAGE_KEYS } from '../../store/storage-keys';
import { getDocumentAsync } from 'expo-document-picker';

const mockGetDocumentAsync = getDocumentAsync as jest.MockedFunction<typeof getDocumentAsync>;
const MockSharing = require('expo-sharing');

describe('DataExport — exportAllData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('should return ExportResult with filename and content', async () => {
    const result = await exportAllData();
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('content');
    expect(typeof result.filename).toBe('string');
    expect(typeof result.content).toBe('string');
  });

  it('should include metadata in export payload', async () => {
    const result = await exportAllData();
    const payload = JSON.parse(result.content);
    expect(payload.version).toBe('1.0');
    expect(payload.app).toBe('JobbleBaby');
    expect(payload.exportedAt).toBeTruthy();
    expect(payload.data).toBeDefined();
  });

  it('should export stored data as JSON', async () => {
    await AsyncStorage.setItem('@jobble/theme', 'dark');
    await AsyncStorage.setItem(STORAGE_KEYS.BABY_BIRTHDATE, '2026-01-15');

    const result = await exportAllData();
    const payload = JSON.parse(result.content);

    expect(payload.data['@jobble/theme']).toBe('dark');
    expect(payload.data[STORAGE_KEYS.BABY_BIRTHDATE]).toBe('2026-01-15');
  });

  it('should include additional non-STORAGE_KEYS keys', async () => {
    await AsyncStorage.setItem('@jobble/badges', '["badge1"]');
    const result = await exportAllData();
    const payload = JSON.parse(result.content);
    expect(payload.data['@jobble/badges']).toEqual(['badge1']);
  });

  it('should handle non-JSON string values', async () => {
    await AsyncStorage.setItem('@jobble/language', 'en');
    const result = await exportAllData();
    const payload = JSON.parse(result.content);
    expect(payload.data['@jobble/language']).toBe('en');
  });

  it('should skip null/missing keys', async () => {
    const result = await exportAllData();
    const payload = JSON.parse(result.content);
    // Non-existent keys should not appear in data (undefined keys are skipped by JSON.stringify)
    expect(Array.isArray(payload.data)).toBe(false);
  });

  it('should use date-stamped filename', async () => {
    const result = await exportAllData();
    expect(result.filename).toMatch(/^jobblebaby-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('DataExport — importData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it('should return success=false for invalid JSON', async () => {
    const result = await importData('not-valid-json{');
    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors).toContain('Invalid JSON format');
  });

  it('should return success=false when missing exportedAt', async () => {
    const result = await importData(JSON.stringify({ app: 'JobbleBaby', data: {} }));
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Missing backup metadata');
  });

  it('should return success=false for wrong app name', async () => {
    const result = await importData(
      JSON.stringify({ exportedAt: '2026-01-01', app: 'OtherApp', data: {} })
    );
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Not a valid JobbleBaby backup');
  });

  it('should return success=false for missing data object', async () => {
    const result = await importData(
      JSON.stringify({ exportedAt: '2026-01-01', app: 'JobbleBaby' })
    );
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid backup data structure');
  });

  it('should import valid backup data into storage', async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'JobbleBaby',
      version: '1.0',
      data: {
        '@jobble/theme': 'dark',
        [STORAGE_KEYS.BABY_BIRTHDATE]: '2026-01-15',
      },
    };
    await importData(JSON.stringify(backup));

    const stored = await AsyncStorage.getItem('@jobble/theme');
    expect(stored).toBe('dark');
  });

  it('should handle non-JSON string values during import', async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'JobbleBaby',
      data: {
        '@jobble/theme': 'dark',
      },
    };
    await importData(JSON.stringify(backup));
    const stored = await AsyncStorage.getItem('@jobble/theme');
    expect(stored).toBe('dark');
  });

  it('should handle numeric values in backup', async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'JobbleBaby',
      data: {
        '@jobble/log_count': 42,
      },
    };
    await importData(JSON.stringify(backup));
    const stored = await AsyncStorage.getItem('@jobble/log_count');
    expect(stored).toBe('42');
  });

  it('should skip keys not in ALL_KEYS', async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: 'JobbleBaby',
      data: {
        '@unknown/random_key': 'should_be_ignored',
      },
    };
    await importData(JSON.stringify(backup));
    const stored = await AsyncStorage.getItem('@unknown/random_key');
    // Keys not in ALL_KEYS list should be skipped
    expect(stored).toBeNull();
  });
});

describe('DataExport — pickBackupFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when user cancels document picker', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: [] });
    const result = await pickBackupFile();
    expect(result).toBeNull();
  });

  it('should return null on document picker error', async () => {
    mockGetDocumentAsync.mockRejectedValueOnce(new Error('Permission denied'));
    const result = await pickBackupFile();
    expect(result).toBeNull();
  });

  it('should return content and filename when file is selected', async () => {
    const fakeContent = JSON.stringify({
      exportedAt: new Date().toISOString(),
      app: 'JobbleBaby',
      data: {},
    });
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/backup.json', name: 'backup.json' }],
    });

    // Mock fetch to return the file content
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValueOnce({
      text: jest.fn().mockResolvedValueOnce(fakeContent),
    });

    const result = await pickBackupFile();
    expect(result).not.toBeNull();
    expect(result!.filename).toBe('backup.json');
    expect(result!.content).toBe(fakeContent);

    global.fetch = originalFetch;
  });

  it('should return null when file content is empty', async () => {
    mockGetDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/empty.json', name: 'empty.json' }],
    });

    global.fetch = jest.fn().mockResolvedValueOnce({
      text: jest.fn().mockResolvedValueOnce('   '),
    });

    const result = await pickBackupFile();
    expect(result).toBeNull();
  });
});

describe('DataExport — isSharingAvailable', () => {
  it('should return true on non-iOS platforms', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

    const result = await isSharingAvailable();
    expect(result).toBe(true);

    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });

  it('should check Sharing.isAvailableAsync on iOS', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    await isSharingAvailable();
    expect(MockSharing.isAvailableAsync).toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
  });
});
