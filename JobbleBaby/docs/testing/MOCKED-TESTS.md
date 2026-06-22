# D. 前端 Mocked 測試 (Frontend Mocked Tests)

## 執行方式
```bash
npm run test:mocked
# 或: npm test -- --testPathPattern="__tests__/mocked"
```

## 測試套件

### ❌ HomeScreen.test.tsx (0/4 FAIL)

**所有測試都失敗：** `useTheme must be used within ThemeProvider`

HomeScreen 組件依賴 `useTheme()` hook，但測試直接 `<HomeScreen />` 而沒有包裝在 `<ThemeProvider>` 中。

```tsx
// ❌ 當前錯誤写法
const { getByTestId } = render(<HomeScreen />);

// ✅ 正確写法
const { getByTestId } = render(
  <ThemeProvider>
    <HomeScreen />
  </ThemeProvider>
);
```

## 修復步驟

### 1. 創建 `renderWithProviders` helper
在 `__tests__/helpers/` 中創建：

```tsx
// __tests__/helpers/render-with-providers.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../app/context/ThemeContext';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
}
```

### 2. 修復 SafeStorage mock
`HomeScreen.test.tsx` 的 mock 方式有問題：

```tsx
// ❌ 當前：從已經 mocked 的 module 再次 require
const mockSafeGetItem = require('../../app/utils/SafeStorage').safeGetItem;

// ✅ 正確：直接使用 jest.mock 的工廠函數返回值
// SafeStorage 被 jest.mock 工廠初始化為返回 jest.fn()
// 使用時應該這樣引用：
import { safeGetItem } from '../../app/utils/SafeStorage';
// 然後在測試中: (safeGetItem as jest.Mock).mockResolvedValueOnce(null)
```

### 3. 測試覆蓋建議

| 測試場景 | 期望行為 | 當前狀態 |
|----------|----------|----------|
| 無 profile → 加載完成 | 顯示 onboarding 引導 | ❌ Provider 缺失 |
| 有 profile → 加載完成 | 顯示主頁內容 | ❌ Provider 缺失 |
| profile 加載中 | 顯示 loading spinner | ❌ 未驗證 |
| 點擊 Quick Entry 按鈕 | 導航到對應頁面 | ❌ mock router 不完整 |
| API 錯誤時 | 顯示 error popup | ❌ 未測試 |

## Mock 現狀

| Mock 目標 | 狀態 | 備註 |
|-----------|------|------|
| `SafeStorage` | ⚠️ 部分 | `safeGetItem` mock 可以工作，但引用方式有誤 |
| `@expo/vector-icons` | ✅ | 簡單字符串 mock |
| `expo-router` | ⚠️ | `useRouter` mock 存在但不完整 |
| `AsyncStorage` | ⚠️ | 全局 clear，但可能干擾其他測試 |

## 測試文件位置
- `__tests__/mocked/HomeScreen.test.tsx` — 現有唯一 mocked 測試
- `app/(tabs)/index.tsx` — HomeScreen 組件（使用 `useTheme`, `useBabyProfile`, `useRouter`）

## 隔離原則
- 每個 `beforeEach`: `jest.clearAllMocks()` + `AsyncStorage.clear()`
- 不依賴真實 AsyncStorage 數據
- 不發送真實網絡請求
