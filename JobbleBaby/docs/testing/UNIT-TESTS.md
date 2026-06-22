# B. 後端單元測試 (Backend Unit Tests)

## 執行方式
```bash
npm run test:unit
# 或直接: npm test -- --testPathPattern="__tests__/unit"
```

## 測試套件

### ✅ safe-storage.test.ts (11/11 PASS)
SafeStorage wrapper 封裝了 AsyncStorage 的錯誤處理。

**覆蓋內容：**
- `safeGetItem`: 不存在的 key → null ✓
- `safeGetItem`: 正常讀取 → 返回字符串 ✓
- `safeGetItem`: AsyncStorage 錯誤 → 返回 null ✓
- `safeSetItem`: 成功 → true ✓
- `safeSetItem`: 實際寫入驗證 ✓
- `safeSetItem`: AsyncStorage 錯誤 → false ✓
- `safeSetItem`: 覆蓋舊值 ✓
- `safeRemoveItem`: 成功 → true ✓
- `safeRemoveItem`: key 不存在 → true ✓
- `safeRemoveItem`: AsyncStorage 錯誤 → false ✓

**風險評估：** 覆蓋完整，但未測試併發寫入場景。

---

### ✅ i18n.test.ts (9/9 PASS)
**覆蓋內容：**
- en.json + zh.json 文件存在 ✓
- zh.json 包含所有 en.json key ✓
- tabs / home / common/action 翻譯 ✓
- 總 key 數 > 100 ✓
- 16+ tabs 翻譯 ✓
- SOS/emergency 翻譯 ✓

**風險評估：** 覆蓋語言文件存在性，但未測試翻譯值的語義正確性。

---

### ✅ theme.test.ts (6/6 PASS) — **FIXED 2026-06-22**

**修復內容：**
- `ThemeColors` 介面實際只有 6 個顏色：`background`, `card`, `border`, `accent`, `text`, `muted`
- 測試已更新為檢查這 6 個實際存在的顏色
- `surface` 概念由 `card` 表達（測試已更新）
- `error` / `warning` / `good` 顏色位於 `STATUS_COLORS`（不是 `COLORS.light/dark`）— 測試已更新為檢查 `STATUS_COLORS`

**當前覆蓋：**
- light/dark 主題顏色存在 ✓
- 6 個必需顏色屬性存在於 light 和 dark ✓
- 所有顏色是有效 hex 格式 ✓
- background ≠ card（區分度）✓
- STATUS_COLORS.error/warning/good 存在且為 hex ✓

---

### ✅ storage-keys.test.ts (6/6 PASS) — **FIXED 2026-06-22**

**修復內容：**
- 正則表達式 `/^[A-Z_]+$/` → `/^[A-Z_][A-Z0-9_]*$/`（允許 `FEEDING_READINESS_1` 等數字後綴）
- `CUPS_FEEDING_ENTRIES` → `CUP_FEEDING_ENTRIES`（單數 Cup，符合實際 key）

**當前覆蓋：**
- 核心 keys 全部存在 ✓
- 180+ 總 keys ✓
- 所有 values 有 `@jobble/` 前綴 ✓
- 所有 keys 匹配 `/^[A-Z_][A-Z0-9_]*$/` ✓
- 無重複 values ✓
- 餵養相關 keys 存在 ✓
- 發育相關 keys 存在 ✓
- 壓力/照顧者 keys 存在 ✓

---

## 數據隔離原則
單元測試使用 `jest.clearAllMocks()` 在每個 `beforeEach` 中隔離。AsyncStorage 使用 `AsyncStorage.clear()`。不涉及真實 database。
