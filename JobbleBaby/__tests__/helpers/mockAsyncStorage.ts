/**
 * Mock AsyncStorage Factory
 * 每個測試套件使用獨立的 mock storage 實例
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MockStorage {
  store: Record<string, string>;
  clear: () => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
  multiSet: (pairs: [string, string][]) => Promise<void>;
}

export function createMockStorage(): MockStorage {
  const store: Record<string, string> = {};

  return {
    store,
    clear: async () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    getItem: async (key: string) => {
      return store[key] ?? null;
    },
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: async (key: string) => {
      delete store[key];
    },
    getAllKeys: async () => Object.keys(store),
    multiGet: async (keys: string[]) =>
      keys.map((key) => [key, store[key] ?? null]),
    multiSet: async (pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        store[key] = value;
      });
    },
  };
}

// 全局單例 mock storage
let globalMockStorage: MockStorage | null = null;

export function getMockAsyncStorage(): MockStorage {
  if (!globalMockStorage) {
    globalMockStorage = createMockStorage();
  }
  return globalMockStorage;
}

export function resetMockAsyncStorage(): void {
  if (globalMockStorage) {
    globalMockStorage.clear();
  }
}

// 用於 jest.mock 的工廠函數
export const mockAsyncStorageFactory = () => {
  const mock = createMockStorage();
  return {
    default: mock,
    ...mock,
  };
};
