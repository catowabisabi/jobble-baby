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

**風險評估：** 覆蓋語言文件存在性，但未測試翻譯值的語義正確性（如「餵奶」vs「餵奶時間」）。

---

### ❌ theme.test.ts (3/5 FAIL)

**失敗原因：** `app/theme.ts` 的 `ThemeColors` 接口與測試期望不匹配。

測試期望 10 個顏色：
```
background, surface, primary, secondary, text, textSecondary,
border, error, success, warning
```

實際只有 6 個：
```
background, card, border, accent, text, muted
```

**需要修復：**
1. **方案A（推薦）：** 更新 `app/theme.ts` 的 `ThemeColors` 接口，增加缺失的顏色，並在 `COLORS` 對象中提供值
2. **方案B：** 更新測試以匹配當前 6 色設計

**Critical Risk:** `surface` 和 `card` 都用於背景區分，`primary`/`secondary` 替代了 `accent`。需要與設計團隊確認正確的顏色集合。

---

### ❌ storage-keys.test.ts (4/6 FAIL)

**失敗原因1：** `FEEDING_READINESS_1` 等 numbered keys 不匹配正則 `/^[A-Z_]+$/`

```ts
// 測試正則：不允許數字
expect(key).toMatch(/^[A-Z_]+$/);

// 實際 keys：允許數字後綴
FEEDING_READINESS_1: "@jobble/feeding_readiness_1"
FEEDING_READINESS_2: "@jobble/feeding_readiness_2"
...
```

**修復：** 將正則改為 `/^[A-Z_][A-Z0-9_]*$/`

**失敗原因2：** `MILK_TRANSFER_HISTORY` 和 `CUPS_FEEDING_ENTRIES` 不存在

- 實際存在：`FEEDING_EFFICIENCY`（並非 `MILK_TRANSFER_HISTORY`）
- 實際存在：`CUP_FEEDING_ENTRIES`（單數 Cups → 單數 Cup）

**修復：** 將測試中的 key 改為實際存在的名稱，或在 `store/storage-keys.ts` 中添加這些 key

---

## 數據隔離原則
單元測試使用 `jest.clearAllMocks()` 在每個 `beforeEach` 中隔離。不涉及真實 database。
