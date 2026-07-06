# 後端單元測試 (Backend Unit Tests) 詳情

> 目的：測試純邏輯函數，不依賴 UI 或 AsyncStorage（已 mock）

## 運行方式

```bash
cd JobbleBaby
npm run test:unit
```

## 測試覆蓋範圍

### 1. SafeStorage (`app/utils/SafeStorage.ts`)

| 函數 | 測試案例 |
|------|---------|
| `safeGetItem` | 正常讀取、key 不存在返回 null、異常時返回 null |
| `safeSetItem` | 正常寫入、異常時返回 false、覆蓋已有值 |
| `safeRemoveItem` | 正常刪除、key 不存在返回 true、異常時返回 false |

### 2. Storage Keys (`store/storage-keys.ts`)

| 測試案例 | 期望 |
|---------|------|
| 總 key 數量 | ≥ 220 |
| 所有 key 前綴 | `@jobble/` |
| 無重複 value | true |
| 核心 keys 存在 | BABY_BIRTHDATE, ALLERGEN_LOG, GROWTH_ENTRIES 等 |
| 餵養相關 keys | BOTTLE_SESSION, FEEDING_READINESS 等 |
| 發育相關 keys | MILESTONE_ENTRIES, REFLEX_ENTRIES 等 |
| 壓力/照顧者 keys | STRESS_LOG, CAREGIVER_SURVEY 等 |

### 3. i18n (`app/i18n/en.json`, `zh.json`)

| 測試案例 | 期望 |
|---------|------|
| 兩種語言文件存在 | en.json, zh.json |
| zh.json 包含所有 en.json keys | 完全覆蓋 |
| 有 tabs 翻譯 | ≥ 16 tabs |
| 有 home 翻譯 | 存在 |
| 有 common/action 翻譯 | 存在 |
| 總 key 數量 | ≥ 100 |
| 有 SOS/emergency 翻譯 | 存在 |

### 4. Theme (`app/theme.ts`)

| 測試案例 | 期望 |
|---------|------|
| light + dark 雙主題 | 存在 |
| 必要顏色屬性 | background, surface, primary, text, error 等 |
| 十六進制格式 | #FFFFFF 或 #FFF |
| 背景/表面不同色 | background ≠ surface |
| error 紅色系 | 包含紅色分量 |

## Mock 策略

```typescript
// __tests__/setup.ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

所有 AsyncStorage 操作使用 Jest mock，不觸碰真實文件系統。

## 失敗處理

1. **SafeStorage mock 失效** → 檢查 `__tests__/setup.ts` 中的 mock 配置
2. **i18n key 不匹配** → 運行 `node scripts/pre-submission-audit.js`
3. **TypeScript 類型錯誤** → 本地運行 `npx tsc --noEmit`
