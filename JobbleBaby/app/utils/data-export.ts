/**
 * Data Export/Backup Utility
 *
 * Exports all user data from AsyncStorage as a JSON file for backup,
 * and imports data from a backup JSON file.
 *
 * Export format:
 * {
 *   version: "1.0",
 *   exportedAt: ISO timestamp,
 *   app: "JobbleBaby",
 *   data: {
 *     [storageKey]: storedValue
 *   }
 * }
 */

import { Share, Platform } from 'react-native';
import { getDocumentAsync } from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { safeGetItem, safeSetItem } from './SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';

// Additional keys not in STORAGE_KEYS but used by the app
const ADDITIONAL_KEYS = [
  '@jobble_baby_profile',
  '@jobble/milk_stash',
  '@jobble/milk_timer',
  '@jobble/badges',
  '@jobble/log_count',
  '@jobble/streak',
  '@jobble/last_log_date',
  '@jobble/daycare_token',
  '@jobble/theme',
  '@jobble/language',
] as const;

const ALL_KEYS = [...Object.values(STORAGE_KEYS), ...ADDITIONAL_KEYS] as const;

export interface ExportResult {
  filename: string;
  content: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

/**
 * Export all user data as a JSON string with metadata
 */
export async function exportAllData(): Promise<ExportResult> {
  const exportData: Record<string, unknown> = {};

  for (const key of ALL_KEYS) {
    const raw = await safeGetItem(key);
    if (raw !== null) {
      try {
        exportData[key] = JSON.parse(raw);
      } catch {
        // Store as raw string if JSON parse fails
        exportData[key] = raw;
      }
    }
  }

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'JobbleBaby',
    data: exportData,
  };

  const content = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().split('T')[0];
  const filename = `jobblebaby-backup-${date}.json`;

  return { filename, content };
}

/**
 * Share the exported data using the native share dialog
 */
export async function shareExportedData(content: string, filename: string): Promise<void> {
  await Share.share({
    message: content,
    title: filename,
  });
}

/**
 * Import data from a backup JSON string
 */
export async function importData(jsonContent: string): Promise<ImportResult> {
  const errors: string[] = [];
  let imported = 0;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return { success: false, imported: 0, errors: ['Invalid JSON format'] };
  }

  // Validate metadata
  if (!parsed.exportedAt || !parsed.app) {
    return { success: false, imported: 0, errors: ['Missing backup metadata'] };
  }

  if (parsed.app !== 'JobbleBaby') {
    return { success: false, imported: 0, errors: ['Not a valid JobbleBaby backup'] };
  }

  const data = parsed.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    return { success: false, imported: 0, errors: ['Invalid backup data structure'] };
  }

  for (const key of ALL_KEYS) {
    if (data[key] != null) {
      try {
        const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
        const success = await safeSetItem(key, value);
        if (success) {
          imported++;
        } else {
          errors.push(`Failed to write: ${key}`);
        }
      } catch (e) {
        errors.push(`Error writing ${key}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

/**
 * Pick a JSON backup file and return its content
 */
export async function pickBackupFile(): Promise<{ content: string; filename: string } | null> {
  try {
    const result = await getDocumentAsync({
      type: ['public.json', 'public.data'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const uri = asset.uri;

    // Read file content using fetch
    const response = await fetch(uri);
    const content = await response.text();

    if (!content.trim()) {
      return null;
    }

    const filename = asset.name || 'backup.json';
    return { content, filename };
  } catch {
    return null;
  }
}

/**
 * Check if sharing is available (for iOS)
 */
export async function isSharingAvailable(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    return await Sharing.isAvailableAsync();
  }
  return true;
}
