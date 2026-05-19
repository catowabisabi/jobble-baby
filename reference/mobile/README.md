# AI Job Scraper - React Native Mobile App

🚀 **使用 React Native + Expo 重構的現代化移動應用**

## ✨ 新特性

- **Modern UI**: Material Design 3 設計語言，支持深色/淺色主題
- **離線優先**: 本地 SQLite 數據庫，無需網絡也能查看
- **AI 分析**: 集成 OpenAI/Groq API，智能分析職位匹配度
- **響應式設計**: 適配手機和平板設備
- **流暢動畫**: React Native Reanimated 驅動的流暢體驗

## 🏗️ 技術棧

| 層級 | 技術 |
|------|------|
| **框架** | React Native + Expo |
| **語言** | TypeScript |
| **UI** | React Native Paper (Material 3) |
| **導航** | React Navigation v6 |
| **狀態** | Zustand + persist |
| **數據庫** | expo-sqlite (SQLite) |
| **AI** | OpenAI / Groq API |
| **圖表** | react-native-chart-kit |

## 📱 功能模塊

### 職位管理
- ✨ 職位列表（卡片式佈局）
- 🔍 全文搜索（FTS5）
- 🏷️ 狀態標籤（新/已看/已申/面試/錄取/拒絕/歸檔）
- ❤️ 收藏功能
- 📝 筆記功能
- 🤖 AI 匹配度評分

### 公司管理
- 🏢 公司列表
- 📊 爬取統計
- ✅ 啟用/禁用監控

### 數據分析
- 📈 職位統計儀表板
- 🥧 狀態分佈圖
- 📊 數據趨勢

### 設置
- 🎨 主題切換
- 🔑 AI API 配置
- 🔔 通知設置

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd mobile
npm install
```

### 2. 啟動開發服務器

```bash
npx expo start
```

### 3. 運行應用

- **iOS**: 按 `i` 或掃描 QR 碼使用 Expo Go
- **Android**: 按 `a` 或掃描 QR 碼使用 Expo Go
- **Web**: 按 `w` 運行 Web 版本

## 📁 項目結構

```
mobile/
├── src/
│   ├── api/              # API 客戶端
│   ├── components/       # 共享組件
│   │   ├── JobCard.tsx
│   │   └── FilterSheet.tsx
│   ├── constants/        # 常量配置
│   ├── database/         # SQLite 數據庫
│   ├── models/           # TypeScript 類型
│   ├── navigation/       # 路由配置
│   ├── screens/          # 頁面組件
│   │   ├── JobsScreen.tsx
│   │   ├── JobDetailScreen.tsx
│   │   ├── CompaniesScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ScrapingScreen.tsx
│   ├── services/         # 業務邏輯
│   │   ├── ai.ts
│   │   └── database.ts
│   ├── store/            # Zustand 狀態管理
│   ├── theme/            # 主題配置
│   └── utils/            # 工具函數
├── App.tsx              # 應用入口
├── package.json
└── tsconfig.json
```

## 🔧 配置 AI

在設置頁面配置以下內容：

### OpenAI
- Provider: `openai`
- API Key: 你的 OpenAI API Key
- Model: `gpt-4o-mini`

### Groq
- Provider: `groq`
- API Key: 你的 Groq API Key
- Model: `llama-3.1-70b-versatile`

### 本地 vLLM
- Provider: `local`
- Base URL: `http://localhost:8000/v1`
- Model: `Qwen3-4B-Instruct`

## 📝 待辦事項

- [ ] 接入實際爬蟲 API
- [ ] 推送通知
- [ ] 數據備份/恢復
- [ ] 多語言支持
- [ ] 指紋/面容識別

## 📄 許可證

MIT License
