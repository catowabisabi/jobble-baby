# Jobble Baby 測試體系

> 最後更新：2026-07-02 (Cycle 596)

## 📋 項目概覽

| 項目 | 技術 |
|------|------|
| 框架 | Expo SDK 56 / React Native 0.85.3 |
| 語言 | TypeScript 5.3 (strict) |
| 導航 | Expo Router (file-based) |
| 數據層 | React Context + AsyncStorage (60+ keys) |
| 圖表 | React Native SVG |
| i18n | react-i18next (en.json + zh.json) |
| 構建 | EAS Build + Expo prebuild |
| 測試框架 | Jest + React Native Testing Library + Detox |

**重要：此項目為純客戶端移動應用，無後端服務器。所有數據存儲在設備本地 AsyncStorage 中。**

---

## 🏗️ 測試架構

```
JobbleBaby/__tests__/
├── smoke/           # A. 煙霧測試 — 基本啟動確認
├── unit/            # B. 單元測試 — 純邏輯函數
├── mocked/          # D. 前端 Mocked 測試 — mocked AsyncStorage
├── e2e/             # F. E2E 用戶流程測試 (Detox)
└── a11y/            # J. 無障礙/UX 測試

docs/testing/        # 測試文檔
runtime/logs/tests/   # 測試報告輸出
```

---

## 📊 測試矩陣

| 層級 | 測試類型 | 工具 | 隔離 DB | 覆蓋範圍 |
|------|----------|------|---------|----------|
| A | 煙霧測試 | shell script + tsc | N/A | 7 tests — 7/7 ✅ |
| B | 單元測試 | Jest | mock | 52 tests — 52/52 ✅ |
| D | Mocked 組件測試 | Jest + RTL | mock AsyncStorage | 129 tests — 129/129 ✅ (+17 PolyvagalDashboard, Cycle 591) |
| H | 回歸測試 | Jest | mock | 26 tests — 26/26 ✅ |
| J | 無障礙測試 | jest-a11y + manual | N/A | 17 tests — 17/17 ✅ |
| F | E2E 流程測試 | Detox | N/A | Template (8 cases) ⚠️ BLOCKED |
| E | Non-Mocked Mode B | Expo + Jest | mock AsyncStorage | 0 tests ❌ GAP |
| I | 效能測試 | Detox | N/A | 0 tests ❌ GAP |

**不適用於此項目：**
- C (後端 API 整合測試) — 無後端
- G (外部 API 測試) — 無外部 API

**最新測試結果：Cycle 591 — 224 PASS (Jest) + 7 PASS (Smoke) = 231 PASS, 0 FAIL, 0 BLOCKED (runnable suite)**

---

## 🚀 快速開始

### 1. 安裝測試依賴

```bash
cd JobbleBaby
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo @types/jest detox
npx expo install jest
```

### 2. 運行所有測試

```bash
cd JobbleBaby
npm test                    # 單元 + mocked 測試
npm run test:smoke          # 煙霧測試
npm run test:e2e            # E2E 測試 (需 iOS/Android 模擬器)
npm run test:a11y           # 無障礙測試
npm run test:all            # 全部測試
```

### 3. 生成測試報告

```bash
npm run test:report         # 生成 report.md 到 runtime/logs/tests/
```

---

## 📁 關鍵文件

| 文件 | 描述 |
|------|------|
| `store/storage-keys.ts` | 60+ AsyncStorage key 定義 |
| `app/utils/SafeStorage.ts` | AsyncStorage 封裝 |
| `app/_layout.tsx` | 根佈局，決定首次啟動流程 |
| `app/(tabs)/index.tsx` | HomeScreen 主儀表板 |
| `app/screens/OnboardingScreen.tsx` | 首次啟動引導 |
| `app/i18n/en.json` + `zh.json` | 國際化字符串 |
| `.env.example` | 環境變量示例 |

---

## 🗄️ 測試數據庫策略

### 環境隔離

此項目使用 AsyncStorage 作為數據存儲，測試時必須隔離：

```typescript
// 测试配置 (jest/setup.ts)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

### Mock AsyncStorage 工廠

每個測試套件使用獨立的 mock storage：

```typescript
import { mockAsyncStorage } from '../__tests__/helpers/mockAsyncStorage';

beforeEach(() => {
  mockAsyncStorage.clear();
});
```

### 測試隔離原則

- ✅ 每個測試文件獨立 mock storage
- ✅ 測試後自動清理
- ✅ 失敗時保留 snapshot 在 `runtime/logs/tests/<timestamp>/`
- ❌ 不可使用真實設備的 AsyncStorage
- ❌ 不可依賴模糊的默認值

---

## 🔧 測試配置

### Jest 配置 (jest.config.js)

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
  ],
};
```

### Detox 配置 (.detoxrc.js)

```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: '__tests__/e2e/jest.config.js',
  artifacts: false,
  apps: {
    ios: { type: 'ios.app', binaryPath: '...' },
    android: { type: 'android.apk', binaryPath: '...' },
  },
  devices: {
    simulator: { type: 'ios.simulator', bootTimeout: 60000 },
    emulator: { type: 'android.emulator', headless: true },
  },
};
```

---

## 📋 各層級測試詳情

### A. 煙霧測試 (Smoke Tests)

**目的：** 用最短時間確認項目基本可啟動

**要測：**
- [ ] TypeScript 編譯無錯誤
- [ ] Expo prebuild 可成功
- [ ] 主要入口文件可 import
- [ ] app.json 配置完整
- [ ] 所有 60+ Storage Keys 存在
- [ ] i18n 兩種語言文件存在

**命令：** `npm run test:smoke`

**輸出：** `runtime/logs/tests/<timestamp>/smoke-report.md`

---

### B. 單元測試 (Backend Unit Tests → Logic Unit Tests)

**目的：** 測試純邏輯函數，不依賴 UI 或 AsyncStorage

**要測：**
- [ ] `SafeStorage.ts` 的 safeGetItem/safeSetItem/safeRemoveItem 邏輯
- [ ] 日期/時間格式化函數
- [ ] 計算函數 (如生長百分比、攝入量)
- [ ] Storage key 完整性驗證
- [ ] i18n key 完整性

**命令：** `npm test -- --testPathPattern="__tests__/unit"`

---

### D. 前端 Mocked 測試 (Frontend Mocked Tests)

**目的：** 使用 mocked AsyncStorage 測試 React 組件狀態

**要測：**
- [ ] HomeScreen 初始載入狀態
- [ ] Loading / Empty / Error 狀態
- [ ] Quick Entry 按鈕點擊
- [ ] SOS Modal 開啟/關閉
- [ ] Tab 導航
- [ ] i18n 語言切換
- [ ] Theme 切換

**命令：** `npm test -- --testPathPattern="__tests__/mocked"`

---

### E. 前端 Non-Mocked 測試 (Mode B)

**目的：** 使用 Expo 測試運行器 + mocked AsyncStorage，測試前後端整條鏈

**要測：**
- [ ] 真實 Navigation 流程
- [ ] Screen 之間數據傳遞
- [ ] Deep link 處理

**命令：** `npx expo test`

---

### F. E2E 用戶流程測試 (User Workflow E2E)

**目的：** 用真實用戶角度走完整流程

**核心流程：**
1. 首次開啟 App → Onboarding 流程
2. 完成 Onboarding → 進入 Home
3. 添加 Baby Profile
4. Quick Entry: Diaper / Feed / Sleep
5. 查看 Timeline 事件
6. 進入 Tracking Tab 添加記錄
7. 進入 Schedule Tab 查看日程
8. 進入 Profile 編輯設置
9. 刷新後數據仍在

**命令：** `npm run test:e2e`

**環境要求：** iOS Simulator 或 Android Emulator

---

### H. 回歸測試 (Regression Tests)

**目的：** 把曾經發生的 bug 變成永久測試

**命名規範：** `test_<症狀描述>`

示例：
- `test_no_request_storm_on_initial_load`
- `test_sos_modal_closes_on_escape`
- `test_data_persists_after_app_restart`

---

### I. 效能/穩定性測試 (Performance Tests)

**要測：**
- [ ] 初始載入 request count (應為 0，純本地)
- [ ] 大量數據寫入後 render performance
- [ ] 快速切換 Tab 的響應
- [ ] Deep link 響應時間

**Thresholds：**
- 初始載入：< 3 秒
- Tab 切換：< 500ms
- 列表 scroll：60 FPS

---

### J. 無障礙/UX 測試 (Accessibility Tests)

**要測：**
- [ ] 所有按鈕有 accessibilityLabel
- [ ] 所有圖標有 accessibilityLabel
- [ ] Modal 有 focus trap
- [ ] Escape 鍵關閉 Modal
- [ ] Error message 可讀
- [ ] Loading indicator 明確
- [ ] 重要操作有確認

**工具：** `@testing-library/jest-native` + manual audit

---

## 🔍 故障分類

所有 failure 要分類：

| 類別 | 描述 |
|------|------|
| `tsc-compile-error` | TypeScript 編譯錯誤 |
| `import-error` | 模塊導入失敗 |
| `async-storage-missing-key` | Storage key 不存在 |
| `i18n-missing-key` | 國際化 key 缺失 |
| `ui-state-mismatch` | UI 狀態與預期不符 |
| `navigation-error` | 導航失敗 |
| `a11y-missing-label` | 無障礙標籤缺失 |
| `e2e-element-not-found` | E2E 元素未找到 |
| `performance-threshold-exceeded` | 效能超標 |
| `test-environment-error` | 測試環境問題 |

---

## 📝 報告格式

每次測試 run 輸出 `report.md`：

```markdown
# Test Report — Jobble Baby

## Summary
- Mode: smoke | unit | mocked | e2e | all
- Started: ISO timestamp
- Commit: git hash
- Result: PASS | FAIL | PARTIAL

## Counts
| Result | Count |
|--------|-------:|
| Pass   |       |
| Fail   |       |
| Blocked |       |

## Failures
| Area | Test | Error | Evidence |
|------|------|-------|----------|

## Coverage
| Area | Coverage % |
|------|-----------:|
```
