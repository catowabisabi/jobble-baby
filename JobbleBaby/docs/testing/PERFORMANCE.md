# I. 效能/穩定性測試 (Performance / Stability Tests)

## 狀態：❌ 未實現

## 目標
找出卡死、request storm、過慢、memory leak。

## 建議測試內容

### 1. 初始載入 request count
```
頁面加載後 10 秒內不應發送超過 N 個 API 請求
```

### 2. Idle 30 秒 request count
```
閒置 30 秒後不應每秒大量 fetch 同一 endpoint
```

### 3. Heavy click 後 request count
```
快速點擊按鈕後應有防抖，不應觸發 N 個重複請求
```

### 4. 重複 refresh
```
連續刷新 5 次，每次 request count 應相近（無累積性 request storm）
```

### 5. 重複 create/delete
```
快速創建/刪除 10 個 entry，應有隔離/防抖
```

### 6. 大列表渲染
```
100+ items 的 timeline 渲染不應卡 UI thread
```

### 7. Long streaming response（如適用）
```
Streaming 響應應逐步顯示，不應等最後一次才全部出現
```

### 8. Slow backend response
```
Backend 回應 >3 秒時，UI 應有 loading state，不應讓用戶以為卡死
```

### 9. Server restart recovery
```
Server 重啟後，App 應正確恢復，無 404/500 未處理錯誤
```

## 測試策略

### 測量工具
- **React Native**: `react-native Performance` API, `InteractionManager`
- **Network**: 自定義 `fetch` wrapper 記錄 request count
- **Memory**: `console.log` / `react-native` memory monitor

### 測量方式
```typescript
// 範例：初始載入 request count
let requestCount = 0;
const originalFetch = window.fetch;
window.fetch = (...args) => {
  requestCount++;
  return originalFetch(...args);
};

// 導航到首頁
await router.push('/');

// 等待 10 秒
await new Promise(r => setTimeout(r, 10000));

expect(requestCount).toBeLessThan(10);
```

## Threshold 標準

| 場景 | Threshold |
|------|-----------|
| 初始載入 request count | ≤ 15 |
| Idle 30s request count | ≤ 2 |
| Heavy click 後 1s 內 request | ≤ 3 |
| Create entry 到 UI 更新 | ≤ 2000ms |
| Loading indicator 出現 | ≤ 300ms（在 slow response 前） |

## 執行方式（目標）
```bash
npm run test:performance
```

## 依賴
- Expo SDK 56+ testing APIs
- 可能需要客製化 fetch wrapper
