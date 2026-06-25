# Jobble Baby 測試體系文檔

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立
> 最後更新: 2026-06-25 (cycle 517 — MilkThermalSafetyChecker mocked tests added, RT-005 still unfixed)

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
│   ├── mocked/                  # D. 前端 Mocked 測試 ✅ 56/56
│   │   ├── HomeScreen.test.tsx
│   │   ├── BottleFeedingScreen.test.tsx
│   │   ├── MilestonesScreen.test.tsx
│   │   ├── EmergencySOSScreen.test.tsx
│   │   ├── FeedingReadinessNavigator.test.tsx
│   │   ├── CryAcousticFingerprint.test.tsx
│   │   └── MilkThermalSafetyChecker.test.tsx  ← ✅ Added cycle 514 (11 tests)
│   ├── smoke/                   # A. 煙霧測試 ✅ 7/7
│   │   └── smoke-tests.ts
│   ├── regression/              # H. 回歸測試 ⚠️ 8/11 (3 FAIL RT-005)
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
├── REGRESSION-TESTS.md     ✅ 新建 2026-06-22（RT-004 文檔 + RT-005 待實現）
├── PERFORMANCE.md          ✅ 新建 2026-06-22（9 大測試場景 + thresholds）
└── A11Y-TESTS.md          ✅ 新建 2026-06-22（8 個真正需要實現的 a11y 測試）
```

## 🔢 10 層測試覆蓋矩陣

|||| 層級 | 名稱 | 工具 | 位置 | 狀態 | 覆蓋 ||
|||------|------|------|------|------|------|------|
||| A | 煙霧測試 | tsx | `__tests__/smoke/` | ✅ 7/7 | 100% |
||| B | 後端單元測試 | Jest | `__tests__/unit/` | ✅ 52/52 | 100% |
||| C | 後端 API 整合測試 | — | — | ❌ 0% | N/A (無 backend) |
||| D | 前端 Mocked 測試 | Jest + RTL | `__tests__/mocked/` | ✅ 56/56 | 100% |
||| E | 前端非模擬測試 (Mode B) | Jest | — | ❌ 未實現 | 0% |
||| F | 用戶流程 E2E 測試 | Detox | `__tests__/e2e/` | ❌ 未配置 | 0% |
||| G | 外部 API/Provider 測試 | — | — | ❌ N/A | N/A (無外部 API) |
||| H | 回歸測試 | Jest | `__tests__/regression/` | ⚠️ 8/11 PASS | 3 FAIL RT-005 |
||| I | 效能/穩定性測試 | — | — | ❌ doc only | 0% |
||| J | 無障礙/UX 測試 | Jest | `__tests__/a11y/` | ⚠️ 17/17 (placeholder) | 0% real a11y |

**Overall: 140/143 runnable tests pass (97.9%)**
**Layers Implemented: 4/10 (40%)**
**New in cycle 514: +11 MilkThermalSafetyChecker mocked tests**
**Regression since cycle 513: RT-005 3 failures remain unfixed**

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
npm run test:mocked         # Mocked 前端測試 ✅ 56/56 PASS
npm run test:a11y           # 無障礙測試 ✅ 17/17 PASS
npm run test:e2e            # E2E 測試（需先配置 Detox）❌ 未配置
npx jest --testPathPattern='__tests__/regression'  # 回歸測試 ⚠️ 8/11 (3 RT-005 FAIL)
npm run test:all            # smoke + unit + mocked
npm run test:report         # smoke + unit + mocked + 輸出報告
```

> ⚠️ 注意：`npm run test:regression` 不存在。回歸測試需直接用 `npx jest --testPathPattern='__tests__/regression'` 執行。

## 📊 本次 QA Cycle 成果 (2026-06-25 — Cycle 517)

### 修復的問題

1. **D層 — MilkThermalSafetyChecker 新增 Mocked 測試 (+11 tests)**
   - 文件: `__tests__/mocked/MilkThermalSafetyChecker.test.tsx`
   - 覆蓋: mount, AsyncStorage calls, temperature input, timer start/stop, thawed toggle, safety verdict, warming methods
   - 全部 11 tests ✅ PASS

### RT-005 仍未修復 (已知 Bug — 3 FAIL)

Quick Entry FAB 按鈕仍然缺少 `onPress` handler。自 cycle 500 以來 3 個回歸測試持續失敗：
- `test_quick_entry_fab_touchableopacity_has_onpress` — FAIL: 0 onPress found
- `test_quick_entry_fab_row_has_router_navigation` — FAIL: no router.push in FAB section
- `test_quick_entry_fab_accessibility_declares_action_but_no_handler` — FAIL: accessibilityHint without handler

## ⚠️ 已知問題

1. **RT-005 Quick Entry FAB 按鈕無 onPress** — 自 cycle 500 以來未修復
2. **E2E 無測試覆蓋** — Detox 配置存在但無 runner
3. **a11y tests 是 Placeholder** — 測試通過但不是真正的無障礙測試
4. **Mode B 未實現** — 前端非模擬測試無基礎設施
5. **效能測試無基礎設施** — `docs/testing/PERFORMANCE.md` 只有文檔

## 🔴 關鍵風險

| 風險 | 影響 | 原因 |
|------|------|------|
| Quick Entry 按鈕無 handler | 核心用戶流程中斷 | `app/(tabs)/index.tsx` 缺少 `onPress` |
| E2E 無測試覆蓋 | 99 tabs 關鍵路徑未驗證 | Detox 未配置 |
| 效能測試缺失 | 大列表/streaming 場景未知 | 無負載測試 |
| a11y placeholder | 無法發現真實無障礙問題 | 測試不渲染真實組件 |
