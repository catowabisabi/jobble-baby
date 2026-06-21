/**
 * B. 單元測試 — SafeStorage
 * 
 * 測試 SafeStorage.ts 的安全封裝函數
 * 使用 mock AsyncStorage，不依賴真實存儲
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../../app/utils/SafeStorage';

// 直接重新實現測試版本的 SafeStorage 邏輯用於對比
// 實際代碼邏輯：
// safeGetItem: try { return await AsyncStorage.getItem(key) } catch { return null }
// safeSetItem: try { await AsyncStorage.setItem(key, value); return true } catch { return false }
// safeRemoveItem: try { await AsyncStorage.removeItem(key); return true } catch { return false }

describe('SafeStorage', () => {
  beforeEach(async () => {
    // 清理每個測試前的存儲
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('safeGetItem', () => {
    it('should return null for non-existent key', async () => {
      const result = await safeGetItem('@jobble/non_existent_key');
      expect(result).toBeNull();
    });

    it('should return stored string value', async () => {
      await AsyncStorage.setItem('@jobble/test_key', 'test_value');
      const result = await safeGetItem('@jobble/test_key');
      expect(result).toBe('test_value');
    });

    it('should return null on AsyncStorage error', async () => {
      // Mock AsyncStorage to throw
      const originalGetItem = AsyncStorage.getItem;
      AsyncStorage.getItem = jest.fn().mockRejectedValueOnce(new Error('Storage error'));

      const result = await safeGetItem('@jobble/error_key');
      expect(result).toBeNull();

      AsyncStorage.getItem = originalGetItem;
    });
  });

  describe('safeSetItem', () => {
    it('should return true on success', async () => {
      const result = await safeSetItem('@jobble/new_key', 'new_value');
      expect(result).toBe(true);
    });

    it('should actually store the value', async () => {
      await safeSetItem('@jobble/persist_key', 'persist_value');
      const stored = await AsyncStorage.getItem('@jobble/persist_key');
      expect(stored).toBe('persist_value');
    });

    it('should return false on AsyncStorage error', async () => {
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValueOnce(new Error('Write error'));

      const result = await safeSetItem('@jobble/error_key', 'error_value');
      expect(result).toBe(false);

      AsyncStorage.setItem = originalSetItem;
    });

    it('should overwrite existing value', async () => {
      await safeSetItem('@jobble/overwrite_key', 'value1');
      await safeSetItem('@jobble/overwrite_key', 'value2');
      const result = await AsyncStorage.getItem('@jobble/overwrite_key');
      expect(result).toBe('value2');
    });
  });

  describe('safeRemoveItem', () => {
    it('should return true on success', async () => {
      await AsyncStorage.setItem('@jobble/to_remove', 'value');
      const result = await safeRemoveItem('@jobble/to_remove');
      expect(result).toBe(true);
    });

    it('should actually remove the value', async () => {
      await AsyncStorage.setItem('@jobble/to_remove', 'value');
      await safeRemoveItem('@jobble/to_remove');
      const stored = await AsyncStorage.getItem('@jobble/to_remove');
      expect(stored).toBeNull();
    });

    it('should return true even if key does not exist', async () => {
      const result = await safeRemoveItem('@jobble/non_existent');
      expect(result).toBe(true);
    });

    it('should return false on AsyncStorage error', async () => {
      const originalRemoveItem = AsyncStorage.removeItem;
      AsyncStorage.removeItem = jest.fn().mockRejectedValueOnce(new Error('Remove error'));

      const result = await safeRemoveItem('@jobble/error_key');
      expect(result).toBe(false);

      AsyncStorage.removeItem = originalRemoveItem;
    });
  });
});
