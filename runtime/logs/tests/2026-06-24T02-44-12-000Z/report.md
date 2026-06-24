# Test Report — Jobble Baby

## Summary
- **Mode:** full (smoke + unit + mocked + regression + a11y)
- **Started:** 2026-06-24T02:44:12.000Z
- **Finished:** 2026-06-24T02:44:12.000Z
- **Commit:** 0f2958df3804ae31eccc9fdca88e525587b5f7de
- **Branch:** master
- **Backend:** N/A (pure client-side Expo app)
- **Frontend:** Expo SDK 56 / React Native 0.85.3 / TypeScript
- **Database:** AsyncStorage (local device storage)
- **Result:** PARTIAL — Smoke/Unit/Mocked/A11y PASS; Regression FAIL (RT-005); gaps remain

---

## Counts

| Result | Count |
|--------|------:|
| Pass | 76 |
| Fail | 3 |
| Blocked | 0 |

---

## Test Breakdown by Layer

### A. Smoke Tests ✅ 7/7 PASS
| Test | Status | Details |
|------|--------|---------|
| TypeScript 編譯 | ✅ PASS | No errors |
| app.json 完整性 | ✅ PASS | name=true, bundleId=true, package=true |
| Storage Keys (203 keys) | ✅ PASS | 60+ required, 203 found |
| i18n 文件 (en + zh) | ✅ PASS | Both exist, all keys aligned |
| 主要入口文件 | ✅ PASS | All found |
| package.json 有效性 | ✅ PASS | 22 dependencies, main=expo-router/entry |
| .env.example | ✅ PASS | Found |

**Location:** `JobbleBaby/__tests__/smoke/smoke-tests.ts`
**Command:** `npm run test:smoke`
**Report:** `JobbleBaby/runtime/logs/tests/2026-06-24T02-43-59-569Z/report.md`

---

### B. 單元測試 (Unit Tests) ✅ 31/31 PASS
| Test File | Status | Tests |
|-----------|--------|------:|
| `unit/safe-storage.test.ts` | ✅ PASS | 10 |
| `unit/storage-keys.test.ts` | ✅ PASS | 7 |
| `unit/i18n.test.ts` | ✅ PASS | 8 (previously 7/8 — 1 key parity fix applied) |
| `unit/theme.test.ts` | ✅ PASS | 5 |

**Command:** `npm run test:unit`

**🔧 Fix Applied This Run:**
- **i18n parity fix**: 57 missing keys in `zh.json` were added:
  - Full `feedingReadinessMultisensor` section (sectionA–E) — 53 keys
  - `tabs.tabs.feedingReadinessNavigator` and `tabs.tabs.cryAcoustic` — 2 keys
  - All keys now exist in both en.json and zh.json ✅

---

### C. 後端 API 整合測試
**不適用** — Jobble Baby 是純客戶端應用，無後端服務器。

---

### D. 前端 Mocked 測試 (Frontend Mocked Tests) ✅ 21/21 PASS
| Test File | Status | Coverage |
|-----------|--------|----------|
| `mocked/HomeScreen.test.tsx` | ✅ PASS | Quick Entry, projection card, profile loading |
| `mocked/BottleFeedingScreen.test.tsx` | ✅ PASS | Nipple levels, Log Session, a11y labels |
| `mocked/EmergencySOSScreen.test.tsx` | ✅ PASS | Panic button, 4-7-8 breathing, checklist, Quick Dial |
| `mocked/MilestonesScreen.test.tsx` | ✅ PASS | Milestone types, Brain Builder, Gallery |

**Command:** `npm run test:mocked`

**Coverage Gaps (known):**
- ~100+ tab screens still lack mocked component tests
- Tab navigation switching tests not yet written
- Language/theme toggle tests not yet written

---

### E. 前端非模擬測試 (Mode B) ❌ 未建立
| Status | Details |
|--------|---------|
| **缺失** | `docs/testing/frontend-mode-b-tests.md` exists but no actual test files |

**What is needed:**
- Expo Testing Runner with mocked AsyncStorage factory
- Screen-to-screen navigation tests
- Deep link handling tests

---

### F. E2E 用戶流程測試 (Detox) ⚠️ Framework exists
| Test File | Status | Coverage |
|-----------|--------|----------|
| `e2e/e2e.test.ts` | ⚠️ Framework present | Onboarding, Quick Entry, Tab nav, SOS, data persistence |

**Command:** `npm run test:e2e`
**Requirement:** iOS Simulator or Android Emulator (not run in this CI environment)
**CI Status:** Detox tests not executed in this run — require native device/emulator

---

### G. 外部 API / Provider / Agent 測試
**不適用** — 無外部 API、AI provider 或 agent。

---

### H. 回歸測試 (Regression Tests) ⚠️ 8 PASS / 3 FAIL

| Test | Status | Bug |
|------|--------|-----|
| `regression_004_phototherapy_i18n.test.ts` | ✅ PASS (6/6) | RT-004: Phototherapy hardcoded strings → fixed |
| `regression_005_quick_entry_fab_onpress.test.ts` | ❌ FAIL (3/5) | RT-005: FAB buttons missing onPress |
| | ✅ PASS (2/5) | Storage import present; handler pattern exists |

**RT-005 Failures (3 tests):**
1. `test_quick_entry_fab_touchableopacity_has_onpress` — FAB TouchableOpacity has NO `onPress` prop
2. `test_quick_entry_fab_row_has_router_navigation` — No `router.push`/`router.replace` in FAB area
3. `test_quick_entry_fab_accessibility_declares_action_but_no_handler` — 1 TouchableOpacity missing `onPress=`

**Evidence:** `app/(tabs)/index.tsx` lines 364–373:
```tsx
<TouchableOpacity
  accessibilityLabel={`Add ${entry.label} entry`}
  accessibilityHint={`Tap to log a ${entry.label.toLowerCase()} entry`}
  style={[styles.fab, { backgroundColor: entry.color, minHeight: 44, minWidth: 44 }]}
  activeOpacity={0.7}
  // ← MISSING: onPress={...} handler
>
```

**Fix Required:** Add `onPress={() => handleQuickAdd(entry)}` to each FAB TouchableOpacity, and implement `handleQuickAdd` function that writes to AsyncStorage and navigates to the appropriate screen.

---

### I. 效能/穩定性測試 ❌ 未建立
| Status | Details |
|--------|---------|
| **缺失** | `docs/testing/performance-tests.md` exists but no test implementation |

**Required tests:**
- Initial load request count (should be 0 — pure local)
- Tab switch response time threshold (< 500ms)
- List scroll FPS (should be 60 FPS)
- Deep link response time

---

### J. 無障礙/UX 測試 ✅ 17/17 PASS (with caveat)

| Test File | Status | Coverage |
|-----------|--------|----------|
| `a11y/a11y.test.ts` | ✅ PASS | WCAG 2.1 AA checks, color contrast, touch targets, error states |

**Command:** `npm run test:a11y`

**🔧 Fix Applied This Run:**
- Removed `__tests__/a11y/` from `jest.config.js` `testPathIgnorePatterns` — tests were being silently skipped
- Tests now run and pass (17/17)

**⚠️ Caveat:** These tests are **placeholder-level** — they check string constants and color formats rather than rendering real components and asserting on `accessibilityLabel` props. True a11y coverage requires RTL component rendering.

---

## i18n Fix Detail

**Problem:** `i18n.test.ts` failing — 57 keys in `en.json` absent from `zh.json`

**Root cause:** New `feedingReadinessMultisensor` section (53 keys) and `tabs.tabs.*` nested tab keys (2 keys) added to `en.json` without corresponding zh.json updates

**Fix:** Added all 57 missing keys to `app/i18n/zh.json`:
- Full `feedingReadinessMultisensor` section translated to Traditional Chinese
- `tabs.tabs.feedingReadinessNavigator` = "加固準備"
- `tabs.tabs.cryAcoustic` = "哭聲指紋"

**Verification:** `i18n.test.ts` now passes 8/8 ✅

---

##仍未覆蓋的風險

### 高優先級

1. **RT-005 未修復** — Quick Entry FAB 按鈕缺少 `onPress` handler，3個回歸測試FAIL。用戶點擊按鈕無任何反應。
   - 位置: `app/(tabs)/index.tsx` lines 364–373
   - 修復: 添加 `onPress={() => handleQuickAdd(entry)}` + implement `handleQuickAdd`

2. **Mode B 測試完全缺失** — 無法驗證真實 navigation chain、screen 間數據傳遞、deep link

3. **Mocked 測試覆蓋不足** — 107 個 .tsx 文件中只有 4 個有組件測試（HomeScreen, BottleFeedingScreen, EmergencySOSScreen, MilestonesScreen）

### 中優先級

4. **效能測試缺失** — 無法量化 Tab 切換速度、Scroll FPS、initial load 時間

5. **E2E 測試未在 CI 執行** — Detox 需要模擬器，GitHub Actions 未配置 iOS/Android emulator

6. **a11y 測試是 Placeholder** — 17 個測試都通過，但只測字串常量，未 render 真實組件並檢查 `accessibilityLabel`/`accessibilityHint` 是否存在

7. **jest.config.js preset 變更** — 從 `jest-expo` 改為 `@react-native/jest-preset`，需確認所有需要 expo 的測試仍正常運行

### 低優先級

8. **回歸測試只有 2 個** — RT-004, RT-005，需持續補充新 bug

9. **Coverage threshold 30%** — 門檻過低，實際代碼覆蓋可能更低

10. **Mock AsyncStorage 工廠** (`mockAsyncStorage.ts`) 存在但未被所有測試充分使用

---

## Artifacts

- Smoke report: `JobbleBaby/runtime/logs/tests/2026-06-24T02-43-59-569Z/report.md`
- Test code: `JobbleBaby/__tests__/`
- Docs: `JobbleBaby/docs/testing/` + `docs/testing/`
- Source: `JobbleBaby/app/`
- i18n: `JobbleBaby/app/i18n/en.json` + `zh.json`

---

*Report generated: 2026-06-24T02:44:12.000Z*
*By: Jobble Baby Testing Agent (Hermes)*
