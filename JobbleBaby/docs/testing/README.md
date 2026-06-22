# Jobble Baby 測試體系文檔

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立
> 最後更新: 2026-06-22 (本次 QA cycle)

## 📁 測試架構

```
JobbleBaby/
├── __tests__/                    # Jest 測試
│   ├── unit/                    # B. 後端單元測試 ✅ 31/31
│   │   ├── safe-storage.test.ts
│   │   ├── theme.test.ts        # 2026-06-22 修復
│   │   ├── i18n.test.ts
│   │   └── storage-keys.test.ts  # 2026-06-22 修復
│   ├── mocked/                  # D. 前端 Mocked 測試 ✅ 4/4
│   │   └── HomeScreen.test.tsx   # 2026-06-22 完全重寫
│   ├── smoke/                   # A. 煙霧測試 ⚠️ 6/7
│   │   └── smoke-tests.ts
│   ├── a11y/                   # J. 無障礙/UX 測試 ❌ 未啟用
│   ├── e2e/                    # F. E2E 測試 ❌ 未配置
│   ├── helpers/                # 測試輔助工具
│   │   ├── setup.ts
│   │   └── render-with-providers.tsx  # 2026-06-22 新建
│   └── setup.ts
├── tests/                       # (保留給未來 backend API 測試)
├── runtime/
│   └── logs/
│       └── tests/              # 測試報告輸出
│           └── <timestamp>/
│               └── report.md
└── docs/
    └── testing/                 # 本目錄
        ├── README.md
        ├── SMOKE-TESTS.md
        ├── UNIT-TESTS.md
        ├── API-TESTS.md
        ├── MOCKED-TESTS.md
        ├── E2E-TESTS.md
├── REGRESSION-TESTS.md     ✅ 新建 2026-06-22（RT-004 文檔 + RT-005 待實現）
├── PERFORMANCE.md          ✅ 新建 2026-06-22（9 大測試場景 + thresholds）
└── A11Y-TESTS.md          ✅ 新建 2026-06-22（8 個真正需要實現的 a11y 測試）
```

## 🔢 10 層測試覆蓋矩陣

|| 層級 | 名稱 | 工具 | 位置 | 狀態 | 覆蓋 |
|------|------|------|------|------|------|------|
| A | 煙霧測試 | tsx | `__tests__/smoke/` | ⚠️ 6/7 | 86% |
| B | 後端單元測試 | Jest | `__tests__/unit/` | ✅ 31/31 | 100% |
| C | 後端 API 整合測試 | — | — | ❌ 0% | N/A (無 backend) |
| D | 前端 Mocked 測試 | Jest + RTL | `__tests__/mocked/` | ✅ 4/4 | 100% |
| E | 前端非模擬測試 (Mode B) | Jest | — | ❌ 未實現 | 0% |
| F | 用戶流程 E2E 測試 | Detox | `__tests__/e2e/` | ❌ 未配置 | 0% |
| G | 外部 API/Provider 測試 | — | — | ❌ N/A | N/A (無外部 API) |
|| H | 回歸測試 | Jest | `__tests__/regression/` | ✅ RT-004 | 1 test |
|| I | 效能/穩定性測試 | — | — | ❌ 未實現（doc only） | 0% |
|| J | 無障礙/UX 測試 | Jest | `__tests__/a11y/` | ⚠️ Placeholder only | 0% |

**Overall: 41/42 runnable tests pass (98%)**
**Layers Implemented: 4/10 (40%)**

## ⚙️ Jest 配置

```js
// jest.config.js
preset: '@react-native/jest-preset',
testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
testPathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/smoke/',   // smoke 用 tsx 直跑
  '/__tests__/e2e/',     // detox 單獨跑
  '/__tests__/a11y/',     // 单独的 a11y 框架
],
setupFiles: ['./__tests__/setup.ts'],
```

## 🏃 執行命令

```bash
npm test                    # 所有 Jest 測試（排除 smoke/e2e/a11y）
npm run test:smoke          # 煙霧測試（tsx）
npm run test:unit           # 單元測試 ✅
npm run test:mocked         # Mocked 前端測試 ✅
npm run test:a11y           # 無障礙測試（未啟用）
npm run test:e2e            # E2E 測試（需先配置 Detox）
npm run test:all            # smoke + unit + mocked
```

## 📊 本次 QA Cycle 成果 (2026-06-22)

### 修復的問題

1. **B層 — theme.test.ts (2/5 FAIL → 6/6 PASS)**
   - 測試期望與實際 ThemeColors 介面不符
   - `ThemeColors` 只有 6 個顏色：background, card, border, accent, text, muted
   - `error/warning/good` 位於 `STATUS_COLORS`，不是 `COLORS`
   - 修復後全部 6 個測試通過

2. **B層 — storage-keys.test.ts (4/6 FAIL → 6/6 PASS)**
   - 正則 `/^[A-Z_]+$/` 不允許數字（如 `FEEDING_READINESS_1`）
   - `CUPS_FEEDING_ENTRIES` 應為 `CUP_FEEDING_ENTRIES`（單數 Cup）

3. **D層 — HomeScreen.test.tsx (0/4 FAIL → 4/4 PASS)**
   - 所有測試崩潰：`useTheme must be used within ThemeProvider`
   - 創建 `renderWithProviders` helper 包裝 ThemeProvider + LanguageProvider
   - 修復 SafeStorage mock 引用方式

## ⚠️ 已知問題

1. **smoke TypeScript 檢查** — jest types 未在 tsconfig.json 中
2. **Quick Entry FAB 按鈕無 onPress** — 按鈕渲染但不觸發導航（實現 bug）
3. **Detox 未配置** — E2E 測試無基礎設施
4. **a11y tests 未啟用** — `__tests__/a11y/` 被 jest 忽略

## 🔴 關鍵風險

| 風險 | 影響 | 原因 |
|------|------|------|
| Quick Entry 按鈕無 handler | 核心用戶流程中斷 | app/(tabs)/index.tsx 缺少 onPress |
| E2E 無測試覆蓋 | 關鍵路徑未驗證 | Detox 未配置 |
| 回歸測試缺失 | Bug 可能重現 | 沒有 regression 套件 |
| 性能測試缺失 | 大數據場景未知 | 無負載測試 |
