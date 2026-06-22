# A. 煙霧測試 (Smoke Tests)

## 執行方式
```bash
npm run test:smoke
```
內部調用：`npx tsx __tests__/smoke/smoke-tests.ts`

## 測試範圍

| 檢查項 | 期望 | 實際結果 |
|--------|------|----------|
| TypeScript 編譯 | `tsc --noEmit` 通過 | ❌ FAIL — jest types 未安裝 |
| app.json 完整性 | name, bundleId, package 存在 | ✅ PASS |
| Storage Keys | 60+ keys 存在 | ✅ PASS — 189 keys |
| i18n 文件 | en.json + zh.json 存在 | ✅ PASS |
| 主要入口文件 | app/(tabs)/index.tsx 等存在 | ✅ PASS |
| package.json 有效性 | dependencies 正確 | ✅ PASS |
| .env.example | 文件存在 | ✅ PASS |

## 已知問題

**TypeScript 編譯失敗** — `jest` 和 `@types/jest` 已經安裝，但 `tsconfig.json` 的 `types` 陣列可能需要包含 `jest`。檢查 `tsconfig.test.json` 是否被正確引用。

## 改進方向

- 加入 `__tests__/smoke/` 內的組件引用完整性檢查（imports 是否有斷裂）
- 加入 `expo-router` 頁面文件對比 `app/` 目錄結構
- 加入 `.env.example` vs 實際 `.env` key 完整性檢查
