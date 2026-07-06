# 煙霧測試 (Smoke Tests) 詳情

> 目的：用最短時間確認項目基本可啟動

## 運行方式

```bash
cd JobbleBaby
npm run test:smoke
# 或直接運行
npx ts-node --project tsconfig.test.json __tests__/smoke/smoke-tests.ts
```

## 測試項目

### 1. TypeScript 編譯檢查
- 運行 `tsc --noEmit`
- 期望：無錯誤輸出
- 失敗時：截取前 500 字節錯誤輸出

### 2. app.json 完整性
檢查以下字段存在：
- `expo.name`
- `ios.bundleIdentifier`
- `android.package`

### 3. Storage Keys 數量
- 期望：60+ keys
- 實際：約 221 keys

### 4. i18n 文件
- `app/i18n/en.json` 存在
- `app/i18n/zh.json` 存在

### 5. 主要入口文件
- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `App.tsx`
- `index.ts`
- `store/storage-keys.ts`
- `app/utils/SafeStorage.ts`

### 6. package.json 有效性
- 有 `dependencies`
- 有 `main` 字段

### 7. .env.example
- 存在環境變量示例文件

## 輸出位置

```
runtime/logs/tests/<timestamp>/
└── report.md
```

## 失敗處理

如果 smoke test 失敗：
1. **TypeScript 錯誤** → 本地運行 `npx tsc --noEmit` 查看詳細錯誤
2. **文件缺失** → 檢查 git status 確認是否有未追蹤文件
3. **依賴問題** → 運行 `npm install` 重新安裝
