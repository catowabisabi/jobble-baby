# F. 用戶流程 E2E 測試 (Detox)

## 狀態：❌ Detox 已安装但未配置，無 E2E 測試文件

## 工具
- **Detox** (`detox@20.0.0`) — 已在 `devDependencies` 中
- **Jest** — Detox 使用 Jest 作為 test runner

## 現況
- `detox` 已添加到 `package.json` devDependencies
- `jest.config.js` 的 `testPathIgnorePatterns` 將 `__tests__/e2e/` 排除
- `__tests__/e2e/` 目錄存在但無測試文件
- `__tests__/e2e/` 內有 `.detoxrc` 或 `detox.config.js` 配置嗎？需要檢查

## 建議優先流程（按重要性）

### P0 — 核心用戶流程
1. **Onboarding 流程**: App 啟動 → 選擇語言 → 輸入寶寶生日/性別 → 到達首頁
2. **首頁加載**: 有 profile → 顯示 Quick Entry 按鈕
3. **記錄一條 feeding entry**: Quick Entry → Feed → 選擇類型 → 保存 → 驗證出現在 timeline

### P1 — 重要流程
4. **Sleep 記錄**: Quick Entry → Sleep → 保存
5. **Diaper 記錄**: Quick Entry → Diaper → 保存
6. **查看 Timeline**: 首頁 → scroll timeline → 驗證 entry 順序

### P2 — 邊緣情況
7. **Offline 工作**: 關閉網絡 → 記錄 → 重連 → 數據同步
8. **Session 恢復**: App 被 kill → 重啟 → profile 仍然存在

## Detox 配置要點

### `.detoxrc.js` (或 `detox.config.js`)
```js
module.exports = {
  test: {
    runner: 'jest',
    config: 'e2e/jest.config.js',
    specifications: ['e2e/specs/**/*.spec.ts'],
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      binaryPath: 'ios/build/Build/Products/*-iphonesimulator/*.app',
    },
    android: {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    }
  }
};
```

### 隔離原則
- E2E 測試使用專門的 test environment（獨立的 bundle ID/package name）
- 每個 test 前清理 app data：`await device.launchApp({ delete: true })`
- 不要依賴 previous test 的狀態

## 執行方式（目標）
```bash
# iOS
npm run test:e2e:ios

# Android
npm run test:e2e:android

# 全部
npm run test:e2e
```

## 風險
- Detox 需要 native build（`expo run:ios` / `expo run:android`）
- CI 環境需要 macOS + Xcode 或 Android SDK
- 不適合在 Linux CI 環境運行（只能 smoke test level）
