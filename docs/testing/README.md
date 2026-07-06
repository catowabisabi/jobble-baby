# Jobble Baby 測試體系

|> 最後更新：2026-07-06 (Cycle 1229) — 386 Tests PASS + 4 SKIPPED

## 📋 項目概覽

| 項目 | 技術 |
|------|------|
| 框架 | Expo SDK 56 / React Native 0.85.3 |
| 語言 | TypeScript 5.3 (strict) |
| 導航 | Expo Router (file-based) |
| 數據層 | React Context + AsyncStorage (221 keys) |
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
├── regression/      # H. 回歸測試 — 曾經的 bug 變成永久測試
├── a11y/            # J. 無障礙/UX 測試
└── e2e/             # F. E2E 用戶流程測試 (Detox) — 已配置但無測試

docs/testing/        # 測試文檔
runtime/logs/tests/   # 測試報告輸出
```

---

## 📊 測試矩陣

| 層級 | 測試類型 | 工具 | 隔離 DB | 覆蓋範圍 | 狀態 |
|------|----------|------|---------|----------|------|
| A | 煙霧測試 | tsx script | N/A | 7 tests — 7/7 ✅ | 2026-07-06 |
| B | 單元測試 | Jest | mock | 52 tests — 52/52 ✅ | 5 suites |
| D | Mocked 組件測試 | Jest + RTL | mock AsyncStorage | 260 tests + 4 SKIPPED — 22 screens | ✅ | 22 suites |
| H | 回歸測試 | Jest | mock | 50 tests — 50/50 ✅ | 5 suites |
| J | 無障礙/UX 測試 | Jest | N/A | 17 tests — 17/17 ✅ | 1 suite |
| E | Non-Mocked Mode B | Expo + Jest | mock AsyncStorage | 0 tests ❌ | GAP |
| F | E2E 流程測試 | Detox | N/A | 0 tests ❌ | GAP |
| I | 效能測試 | Detox | N/A | 0 tests ❌ | GAP |

**不適用於此項目：** C (後端 API 整合測試) — 無後端 · G (外部 API 測試) — 無外部 API

**最新測試結果：Cycle 1229 — 386 PASS + 4 SKIPPED, 0 FAIL, 34 Jest suites**

---

## 📱 Screen 覆蓋率

**總 Screen 數：107 個**
- Tab Screens: 104 個 (app/(tabs)/)
- Modal Screens: 3 個 (app/screens/: DaycareViewScreen, FeedingTimerScreen, OnboardingScreen)

**已覆蓋：22 個 (20.6%)**
- AutonomicResonanceScreen, BottleFeedingScreen, BottleRefusalScreen, CircadianScreen
- CryAcousticFingerprint, EmergencySOSScreen, FeedingReadinessNavigator, GrowthScreen
- GutResilienceNavigatorScreen, HomeScreen, LipSealNavigatorScreen, MilestonesScreen
- MilkThermalSafetyChecker, MilkTransferScreen, OralMotorScreen, PolyvagalDashboardScreen
- ProcedureRecoveryScreen, ProfileScreen, SleepTrainingScreen, SocialEmotionalSentinelScreen
- TeethingScreen, VelocityDecileTrackerScreen

**未覆蓋：85 個 (79.4%)** — 見下方清單

---

## 🚀 快速開始

### 1. 運行所有測試

```bash
cd JobbleBaby
npm run test:smoke          # 煙霧測試
npm run test:unit            # 單元測試
npm run test:mocked          # Mocked 組件測試
npm run test:a11y            # 無障礙測試
npm run test:all             # 全部測試 (smoke + unit + a11y)
```

### 2. 生成測試報告

```bash
npm run test:report         # 生成 report.md 到 runtime/logs/tests/
```

---

## 📋 各層級測試詳情

### A. 煙霧測試 (Smoke Tests)

**目的：** 用最短時間確認項目基本可啟動

**要測：**
- [x] TypeScript 編譯無錯誤
- [x] app.json 配置完整 (name, bundleId, package)
- [x] 所有 221 Storage Keys 存在
- [x] i18n 兩種語言文件存在 (en.json, zh.json)
- [x] 主要入口文件存在
- [x] package.json 有效性
- [x] .env.example 存在

**命令：** `npm run test:smoke`

**狀態：** ✅ 7/7 PASS (2026-07-06T00:32:11)

---

### B. 單元測試 (Backend Unit Tests → Logic Unit Tests)

**目的：** 測試純邏輯函數，不依賴 UI 或 AsyncStorage

**要測：**
- [x] `SafeStorage.ts` 的 safeGetItem/safeSetItem/safeRemoveItem 邏輯
- [x] Storage key 完整性驗證
- [x] i18n key 完整性
- [x] Data export/import 邏輯
- [x] Theme 顏色配置

**命令：** `npm run test:unit`

**狀態：** ✅ 52/52 PASS (5 suites)

---

### D. 前端 Mocked 測試 (Frontend Mocked Tests)

**目的：** 使用 mocked AsyncStorage 測試 React 組件狀態

**已測試 Screen（22個）：**
AutonomicResonanceScreen, BottleFeedingScreen, BottleRefusalScreen, CircadianScreen, CryAcousticFingerprint, EmergencySOSScreen, FeedingReadinessNavigator, GrowthScreen, GutResilienceNavigatorScreen, HomeScreen, LipSealNavigatorScreen, MilestonesScreen, MilkThermalSafetyChecker, MilkTransferScreen, OralMotorScreen, PolyvagalDashboardScreen, ProcedureRecoveryScreen, ProfileScreen, SleepTrainingScreen, SocialEmotionalSentinelScreen, TeethingScreen, VelocityDecileTrackerScreen

**命令：** `npm run test:mocked`

**狀態：** ✅ 260 PASS + 4 SKIPPED (22 suites)

---

### E. 前端 Non-Mocked 測試 (Mode B) — GAP

**目的：** 使用 Expo 測試運行器 + mocked AsyncStorage，測試前後端整條鏈

**狀態：** ❌ 0 tests — GAP

**需建立：**
- [ ] 真實 Navigation 流程測試
- [ ] Screen 之間數據傳遞測試
- [ ] Deep link 處理測試

---

### F. E2E 用戶流程測試 (User Workflow E2E) — GAP

**目的：** 用真實用戶角度走完整流程

**狀態：** ❌ 0 tests — GAP (Detox 已配置但無測試文件)

**需建立核心流程：**
1. 首次開啟 App → Onboarding 流程
2. 完成 Onboarding → 進入 Home
3. 添加 Baby Profile
4. Quick Entry: Diaper / Feed / Sleep
5. 查看 Timeline 事件
6. 進入 Tracking Tab 添加記錄
7. 進入 Schedule Tab 查看日程
8. 進入 Profile 編輯設置
9. 刷新後數據仍在

**環境要求：** iOS Simulator 或 Android Emulator

---

### G. 外部 API / Provider / Agent 測試 — N/A

**原因：** 此項目為純客戶端，無外部 API 依賴

---

### H. 回歸測試 (Regression Tests)

**目的：** 把曾經發生的 bug 變成永久測試

**命令：** `npm test -- --testPathPattern="__tests__/regression"`

**狀態：** ✅ 50/50 PASS (5 suites)

---

### I. 效能/穩定性測試 (Performance Tests) — GAP

**目的：** 找出卡死、request storm、過慢、memory leak

**狀態：** ❌ 0 tests — GAP

**需建立：**
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
- [x] 所有按鈕有 accessibilityLabel
- [x] 所有圖標有 accessibilityLabel
- [x] Modal 有 focus trap
- [x] Escape 鍵關閉 Modal
- [x] Error message 可讀
- [x] Loading indicator 明確
- [x] 重要操作有確認

**命令：** `npm run test:a11y`

**狀態：** ✅ 17/17 PASS (1 suite)

---

## 📁 關鍵文件

| 文件 | 描述 |
|------|------|
| `store/storage-keys.ts` | 221 AsyncStorage key 定義 |
| `app/utils/SafeStorage.ts` | AsyncStorage 封裝 |
| `app/_layout.tsx` | 根佈局，決定首次啟動流程 |
| `app/(tabs)/index.tsx` | HomeScreen 主儀表板 |
| `app/screens/OnboardingScreen.tsx` | 首次啟動引導 |
| `app/i18n/en.json` + `zh.json` | 國際化字符串 |
| `jest.config.js` | Jest 配置 |
| `.detoxrc.js` | Detox E2E 配置 |

---

## ❌ 未覆蓋 Screen 清單 (85個)

### Tab Screens (82個未覆蓋)

**護理類 (11):**
allergens, appstore-checklist, caregiver-fatigue, clinician-portal, colic-relief, lactation, milk-prep, products, shift-handoff, stress-cascade, village-network

**發育類 (21):**
asymmetric-growth, behavioral-rehearsal, bilateral-coordination, bonding-journal, coregulation-resonance, critical-periods, development-radar, eight-month-storm, feeding-progression, feeding-readiness, fontanelle-hydration, fontanelle, galant-latch-navigator, gear-check, gesture-milestone, gut-brain-axis, habit-reset, hip-click, home-safety, indoor-air-navigator, interoceptive

**生長類 (4):**
growth-montage, jaundice-threshold, jaundice, phototherapy-comfort

**反射類 (12):**
cortisol-skin-navigator, landau-reflex, moro-reflex, pincer-grasp, reflex-integration, reflex-tracker, reflex-visual-motor, regulatory-fitness, rsa-thoracic-navigator, sensory-integration, suckle-to-chew-bridge, vestibular-assessment

**睡眠類 (8):**
jet-lag, monitor-correlation, sleep-architecture, sleep-association, sleep-debt, solid-food, thermal-metabolic, thermal-regulation

**口腔/餵養類 (4):**
cup-feeding, cry-analyzer, gravity-feeding, tongue-tie

**安全類 (5):**
constellation, iot-security, pre-submission-qa, safety-audit, stranger-danger

**其他 (6):**
autonomic-readiness, launch-checklist, medicine-dose, neuroplasticity, pediatric-report, projection, protoconversation, regression-navigator, schedule, tracking, tummy-time, vestibular-motor, weaning-rash, window-of-tolerance

### Modal Screens (3個未覆蓋)

DaycareViewScreen, FeedingTimerScreen, OnboardingScreen

---

## 🔍 故障分類

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
