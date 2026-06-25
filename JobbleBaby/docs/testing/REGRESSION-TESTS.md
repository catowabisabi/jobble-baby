# H. 回歸測試 (Regression Tests)

## 執行方式
```bash
npm run test:unit -- --testPathPattern="__tests__/regression"
# 或
npm test -- --testPathPattern="__tests__/regression"
```

## 目標
把曾經發生的 bug 變成永久測試，防止再次出現。

## 命名規則
每個 regression test 文件格式：`regression_<id>_<short-name>.test.ts`

命名包含 bug 症狀關鍵詞，例如：
- `test_no_request_storm_on_initial_load`
- `test_missing_folder_relink_closes_modal`
- `test_phototherapy_i18n_hardcoded_strings`
- `test_new_item_persists_after_refresh`

## 模板結構
```typescript
/**
 * Regression Test: RT-XXX — <Short Bug Description>
 *
 * Bug: <what was wrong>
 * Fix: <task/commit that fixed it>
 * Date: YYYY-MM-DD
 * Commit: <git hash>
 *
 * 症狀：<user-facing symptom>
 * 根因：<technical root cause>
 *
 * 驗證方式：
 * 1. <step 1>
 * 2. <step 2>
 */
describe('Regression: RT-XXX <Title>', () => {
  describe('Bug Prevention', () => {
    it('test_<specific_behavior>', () => {
      // Verify the bug no longer exists
    });
  });

  describe('Fix Verification', () => {
    it('test_fix_still_works', () => {
      // Confirm the fix is still in place
    });
  });
});
```

## 現有回歸測試

### ✅ RT-004 — Phototherapy Comfort i18n Hardcoded Strings

**文件：** `__tests__/regression/regression_004_phototherapy_i18n.test.ts`

**Bug：** `phototherapy-comfort.tsx` 包含 hardcoded 英文字符串，而非使用 `t()` i18n 調用。

**Fix：** Task #469 — 將 hardcoded 字符串替換為 `t('photoComfort.*')` 調用。Commit: `bef5c9801b0e914f163539724ec982d434f0b504`

**覆蓋：**
| 測試場景 | 狀態 |
|----------|------|
| 無可見 hardcoded 字符串 | ✅ |
| i18n keys 在 en.json 存在 | ✅ |
| i18n keys 在 zh.json 存在 | ✅ |
| lampTypes 使用 ti() 翻譯 | ✅ |
| checklist 使用翻譯 | ✅ |
| 使用 safeStorage（非 raw AsyncStorage） | ✅ |
| 使用 STORAGE_KEYS（非 hardcoded key） | ✅ |

**風險：** 測試使用源碼靜態分析（fs.readFileSync），未實際渲染組件。如果翻譯 key 存在但翻譯值是英文（無中文翻譯），測試無法捕獲。

**建議擴展：** 添加組件實際渲染測試，驗證切換語言時 UI 實際變化。

---

### 🔴 待加入的回歸測試

#### RT-005 — Quick Entry FAB 無 onPress Handler（已知 bug）

**狀態：** ✅ 回歸測試已實現（`__tests__/regression/regression_005_quick_entry_fab_onpress.test.ts`）
**測試結果：** 3/5 FAIL（bug 已確認存在）

**Bug：** `app/(tabs)/index.tsx` Quick Entry FAB 按鈕渲染但無 onPress handler。

**根因：** `TouchableOpacity` 缺少 `onPress` 屬性，只有 `activeOpacity={0.7}`。

**修復位置：** `app/(tabs)/index.tsx` lines 364-373

**驗證方式：**
```bash
npx jest --testPathPattern="__tests__/regression/regression_005"
# Expected: 3 FAIL until bug is fixed
```

**Bug 確認證據：**
- `test_quick_entry_fab_touchableopacity_has_onpress` — FAIL：0 onPress in FAB TouchableOpacity
- `test_quick_entry_fab_row_has_router_navigation` — FAIL：router.push not found in FAB section
- `test_quick_entry_fab_accessibility_declares_action_but_no_handler` — FAIL：accessibilityHint says "Tap to log" but no onPress

**Fix 需包含：**
1. 添加 `onPress={}` handler 到每個 Quick Entry TouchableOpacity
2. Handler 應調用 router.push 或直接寫入 storage
3. 建議：使用 `handleQuickAdd(entry)` 函數或 `router.push('/tracking?type=diaper')` 之類的路徑

---

#### RT-006 — Theme Colors 介面不一致（已修復）

**症狀：** `theme.test.ts` 期望 8 個顏色，但 `ThemeColors` 只有 6 個。

**根因：** `error/warning/good` 位於 `STATUS_COLORS`，非 `COLORS.light/dark`。

**修復日期：** 2026-06-22

**測試方式：** 已由 `__tests__/unit/theme.test.ts` 覆蓋。

---

#### RT-007 — Storage Keys 正則不允許數字後綴（已修復）

**症狀：** `CUPS_FEEDING_ENTRIES` 拼寫錯誤（`CUPS` → `CUP`），正則 `/^[A-Z_]+$/` 不允許 `FEEDING_READINESS_1`。

**修復日期：** 2026-06-22

**測試方式：** 已由 `__tests__/unit/storage-keys.test.ts` 覆蓋。

---

## 失敗分類

所有 regression failure 需標記類型：

| 分類 | 描述 |
|------|------|
| `ui-state-stale` | UI 狀態未正確更新 |
| `db-not-persisted` | 數據未正確持久化 |
| `i18n-hardcoded` | 硬coded 字符串未使用翻譯 |
| `storage-key-wrong` | Storage key 錯誤或拼寫錯誤 |
| `api-contract-mismatch` | API response shape 與預期不符 |
| `modal-blocking` | Modal 無法關閉 |
| `request-storm` | 初始載入發送過多請求 |

## 覆蓋矩陣

|||| Test ID | 覆蓋類型 | 狀態 |
||---------|---------|--------|------|
||| RT-004 | i18n hardcoded prevention | ✅ 6/6 PASS |
||| RT-005 | Quick Entry FAB onPress | ⚠️ 2/5 PASS (3 FAIL = known bug, unfixed since cycle 500) |

**Note:** RT-006 (Theme colors) and RT-007 (Storage keys) are covered by unit tests in `__tests__/unit/theme.test.ts` and `__tests__/unit/storage-keys.test.ts`, not as standalone regression files.
