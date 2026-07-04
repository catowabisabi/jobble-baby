# E. 前端非模擬測試 — Mode B (Non-Mocked Tests)

> **目的：** 啟動真實 Expo 環境 + real AsyncStorage，測試 Navigation Flow、Screen 間數據傳遞、Deep Link 處理
>
> **狀態：** ❌ 未建立 — 0 tests — CRITICAL GAP

## 概述

Mode B 測試區別於 Mocked (D) 測試的關鍵：
- Mocked: Jest + RTL + mocked AsyncStorage，純組件單元測試
- Mode B: Expo Test Runner + real AsyncStorage in-memory，測試 Navigation 鏈 + Storage 持久化

## 為何需要 Mode B

當前面臨的風險：
1. **Navigation 斷裂：** 69 個 screen 沒有任何測試。Mocked 測試只測單一組件，Navigation 跳轉鏈完全未知。
2. **AsyncStorage 持久化：** Mocked 測試用 mock，無法驗證真實 AsyncStorage 的序列化/反序列化問題。
3. **Deep Link：** Expo Router 的 deep link 行為在 mocked 環境無法測試。

## 目標測試場景

### 1. Onboarding → Home 完整 Flow

```
OnboardingScreen 
  → BabyProfileSetup 
  → HomeScreen
```

要驗證：
- [ ] Onboarding 完成後，`@jobble_baby_profile` 正確寫入
- [ ] `hasCompletedOnboarding` flag 正確設定
- [ ] HomeScreen 根據 profile 顯示正確月齡

### 2. Tab Navigation Flow

```
HomeScreen 
  → Tracking Tab 
  → Add Entry 
  → Save → Back
```

要驗證：
- [ ] Tab 切換不丟失 context
- [ ] 新增 entry 寫入 AsyncStorage
- [ ] 返回 HomeScreen 後數據仍在

### 3. Deep Link 處理

要驗證：
- [ ] `jobblebaby://tracking/123` 正確開啟對應 screen
- [ ] `jobblebaby://profile/edit` 正確開啟 profile 編輯

### 4. Screen 間數據傳遞

要驗證：
- [ ] `FeedingTimerScreen` 的計時結果正確傳給 `BottleFeedingScreen`
- [ ] `OnboardingScreen` 的 profile 正確傳給所有需要月齡的 screen

## 技術方案

### 工具：`npx expo test`

Expo 提供 `expo test` CLI，運行 `app.test.tsx` 文件。與 Jest 不同，Expo Test Runner 真正加載 Expo 環境。

```typescript
// app.test.tsx 示例
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

describe('Mode B: Navigation + Real Storage', () => {
  beforeEach(() => {
    // 清理 in-memory AsyncStorage
    require('@react-native-async-storage/async-storage').clear();
  });

  it('should persist baby profile after onboarding', async () => {
    const router = require('expo-router').useRouter();
    
    // 導航到 onboarding
    router.push('/onboarding');
    
    // 填寫表單
    const nameInput = await waitFor(() => document.getElementById('baby-name'));
    fireEvent.changeText(nameInput, 'TestBaby');
    
    const saveBtn = await waitFor(() => document.getElementById('save-profile'));
    fireEvent.press(saveBtn);
    
    // 驗證寫入
    const storage = require('@react-native-async-storage/async-storage');
    const profile = await storage.getItem('@jobble_baby_profile');
    expect(JSON.parse(profile).name).toBe('TestBaby');
    
    // 驗證導航到 Home
    expect(router.push).toHaveBeenCalledWith('/');
  });
});
```

## 命令

```bash
cd JobbleBaby
npx expo test
```

## 輸出

```
runtime/logs/tests/<timestamp>/
├── mode-b-report.md
├── navigation-trace.json
├── storage-snapshots/
└── screenshots/
```

## 實現步驟

1. [ ] 建立 `app.test.tsx` 入口文件
2. [ ] 建立 Mode B helper functions (real AsyncStorage)
3. [ ] 實現 Onboarding → Home flow 測試
4. [ ] 實現 Tab Navigation 測試
5. [ ] 實現 Deep Link 測試
6. [ ] 整合進 `npm run test:all`

## 失敗處理

如果 Mode B 測試失敗：
1. **AsyncStorage 錯誤** → 檢查 `jest.setup.ts` 是否正確 mock，Mode B 應該使用 real AsyncStorage
2. **Navigation 錯誤** → 檢查 Expo Router 版本兼容性
3. **Deep Link 不工作** → 檢查 `app.json` linking 配置

## 負責人

此 GAP 需要新的 Expo Test Runner 實現。現有 Jest 環境無法完整模擬 Expo 環境。
