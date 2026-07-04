# Jobble Baby 測試體系文檔

> 根據 `universal-testing-system-agent-prompt.zh-TW.md` 建立
> 最後更新: 2026-07-04 (cycle 1109 — 330/330 pass, social-emotional-sentinel 0-test gap CLOSED)

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
│   ├── mocked/                  # D. 前端 Mocked 測試 ✅ 204 tests / 20 suites
│   │   ├── HomeScreen.test.tsx
│   │   ├── BottleFeedingScreen.test.tsx
│   │   ├── BottleRefusalScreen.test.tsx
│   │   ├── MilestonesScreen.test.tsx
│   │   ├── EmergencySOSScreen.test.tsx
│   │   ├── FeedingReadinessNavigator.test.tsx
│   │   ├── CryAcousticFingerprint.test.tsx
│   │   ├── MilkThermalSafetyChecker.test.tsx
│   │   ├── VelocityDecileTracker.test.tsx
│   │   ├── CircadianScreen.test.tsx
│   │   ├── GrowthScreen.test.tsx
│   │   ├── ProfileScreen.test.tsx
│   │   ├── SleepTrainingScreen.test.tsx
│   │   ├── MilkTransferScreen.test.tsx
│   │   ├── OralMotorScreen.test.tsx
│   │   ├── TeethingScreen.test.tsx
│   │   ├── PolyvagalDashboardScreen.test.tsx
│   │   └── SocialEmotionalSentinelScreen.test.tsx  ← NEW (cycle 1109, 29 tests)
│   ├── smoke/                   # A. 煙霧測試 ✅ 7/7
│   │   └── smoke-tests.ts
│   ├── regression/              # H. 回歸測試 ✅ 26/26 (RT-004 + RT-005 + RT-006 + RT-009)
│   │   ├── regression_004_phototherapy_i18n.test.ts  (6 tests)
│   │   ├── regression_005_quick_entry_fab_onpress.test.ts (5 tests)
│   │   ├── regression_006_room_scores_no_persist.test.ts  (3 tests)
│   │   └── regression_009_i18n_2026_06_30.test.ts  (12 tests, cycle 577)
│   ├── a11y/                    # J. 無障礙/UX 測試 ⚠️ placeholder
│   │   └── a11y.test.ts
│   ├── e2e/                     # F. E2E 測試 ❌ 未配置
│   │   └── e2e.test.ts
│   └── helpers/                # 測試輔助工具
│       ├── setup.ts
│       ├── mockAsyncStorage.ts
│       ├── render-with-providers.tsx
│       └── createReport.ts
├── runtime/
│   └── logs/
│       └── tests/               # 測試報告輸出
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

||     | 層級 | 名稱 | 工具 | 位置 | 狀態 | 覆蓋 |
|-----|------|------|------|------|------|------|
|  | A | 煙霧測試 | tsx | `__tests__/smoke/` | ✅ 7/7 | 100% |
|  | B | 後端單元測試 | Jest | `__tests__/unit/` | ✅ 52/52 | 100% |
|  | C | 後端 API 整合測試 | — | — | ❌ 0% | N/A (無 backend) |
|  | D | 前端 Mocked 測試 | Jest + RTL | `__tests__/mocked/` | ✅ 204 tests / 20 suites | 20/103 screens (~19%) |
|  | E | 前端非模擬測試 (Mode B) | Jest | — | ❌ 未實現 | 0% |
|  | F | 用戶流程 E2E 測試 | Detox | `__tests__/e2e/` | ❌ 未配置 | 0% |
|  | G | 外部 API/Provider 測試 | — | — | ❌ N/A | N/A (無外部 API) |
|  | H | 回歸測試 | Jest | `__tests__/regression/` | ✅ 50/50 | RT-004 + RT-005 + RT-006 + RT-009 |
|  | I | 效能/穩定性測試 | — | — | ❌ doc only | 0% |
|  | J | 無障礙/UX 測試 | Jest | `__tests__/a11y/` | ⚠️ placeholder | 0% real a11y |

**Overall: 330/330 tests pass (100%)**
**Layers Implemented: 5.5/10 (50%)**
**Last full run: Cycle 1109 — 330/330 PASS (2026-07-04)**
**Commit tested: 5d7da18** (docs(testing): update README.md cycle ref + add test-database-strategy.md)

## ⚙️ Jest 配置

```js
// jest.config.js
preset: '@react-native/jest-preset',
testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
testPathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/smoke/',   // smoke 用 tsx 直跑
  '/__tests__/e2e/',     // detox 單獨跑
  '/__tests__/a11y/',    // 单独的 a11y 框架
],
setupFiles: ['./__tests__/setup.ts'],
```

## 🏃 執行命令

```bash
npm test                    # 所有 Jest 測試（排除 smoke/e2e）
npm run test:smoke          # 煙霧測試（tsx）✅ 7/7 PASS
npm run test:unit           # 單元測試 ✅ 52/52 PASS
npm run test:mocked         # Mocked 前端測試 ✅ 112/112 PASS
npm run test:a11y           # 無障礙測試 ⚠️ placeholder
npm run test:e2e            # E2E 測試（需先配置 Detox）❌ 未配置
npx jest --testPathPattern='__tests__/regression'  # 回歸測試 ✅ 26/26 PASS
npm run test:all            # smoke + unit + mocked
npm run test:report         # smoke + unit + mocked + 輸出報告
```

## ⚠️ 仍需關注

1. **Screen Coverage Gap (~81%)** — 103 screens, only 20 have mocked tests
2. **E2E 無測試覆蓋** — Detox 配置存在但無測試文件
3. **a11y tests 是 Placeholder** — 17 tests pass but do not render real components
4. **Mode B 未實現** — 前端非模擬測試無基礎設施
5. **效能測試無基礎設施** — `docs/testing/PERFORMANCE.md` 只有文檔
6. **RT-GAP-001 social-emotional-sentinel** — ✅ 已修復 (29 tests, cycle 1109)

## 🔴 關鍵風險

| 風險 | 影響 | 原因 |
|------|------|------|
| **social-emotional-sentinel 零測試** | ✅ **已修復** | 29 tests added in cycle 1109 |
| Screen Coverage Gap | ~81% screens untested | 99 screens, 19 tested |
| E2E 無測試覆蓋 | 99 tabs 關鍵路徑未驗證 | Detox 未配置 |
| 效能測試缺失 | 大列表/streaming 場景未知 | 無負載測試 |
| a11y placeholder | 無法發現真實無障礙問題 | 測試不渲染真實組件 |
| `getDecilePercentile` boundary | p50 時返回 62 而非 50 | `velocity < p50` 用了 `<` 而非 `<=` |
| Duplicate key `18` in HomeScreen | React list rendering warning | List item key collision — non-blocking |
| `act()` wrapper missing in async tests | Flaky tests, state update warnings | VelocityDecile + Profile async setState |

## 📊 Cycle 1109 成果 (2026-07-04)

- **330/330 tests pass — Zero failures**
- Commit 5d7da18: docs(testing): update README.md cycle ref + add test-database-strategy.md
- Smoke tests: 7/7 ✅ PASS (TypeScript 0 errors)
- Unit tests: 52/52 ✅ PASS
- Mocked tests: 204/204 ✅ PASS (20 suites, 20 screens covered)
- Regression: 50/50 ✅ PASS
- A11y: 17/17 ⚠️ PASS (placeholder)
- **social-emotional-sentinel (657 lines) — CRITICAL GAP CLOSED** ✅
- RT-GAP-001: social-emotional-sentinel zero-test → 29 tests added
- RT-007 (act() wrapper) 和 RT-008 (duplicate key) 仍待修復
- 新建 `docs/testing/test-database-strategy.md`
