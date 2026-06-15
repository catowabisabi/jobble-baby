/**
 * SafeStorage - AsyncStorage wrapper with consistent error handling.
 *
 * All AsyncStorage calls are wrapped with try-catch to prevent silent crashes.
 * On error: logs warning, returns safe defaults (null for get, false for set/remove).
 *
 * Usage:
 *   import { safeGetItem, safeSetItem, safeRemoveItem } from '@/app/utils/SafeStorage';
 *
 *   const value = await safeGetItem('@jobble/key');
 *   const success = await safeSetItem('@jobble/key', 'value');
 *   const removed = await safeRemoveItem('@jobble/key');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Safely get an item from AsyncStorage.
 * @param key - Storage key
 * @returns The stored value as string, or null if not found or on error
 */
export async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[SafeStorage] Failed to getItem("${key}"):`, error);
    return null;
  }
}

/**
 * Safely set an item in AsyncStorage.
 * @param key - Storage key
 * @param value - Value to store (will be stringified if object)
 * @returns true on success, false on error
 */
export async function safeSetItem(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to setItem("${key}"):`, error);
    return false;
  }
}

/**
 * Safely remove an item from AsyncStorage.
 * @param key - Storage key
 * @returns true on success, false on error
 */
export async function safeRemoveItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to removeItem("${key}"):`, error);
    return false;
  }
}
