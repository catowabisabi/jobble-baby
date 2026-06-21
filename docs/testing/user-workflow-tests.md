# 用戶流程 E2E 測試 (User Workflow E2E Tests) 詳情

> 目的：用真實用戶角度走完整流程，使用 Detox 測試原生移動應用

## 運行方式

```bash
cd JobbleBaby

# iOS (需要 Mac + Xcode)
npm run test:e2e

# Android
npm run test:e2e:android
```

## 前置條件

### iOS
1. Xcode 已安裝
2. iOS Simulator 已啟動：`xcrun simctl boot "iPhone 15"`
3. App 已構建：`eas build --platform ios --profile preview`

### Android
1. Android SDK 已配置
2. Emulator 已啟動
3. App 已構建：`eas build --platform android --profile preview`

## 核心用戶流程

### 流程 1：首次開啟 → Onboarding → Home

```
[App Launch]
    ↓
[無 Profile?] → YES → [Onboarding Screen]
    ↓ NO
[Home Screen]
```

**測試步驟：**
1. 清除 App 數據
2. 啟動 App
3. 驗證 Onboarding 出現
4. 輸入寶寶名字
5. 選擇出生日期
6. 點擊 Continue
7. 驗證進入 Home Screen

### 流程 2：添加 Quick Entry

**測試步驟：**
1. 在 Home Screen 點擊 Diaper 按鈕
2. 選擇尿布類型（濕/髒）
3. 保存
4. 驗證 Timeline 出現新記錄
5. 點擊 Feed 按鈕
6. 選擇餵奶類型
7. 保存
8. 驗證 Timeline

### 流程 3：Tab 導航

**測試步驟：**
1. 驗證底部 Tab Bar 可見
2. 點擊每個 Tab 驗證切換
3. 驗證內容正確

### 流程 4：SOS 緊急功能

**測試步驟：**
1. 長按 SOS 按鈕（800ms+）
2. 驗證 Modal 出現
3. 驗證緊急聯繫人可見
4. 關閉 Modal

### 流程 5：數據持久化

**測試步驟：**
1. 添加記錄
2. 重啟 App
3. 驗證記錄仍在

## Detox 配置

### .detoxrc.js

```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: '__tests__/e2e/jest.config.js',
  artifacts: false,
  apps: {
    ios: {
      type: 'ios.app',
      binaryPath: '...',
      build:
        'eas build --platform ios --profile preview',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      bootTimeout: 60000,
    },
  },
};
```

## E2E 元素定位

使用 `by.text`, `by.id`, `by.label` 定位元素：

```typescript
// 優先使用 accessibilityLabel
await element(by.id('babyNameInput')).typeText('TestBaby');

// 文本定位
await element(by.text('Continue')).tap();

// 多個匹配時使用 first()
await element(by.text('OK')).atIndex(0).tap();
```

## 失敗處理

1. **Element not found** → 檢查元素是否有 `testID` 或文本
2. **App crash** → 查看 device logs: `device.getSystemLogs()`
3. **Timeout** → 增加 `waitFor` timeout 或檢查網絡
4. **Build failed** → 本地運行 `eas build` 查看錯誤
