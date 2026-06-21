# Jobble Baby 測試體系建立報告

**日期：** 2026-06-21  
**狀態：** ✅ 測試架構已建立，測試框架已就緒  
**Smoke Test 結果：** 6/7 PASS（1 BLOCKED — jest 依賴未安裝）

---

## 📋 項目概覽

| 項目 | 技術 |
|------|------|
| 框架 | Expo SDK 56 / React Native 0.85.3 |
| 語言 | TypeScript 5.3 |
| 導航 | Expo Router (file-based) |
| 數據層 | AsyncStorage (60+ keys, 實際 189) |
| 構建 | EAS Build + Expo prebuild |
| **重要** | **純客戶端移動應用，無後端** |

---

## ✅ 已建立測試架構

### 目錄結構

```
JobbleBaby/__tests__/
├── smoke/
│   └── smoke-tests.ts          # A. 煙霧測試
├── unit/
│   ├── safe-storage.test.ts    # B. SafeStorage 單元測試
│   ├── storage-keys.test.ts    # B. Storage Keys 驗證
│   ├── i18n.test.ts            # B. 國際化一致性
│   └── theme.test.ts           # B. 主題顏色
├── mocked/
│   └── HomeScreen.test.tsx     # D. 前端 Mocked 測試
├── e2e/
│   └── e2e.test.ts             # F. E2E 用戶流程測試
├── a11y/
│   └── a11y.test.ts            # J. 無障礙/UX 測試
└── helpers/
    ├── mockAsyncStorage.ts     # Mock 工廠
    └── createReport.ts         # 報告生成器

docs/testing/
├── README.md                    # 測試體系總覽
├── smoke-tests.md              # 煙霧測試詳情
├── backend-tests.md            # 單元測試詳情
├── frontend-mocked-tests.md    # Mocked 測試詳情
├── user-workflow-tests.md      # E2E 測試詳情
├── regression-tests.md         # 回歸測試模板
├── test-database-strategy.md  # 測試數據策略
└── test-database-strategy.md  # 測試數據策略

配置文件:
├── jest.config.js              # Jest 配置
└── tsconfig.test.json          # 測試 TypeScript 配置
```

### Smoke Test 結果

| 測試項目 | 結果 | 詳情 |
|---------|------|------|
| TypeScript 編譯 | ⚠️ BLOCKED | jest types 未安裝（預期） |
| app.json 完整性 | ✅ PASS | name, bundleId, package 都存在 |
| Storage Keys 數量 | ✅ PASS | 189 keys（預期 60+） |
| i18n 文件 | ✅ PASS | en.json + zh.json 都存在 |
| 主要入口文件 | ✅ PASS | _layout, index, App.tsx 等都存在 |
| package.json 有效性 | ✅ PASS | 22 個依賴 |
| .env.example | ✅ PASS | 存在 |

---

## 📦 部署前需安裝的測試依賴

```bash
cd JobbleBaby
npm install --save-dev \
  jest \
  @types/jest \
  jest-expo \
  @testing-library/react-native \
  @testing-library/jest-native \
  detox \
  @types/detox
```

---

## 🔧 測試命令

| 命令 | 描述 |
|------|------|
| `npm run test:smoke` | 運行煙霧測試 |
| `npm run test:unit` | 運行單元測試 |
| `npm run test:mocked` | 運行 Mocked 組件測試 |
| `npm run test:a11y` | 運行無障礙測試 |
| `npm run test:e2e` | 運行 E2E 測試（需要模擬器） |
| `npm run test:all` | 運行所有測試 |

---

## ⚠️ 仍未覆蓋的風險

### 高優先級

1. **無 E2E 測試環境** — Detox 需要 iOS Simulator 或 Android Emulator，目前環境未配置
2. **Mocked 測試數量不足** — 目前只有 HomeScreen 一個測試文件
3. **缺少回歸測試** — 沒有把已知 bug 轉化為永久測試

### 中優先級

4. **未測試所有 60+ AsyncStorage keys** — 只驗證了 keys 存在，未驗證讀寫邏輯
5. **未測試所有 16+ Tab screens** — 只有 HomeScreen 有測試
6. **i18n 翻譯覆蓋率未驗證** — 雖然檢查了文件存在，但未檢查翻譯完整性
7. **無效能測試** — 沒有測量 render performance、scroll FPS

### 低優先級

8. **無安全性測試** — 未測試敏感數據存儲
9. **無網絡錯誤處理測試** — App 無網絡依賴，但有 deep link
10. **無多語言 RTL 支持測試** — 只有 LTR 語言

---

## 📝 下一步行動

1. **安裝測試依賴** — `npm install --save-dev jest @types/jest jest-expo @testing-library/react-native`
2. **運行 `npm run test:unit`** — 驗證單元測試框架工作正常
3. **為每個 Tab Screen 添加 Mocked 測試**
4. **配置 Detox 環境** — 設置 iOS Simulator 或 Android Emulator
5. **添加回歸測試** — 記錄並測試已修復的 bug
6. **添加效能測試** — 測量 initial load time、scroll FPS

---

## 📊 測試矩陣（當前狀態）

| 層級 | 測試類型 | 工具 | 框架狀態 | 測試數量 |
|------|----------|------|---------|---------|
| A | 煙霧測試 | shell + tsc | ✅ 就緒 | 7 checks |
| B | 單元測試 | Jest | ⚠️ 需安裝依賴 | 4 test files |
| D | 前端 Mocked | Jest + RTL | ⚠️ 需安裝依賴 | 1 test file |
| F | E2E 流程 | Detox | ⚠️ 需配置環境 | 1 test file |
| H | 回歸測試 | Jest | ⚠️ 需添加 | 0 |
| I | 效能測試 | Detox | ⚠️ 需配置環境 | 0 |
| J | 無障礙/UX | jest-a11y | ⚠️ 需安裝依賴 | 1 test file |

**不適用：** C（後端 API）、G（外部 API）— 此項目無後端
