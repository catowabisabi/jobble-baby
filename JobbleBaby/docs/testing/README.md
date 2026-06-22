# Jobble Baby 測試體系文檔

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立

## 📁 測試架構

```
JobbleBaby/
├── __tests__/                    # Jest 測試（通過 npm test 執行）
│   ├── unit/                    # B. 後端單元測試
│   │   ├── safe-storage.test.ts
│   │   ├── theme.test.ts
│   │   ├── i18n.test.ts
│   │   └── storage-keys.test.ts
│   ├── mocked/                  # D. 前端 Mocked 測試
│   │   └── HomeScreen.test.tsx
│   ├── smoke/                   # A. 煙霧測試（tsx 直跑）
│   │   └── smoke-tests.ts
│   ├── e2e/                     # F. 用戶流程 E2E 測試
│   │   └── (detox 配置)
│   ├── a11y/                    # J. 無障礙/UX 測試
│   │   └── (待實現)
│   ├── helpers/                 # 測試輔助工具
│   │   └── setup.ts
│   └── setup.ts                 # Jest 全域設定
├── tests/                       # C. 後端 API 整合測試
│   └── api/
├── runtime/
│   └── logs/
│       └── tests/               # 測試報告輸出
│           └── <timestamp>/
│               └── report.md
└── docs/
    └── testing/                 # 本目錄
        ├── README.md            # 測試體系總覽
        ├── SMOKE-TESTS.md       # A. 煙霧測試文檔
        ├── UNIT-TESTS.md        # B. 單元測試文檔
        ├── API-TESTS.md         # C. API 整合測試文檔
        ├── MOCKED-TESTS.md      # D. 前端 Mocked 測試文檔
        ├── E2E-TESTS.md         # F. E2E 測試文檔
        ├── REGRESSION-TESTS.md # H. 回歸測試文檔
        ├── PERFORMANCE.md       # I. 效能測試文檔
        └── A11Y-TESTS.md        # J. 無障礙測試文檔
```

## 🔢 10 層測試覆蓋矩陣

| 層級 | 名稱 | 工具 | 位置 | 狀態 |
|------|------|------|------|------|
| A | 煙霧測試 | tsx + 自建框架 | `__tests__/smoke/` | ✅ 可運行 |
| B | 後端單元測試 | Jest | `__tests__/unit/` | ⚠️ 2/4 失敗 |
| C | 後端 API 整合測試 | Jest + Supertest | `tests/api/` | ❌ 未實現 |
| D | 前端 Mocked 測試 | Jest + RTL | `__tests__/mocked/` | ⚠️ 0/4 通過 |
| E | 前端非模擬測試 (Mode B) | Jest + 實際模塊 | — | ❌ 未實現 |
| F | 用戶流程 E2E 測試 | Detox | `__tests__/e2e/` | ❌ 未配置 |
| G | 外部 API/Provider/Agent 測試 | Jest | — | ❌ 未實現 |
| H | 回歸測試 | Jest | — | ❌ 未實現 |
| I | 效能/穩定性測試 | k6 / 自建 | — | ❌ 未實現 |
| J | 無障礙/UX 測試 | Jest + a11y | `__tests__/a11y/` | ❌ 未实现 |

## ⚙️ Jest 配置

```js
// jest.config.js
preset: '@react-native/jest-preset',  // 從 jest-expo 切换過來
testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
testPathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/smoke/',   // smoke 用 tsx 直跑
  '/__tests__/e2e/',     // detox 单獨跑
  '/__tests__/a11y/',    // 单独的 a11y 框架
],
setupFiles: ['./__tests__/setup.ts'],
```

## 🏃 執行命令

```bash
npm test                    # 所有 Jest 測試（排除 smoke/e2e/a11y）
npm run test:smoke          # 煙霧測試（tsx）
npm run test:unit           # 單元測試
npm run test:mocked         # Mocked 前端測試
npm run test:all            # 全部測試（需先實現）
```

## ⚠️ 已知問題

1. **jest-expo v52 兼容性**: `@react-native/jest-preset` 已被 patch 進 jest-expo
2. **Babel Flow 支援**: 需要 `@babel/preset-flow` 解析 Flow 類型
3. **React 版本匹配**: `react-test-renderer@19.2.3` 需與 `react@19.2.3` 匹配
