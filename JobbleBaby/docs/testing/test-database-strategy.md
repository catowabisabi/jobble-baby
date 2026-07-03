# 測試資料庫策略 (Test Database Strategy)

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立
> 最後更新: 2026-07-03

## 項目資料庫架構

Jobble Baby 是 **React Native Expo 純客戶端應用**，**無後端伺服器**。

```
┌─────────────────────────────────────────┐
│           Jobble Baby App                │
│  (React Native / Expo — no backend)     │
├─────────────────────────────────────────┤
│  Data Layer: AsyncStorage               │
│  - All data stored locally on device     │
│  - No server, no database server        │
│  - No API calls to backend              │
└─────────────────────────────────────────┘
```

## 數據隔離策略

### AsyncStorage（本地儲存）

Jobble Baby 使用 `@react-native-async-storage/async-storage` 儲存所有數據：

| 數據類型 | Storage Key Pattern | 示例 |
|----------|---------------------|------|
| 寶寶 Profile | `@jobble/BABY_*` | `@jobble/BABY_PROFILE` |
| 餵養記錄 | `@jobble/FEEDING_ENTRIES` | `@jobble/BOTTLE_FEEDING_ENTRIES` |
| 睡眠記錄 | `@jobble/SLEEP_*` | `@jobble/SLEEP_SESSIONS` |
| 生長數據 | `@jobble/GROWTH_*` | `@jobble/WEIGHT_RECORD` |
| 發展追蹤 | `@jobble/MILESTONE_*` | `@jobble/MILESTONE_ENTRIES` |
| 設置 | `@jobble/SETTINGS_*` | `@jobble/SETTINGS_LANG` |

Storage Keys 定義於：`store/storage-keys.ts`（213 keys）

### 測試隔離方式

#### 單元測試 (Unit Tests)
- **隔離方式：** `AsyncStorage.clear()` 在每個 test `beforeEach` 執行
- **Mock:** `jest.mock('@react-native-async-storage/async-storage')` 在 `__tests__/setup.ts`
- **DB 影響：** 無真實寫入，所有操作為 mock

```typescript
// __tests__/setup.ts
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
```

#### Mocked 組件測試 (Mocked Component Tests)
- **隔離方式：** `AsyncStorage.clear()` + `jest.clearAllMocks()` 在每個 describe `beforeEach` 執行
- **Mock:** 完整的 AsyncStorage mock，每次測試後清理
- **DB 影響：** 無真實寫入

```typescript
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
```

#### 非模擬測試 (Mode B) — ⚠️ 未實現
- **目標隔離方式：** 使用獨立 test AsyncStorage instance
- Expo/React Native 不支援多 AsyncStorage instance
- **建議方案：** 使用 `__esModule` mock 並在 `beforeAll` seed 已知資料

### 外部依賴 Mock 策略

| 依賴 | Mock 位置 | 覆蓋 |
|------|-----------|------|
| `@react-native-async-storage/async-storage` | `__tests__/setup.ts` | ✅ 完全 mock |
| `expo-document-picker` | `__tests__/setup.ts` | ✅ 完全 mock |
| `expo-sharing` | `__tests__/setup.ts` | ✅ 完全 mock |
| `expo-localization` | `__tests__/helpers/render-with-providers.tsx` | ✅ mock i18n |
| `i18n` | `__tests__/helpers/render-with-providers.tsx` | ✅ mock translation |
| `expo-router` | `jest.mock('expo-router', ...)` | ✅ mock navigation |

### SafeStorage 封裝

所有 AsyncStorage 操作通過 `app/utils/SafeStorage.ts` 封裝：

```typescript
// SafeStorage 提供錯誤處理
safeGetItem(key) → Promise<string | null>
safeSetItem(key, value) → Promise<boolean>
safeRemoveItem(key) → Promise<boolean>
```

測試覆蓋：`__tests__/unit/safe-storage.test.ts`（11 tests, 11/11 PASS）

## 數據 Export/Import 測試策略

數據導出功能測試位於 `__tests__/unit/data-export.test.ts`（21 tests）。

### 測試隔離
- `expo-document-picker` 和 `expo-sharing` 完全 mock
- 不進行真實文件系統操作
- 測試 JSON 解析、metadata 驗證、key 過濾邏輯

### 風險
- 未測試大文件場景（1000+ entries）
- 未測試跨設備 import 兼容性

## 不適用的測試層級

由於 **無後端伺服器**，以下層級不適用：

| 層級 | 名稱 | 原因 |
|------|------|------|
| C | 後端 API 整合測試 | 無後端 API |
| G | 外部 API/Provider/Agent 測試 | 無外部 API 依賴 |

## 數據測試最佳實踐

### Do ✅
- 每個 describe block 前執行 `AsyncStorage.clear()`
- 使用 `jest.clearAllMocks()` 隔離 mock 調用
- 在 `beforeAll` seed 已知測試資料
- 測試後驗證關鍵 storage key 的值

### Don't ❌
- 不要依賴上一個 test 的數據狀態
- 不要假設特定 key 存在（除非該 test 明確創建了它）
- 不要進行真實網絡請求（無後端）
- 不要在多個 test suite 間共享 AsyncStorage 狀態

## 測試報告中的 DB 狀態

當前的 smoke test 和 mocked test 不涉及真實 DB 操作。如未來實現 Mode B 測試，應記錄：

```markdown
## Database State

| Table/Key | Before | After | Notes |
|-----------|--------|-------|-------|
| @jobble/BABY_PROFILE | null | {...} | Created in setup |
| @jobble/BOTTLE_FEEDING_ENTRIES | [] | [ {...} ] | 1 entry added |
```

## 缺口與改進

1. **Mode B 測試未實現** — 需要真實 AsyncStorage 渲染測試
2. **大數據場景未測試** — 1000+ entries 的 export/import
3. **跨語言數據遷移未測試** — en ↔ zh 的數據完整性
4. **並發寫入未測試** — 多個快速操作時的數據一致性

---

*此文件定義了 Jobble Baby 的測試隔離策略。由於是純客戶端應用，傳統的「測試資料庫」概念替換為「AsyncStorage mock 隔離策略」。*
