# A. 煙霧測試 (Smoke Tests)

## 執行方式
```bash
npm run test:smoke
```
內部調用：`npx tsx __tests__/smoke/smoke-tests.ts`

## 測試範圍

|| 檢查項 | 期望 | 實際結果 |
|--------|------|----------|
| TypeScript 編譯 | `tsc --noEmit` 通過 | ❌ FAIL — jest types not in tsconfig |
| app.json 完整性 | name, bundleId, package 存在 | ✅ PASS |
| Storage Keys | 60+ keys 存在 | ✅ PASS — 189 keys |
| i18n 文件 | en.json + zh.json 存在 | ✅ PASS |
| 主要入口文件 | app/(tabs)/index.tsx 等存在 | ✅ PASS |
| package.json 有效性 | dependencies 正確 | ✅ PASS |
| .env.example | 文件存在 | ✅ PASS |

## 已知問題

**TypeScript 編譯失敗** — `tsc --noEmit` 失敗是因為測試文件引用了 jest types，但 `tsconfig.json` 的 `types` 陣列未包含 `"jest"`。

**修復方式：** 在專案根目錄創建 `tsconfig.test.json`：
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": ["__tests__/**/*.ts", "__tests__/**/*.tsx"]
}
```
然後更新 smoke script 使用 `npx tsc --project tsconfig.test.json --noEmit`。

## 改進方向

- [x] 加入 Storage Keys 數量檢查
- [x] 加入 i18n 文件完整性檢查
- [x] 加入主要入口文件檢查
- [ ] 加入 expo-router 頁面文件對比 `app/` 目錄結構
- [ ] 加入 `.env.example` vs 實際 `.env` key 完整性檢查
- [ ] 加入 `app/theme.ts` `ThemeColors` 與 `STATUS_COLORS` 完整性檢查
