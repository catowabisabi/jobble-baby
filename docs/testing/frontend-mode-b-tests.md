# 前端非模擬測試 (Frontend Non-Mocked / Mode B)

> 目的：使用 Expo 測試運行器 + mocked AsyncStorage，測試前後端整條鏈

## 概述

Mode B 測試是 Mocked 測試（D層）的進階版本。主要區別：

| 特性 | D. Mocked Tests | E. Mode B Tests |
|------|----------------|-----------------|
| AsyncStorage | Mock | Mock |
| React Native 組件 | Shallow render | Full render |
| Navigation | Mocked router | Real expo-router |
| Context Providers | Mocked | Real providers |
| 速度 | 快 | 中等 |
| 隔離性 | 高 | 中 |

## 運行方式

```bash
cd JobbleBaby
npx expo test
# 或
npm run test:mode-b
```

## 測試目標

### 1. 真實 Navigation 流程

測試 Tab 導航是否正確切換 screen：

```typescript
describe('Navigation Integration', () => {
  it('should navigate between tabs correctly', async () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    
    // 點擊 Tracking Tab
    const trackingTab = getByText('Tracking');
    fireEvent.press(trackingTab);
    
    // 確認路由變化
    await waitFor(() => {
      expect(useRouter().push).toHaveBeenCalledWith('/tracking');
    });
  });
});
```

### 2. Screen 之間數據傳遞

測試上一個 screen 的資料是否正確傳遞到下一個 screen：

```typescript
describe('Data Passing Between Screens', () => {
  it('should pass baby profile to tracking screen', async () => {
    // 設定 profile data
    await AsyncStorage.setItem('@jobble_baby_profile', JSON.stringify({
      name: 'TestBaby',
      birthDate: '2024-01-01',
    }));
    
    renderWithProviders(<TrackingScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('TestBaby')).toBeTruthy();
    });
  });
});
```

### 3. Deep Link 處理

測試 app 能否正確處理 deep link：

```typescript
describe('Deep Link Handling', () => {
  it('should handle jobblebaby://tracking/123', async () => {
    // Simulate deep link
    jest.mock('expo-linking', () => ({
      getInitialURL: jest.fn(() => Promise.resolve('jobblebaby://tracking/123')),
    }));
    
    // App should navigate to tracking entry 123
    await device.launchApp({ url: 'jobblebaby://tracking/123' });
    
    await expect(element(by.text('Entry #123'))).toBeVisible();
  });
});
```

### 4. 完整的用戶流程

測試從 Home → Tracking → Save → 返回 Home 的完整流程：

```typescript
describe('Full User Flow', () => {
  it('should complete tracking entry and return to home', async () => {
    // 1. Home Screen
    const { getByText } = renderWithProviders(<HomeScreen />);
    
    // 2. 點擊 Tracking Tab
    fireEvent.press(getByText('Tracking'));
    
    // 3. 添加記錄
    const addBtn = getById('addEntryBtn');
    fireEvent.press(addBtn);
    
    // 4. 選擇類型
    fireEvent.press(getByText('Diaper'));
    
    // 5. 保存
    fireEvent.press(getByText('Save'));
    
    // 6. 返回 Home
    fireEvent.press(getByText('Home'));
    
    // 7. 確認記錄出現在 timeline
    await waitFor(() => {
      expect(getByText('Diaper')).toBeTruthy();
    });
  });
});
```

## Mock 策略

Mode B 測試仍使用 AsyncStorage mock，但使用真實的 Context Providers：

```typescript
// Mode B 使用真實 providers，不是 mock
import { ThemeProvider } from '../../app/context/ThemeContext';
import { LanguageProvider } from '../../app/context/LanguageContext';

function renderModeB(ui: ReactElement) {
  return render(
    <LanguageProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </LanguageProvider>
  );
}
```

## 測試隔離

每個 Mode B 測試都會在 `beforeEach` 中清理 AsyncStorage：

```typescript
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
```

## 輸出位置

```
runtime/logs/tests/<timestamp>/
├── mode-b-report.md
├── console.log
├── navigation-trace.json
└── screenshots/
```

## 失敗處理

如果 Mode B 測試失敗：

1. **Navigation 錯誤** → 檢查 `expo-router` 是否正確 mock
2. **AsyncStorage 資料不存在** → 確認 `beforeEach` 有調用 `clear()`
3. **Provider 錯誤** → 檢查 `renderModeB` wrapper 是否完整

## 創建新的 Mode B 測試

```bash
# 在 __tests__/mode-b/ 目錄下創建
touch __tests__/mode-b/TrackingScreen.test.tsx
```

---

*最後更新：2026-06-22*
