# 前端 Mocked 測試 (Frontend Mocked Tests) 詳情

> 目的：使用 mocked AsyncStorage 測試 React 組件狀態、UI 行為

## 運行方式

```bash
cd JobbleBaby
npm run test:mocked
```

## 測試框架

- **Jest** — 測試運行器
- **React Native Testing Library** — 組件渲染和交互
- **@testing-library/jest-native** — React Native 特有 matcher

## Mock 策略

### AsyncStorage Mock

```typescript
// 每個測試前自動清理
beforeEach(() => {
  AsyncStorage.clear();
});
```

### SafeStorage Mock

```typescript
jest.mock('../../app/utils/SafeStorage', () => ({
  safeGetItem: jest.fn().mockResolvedValue(null),
  safeSetItem: jest.fn().mockResolvedValue(true),
  safeRemoveItem: jest.fn().mockResolvedValue(true),
}));
```

### Expo Router Mock

```typescript
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }) => children,
  Tabs: ({ children }) => children,
}));
```

## 測試覆蓋範圍

### HomeScreen (`app/(tabs)/index.tsx`)

| 測試 | 描述 |
|------|------|
| 初始 loading 狀態 | 無 profile 時的 UI |
| Profile 存在時渲染 | 有 profile 時顯示內容 |
| Quick Entry 按鈕渲染 | Diaper/Feed/Sleep 按鈕可見 |
| SafeStorage 調用 | 確認 mount 時調用了正確的 key |

### i18n 一致性

| 測試 | 描述 |
|------|------|
| 中英文切換 | 切換後 UI 更新 |
| 缺失 key 處理 |  fallback 行為 |

## 測試文件

```
__tests__/
├── mocked/
│   ├── HomeScreen.test.tsx
│   └── ...
```

## 寫測試的原則

1. **每個測試獨立** — 不依賴其他測試的狀態
2. **使用 `waitFor`** — 處理 async 組件
3. **使用 `fireEvent`** — 模擬用戶交互
4. **不要測 implementation** — 只測公開 API/用戶可見行為
5. **給 mock 返回值** — 不要讓 mock 返回 undefined

## 失敗處理

1. **Mock 未生效** → 檢查 jest.mock 路徑是否正確
2. **AsyncStorage mock 不同步** → 在 beforeEach 中顯式重置
3. **Async undefined** → 確保 jest.fn() 返回 Promise 或使用 mockResolvedValue
