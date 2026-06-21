# 測試數據庫策略 (Test Database Strategy)

> Jobble Baby 使用 AsyncStorage 作為主要數據存儲，本文件定義測試隔離策略

## 概述

Jobble Baby 是一款純客戶端移動應用，**無後端服務器**。所有數據存儲在設備本地：

- **主要存儲：** AsyncStorage (60+ keys)
- **安全存儲：** expo-secure-store (敏感信息)
- **文件系統：** expo-file-system (照片等)

## 測試隔離策略

### 1. Mock AsyncStorage

所有單元測試和組件測試使用 Jest mock：

```typescript
// jest/setup.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

**優點：** 測試運行快速，不依賴設備
**缺點：** 不完全模擬真實 AsyncStorage 行為

### 2. Mock 工廠函數

每個測試套件使用獨立 mock 實例：

```typescript
// __tests__/helpers/mockAsyncStorage.ts
export function createMockStorage(): MockStorage {
  const store: Record<string, string> = {};
  return {
    store,
    clear: async () => { Object.keys(store).forEach(k => delete store[k]); },
    getItem: async (key) => store[key] ?? null,
    setItem: async (key, value) => { store[key] = value; },
    removeItem: async (key) => { delete store[key]; },
    // ...
  };
}
```

### 3. 測試前/後清理

```typescript
beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(async () => {
  await AsyncStorage.clear();
});
```

## E2E 測試策略

### Detox E2E

E2E 測試在真實設備/模擬器上運行：

```typescript
beforeAll(async () => {
  await device.launchApp();
  await device.clearKeychain(); // 清理敏感數據
});

afterAll(async () => {
  await device.terminateApp();
});

beforeEach(async () => {
  await device.reloadReactNative(); // 重置 App 狀態
});
```

### 測試用戶數據隔離

```typescript
// E2E 測試前準備測試數據
async function setupTestProfile() {
  await AsyncStorage.setItem('@jobble_baby_profile', JSON.stringify({
    name: 'TestBaby_E2E',
    birthDate: '2024-01-01',
    gender: 'boy',
  }));
}

// 每個 E2E 測試後清理
async function cleanupTestData() {
  const keys = await AsyncStorage.getAllKeys();
  const testKeys = keys.filter(k => k.includes('test') || k.includes('e2e'));
  await AsyncStorage.multiRemove(testKeys);
}
```

## Storage Key 測試映射

| Storage Key | 測試類型 | Mock 策略 |
|-------------|---------|----------|
| `@jobble_baby_profile` | Unit + E2E | Mock + Real |
| `@jobble/allergen_log` | Unit | Mock |
| `@jobble/growth_entries` | Unit | Mock |
| `@jobble/sleep_entries` | Unit + E2E | Mock + Real |
| `@jobble/tracking_entries` | Unit + E2E | Mock + Real |

## 測試數據示例

### Profile 數據

```typescript
const TEST_PROFILE = {
  name: 'TestBaby',
  birthDate: '2024-01-01',
  gender: 'boy' as const,
  gestationalAge: 40,
};
```

### Tracking Entry

```typescript
const TEST_ENTRY = {
  id: 'test-entry-001',
  type: 'diaper',
  subtype: 'wet',
  timestamp: new Date().toISOString(),
  notes: 'Test entry',
};
```

## 失敗時保留數據

測試失敗時，保存 snapshot 到 `runtime/logs/tests/<timestamp>/`：

```typescript
async function saveSnapshotOnFailure(testName: string, storage: MockStorage) {
  if (currentTestFailed()) {
    const snapshot = {
      testName,
      storage: storage.store,
      timestamp: new Date().toISOString(),
    };
    const dir = getTimestampDir('runtime/logs/tests');
    fs.writeFileSync(path.join(dir, `${testName}-snapshot.json`), JSON.stringify(snapshot));
  }
}
```

## CI 環境

GitHub Actions 中的測試隔離：

```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: npm test -- --coverage
  
- name: Run E2E tests
  run: |
    detox build --configuration ios.simulator
    detox test --configuration ios.simulator
  env:
    EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```
