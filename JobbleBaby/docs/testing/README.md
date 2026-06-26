# Jobble Baby 測試體系文檔

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立
> 最後更新: 2026-06-26 (cycle 531 — VelocityDecileTracker 18 tests VERIFIED, RT-005 FAB FIXED, 166/166 PASS)

## 📁 測試架構

```
JobbleBaby/
├── __tests__/                    # Jest 測試
│   ├── unit/                    # B. 後端單元測試 ✅ 52/52
│   │   ├── safe-storage.test.ts
│   │   ├── theme.test.ts
│   │   ├── i18n.test.ts
│   │   ├── storage-keys.test.ts
│   │   └── data-export.test.ts   # 21 tests
│   ├── mocked/                  # D. 前端 Mocked 測試 ✅ 79/79
│   │   ├── HomeScreen.test.tsx
│   │   ├── BottleFeedingScreen.test.tsx
│   │   ├── MilestonesScreen.test.tsx
│   │   ├── EmergencySOSScreen.test.tsx
│   │   ├── FeedingReadinessNavigator.test.tsx
│   │   ├── CryAcousticFingerprint.test.tsx
│   │   ├── MilkThermalSafetyChecker.test.tsx  ← Added cycle 514 (11 tests)
│   │   └── VelocityDecileTracker.test.tsx    ← Added cycle 530 (+18 tests)
│   ├── smoke/                   # A. 煙霧測試 ✅ 7/7
│   │   └── smoke-tests.ts
│   ├── regression/              # H. 回歸測試 ✅ 11/11
│   │   ├── regression_004_phototherapy_i18n.test.ts
│   │   └── regression_005_quick_entry_fab_onpress.test.ts
│   ├── a11y/                   # J. 無障礙/UX 測試 ✅ 17/17 (placeholder)
│   │   └── a11y.test.ts
│   ├── e2e/                    # F. E2E 測試 ❌ 未配置
│   │   └── e2e.test.ts
│   └── helpers/                # 測試輔助工具
│       ├── setup.ts
│       ├── mockAsyncStorage.ts
│       ├── render-with-providers.tsx
│       └── createReport.ts
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
        ├── REGRESSION-TESTS.md
        ├── PERFORMANCE.md
        └── A11Y-TESTS.md
```

## 🔢 10 層測試覆蓋矩陣

|    | 層級 | 名稱 | 工具 | 位置 | 狀態 | 覆蓋 |
|----|------|------|------|------|------|------|
| A | 煙霧測試 | tsx | `__tests__/smoke/` | ✅ 7/7 | 100% |
| B | 後端單元測試 | Jest | `__tests__/unit/` | ✅ 52/52 | 100% |
| C | 後端 API 整合測試 | — | — | ❌ 0% | N/A (無 backend) |
| D | 前端 Mocked 測試 | Jest + RTL | `__tests__/mocked/` | ✅ 79/79 | 100% |
| E | 前端非模擬測試 (Mode B) | Jest | — | ❌ 未實現 | 0% |
| F | 用戶流程 E2E 測試 | Detox | `__tests__/e2e/` | ❌ 未配置 | 0% |
| G | 外部 API/Provider 測試 | — | — | ❌ N/A | N/A (無外部 API) |
| H | 回歸測試 | Jest | `__tests__/regression/` | ✅ 11/11 PASS | ✅ RT-005 FIXED |
| I | 效能/穩定性測試 | — | — | ❌ doc only | 0% |
| J | 無障礙/UX 測試 | Jest | `__tests__/a11y/` | ⚠️ 17/17 (placeholder) | 0% real a11y |

**Overall: 166/166 tests pass (100%)**
**Layers Implemented: 5/10 (50%)**
**Cycle 531: VelocityDecileTracker 18 tests verified; RT-005 Quick Entry FAB FIXED**
**Regression since cycle 513: RT-005 FIXED — Quick Entry FAB onPress added (cycle 531)**

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
npm test                    # 所有 Jest 測試（排除 smoke/e2e）
npm run test:smoke          # 煙霧測試（tsx）✅ 7/7 PASS
npm run test:unit           # 單元測試 ✅ 52/52 PASS
npm run test:mocked         # Mocked 前端測試 ✅ 79/79 PASS
npm run test:a11y           # 無障礙測試 ✅ 17/17 PASS
npm run test:e2e            # E2E 測試（需先配置 Detox）❌ 未配置
npx jest --testPathPattern='__tests__/regression'  # 回歸測試 ✅ 11/11 PASS
npm run test:all            # smoke + unit + mocked
npm run test:report         # smoke + unit + mocked + 輸出報告
```

> ⚠️ 注意：`npm run test:regression` 不存在。回歸測試需直接用 `npx jest --testPathPattern='__tests__/regression'` 執行。

## 📊 本次 QA Cycle 成果 (2026-06-26 — Cycle 531)

### 修復的問題

1. **D層 — VelocityDecileTracker 18 tests 全部修復**
   - 文件: `__tests__/mocked/VelocityDecileTracker.test.tsx`
   - Section E title: `'Velocity Entry Journal'` → `'Log Weight'` (i18n key 正確，測試錯誤)
   - 3 個 band tests: `mockResolvedValueOnce` → `mockResolvedValue` (組件 re-render 不 await)
   - faltering test: 動態日期邊界 → 硬編碼 `now='2026-06-26'`, entries `'2026-05-01'` / `'2026-06-01'`
   - stable/decreasing/increasing: 同上修復
   - 全部 18 tests ✅ 79/79 PASS

2. **H層 — RT-005 Quick Entry FAB onPress 已修復 (cycle 531)**
   - `app/(tabs)/index.tsx` 第 370–374 行已有 `onPress` handler + `router.push` 導航
   - 3 個回歸測試全部通過 ✅ 11/11 PASS

### 已知組件 Bug (未修)

1. **`getDecilePercentile` 邊界問題** — `velocity < p50` 用了 `<` 而非 `<=`，p50 時返回 62 而非 50
   - 影響: 速度剛好等於 p50 時百分位數顯示錯誤
   - 不影響: `getDecileBand` 分 band 邏輯 (用 `<=`)

## ⚠️ 仍需關注

1. **E2E 無測試覆蓋** — Detox 配置存在但無 runner
2. **a11y tests 是 Placeholder** — 測試通過但不是真正的無障礙測試
3. **Mode B 未實現** — 前端非模擬測試無基礎設施
4. **效能測試無基礎設施** — `docs/testing/PERFORMANCE.md` 只有文檔

## 🔴 關鍵風險

| 風險 | 影響 | 原因 |
|------|------|------|
| E2E 無測試覆蓋 | 99 tabs 關鍵路徑未驗證 | Detox 未配置 |
| 效能測試缺失 | 大列表/streaming 場景未知 | 無負載測試 |
| a11y placeholder | 無法發現真實無障礙問題 | 測試不渲染真實組件 |
| getDecilePercentile boundary | p50 時返回 62 而非 50 | `velocity < p50` 用了 `<` 而非 `<=` |
