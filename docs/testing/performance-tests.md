# I. 效能 / 穩定性測試 (Performance / Stability Tests)

> **目的：** 找出卡死、request storm（大量請求）、過慢、memory leak
>
> **狀態：** ❌ 未建立 — 0 tests — CRITICAL GAP

## 概述

Jobble Baby 是純本地客戶端 app，無網路請求。主要效能風險在於：
- React Native 渲染效能（大量列表滑動）
- AsyncStorage 讀寫延遲
- Navigation 響應時間
- 內存洩漏（長時間使用後）

## 測試矩陣

### 1. Initial Load Performance

要測：
- [ ] App 初始載入時間（從點擊 icon 到 HomeScreen 顯示）
- [ ] TypeScript 編譯時間
- [ ] AsyncStorage 初始化 keys 數量（213 keys）

Threshold：
- 初始載入：< 3 秒（在模擬器上）
- TSC 編譯：< 10 秒

### 2. Idle Request Count

要測：
- [ ] App idle 30 秒內的 AsyncStorage 讀取次數（應為 0）
- [ ] 確認沒有定時 polling

### 3. Tab Switch Latency

要測：
- [ ] 切換每個 tab 的響應時間
- [ ] 連續快速切換 10 次不卡死

Threshold：< 500ms per switch

### 4. List Scroll Performance

要測：
- [ ] `GrowthScreen` 渲染 100 個 growth entries
- [ ] `TimelineScreen` 渲染 200 個 events
- [ ] 確認保持 60 FPS

### 5. Rapid Create/Delete

要測：
- [ ] 快速創建 10 個 tracking entries（每秒 1 個）
- [ ] 快速刪除 10 個 entries
- [ ] 驗證 UI 不卡死

### 6. Memory Leak Detection

要測：
- [ ] 重複進出台階記錄 screen 20 次
- [ ] 檢查 JS heap 大小不持續增長

### 7. Long Streaming Response

N/A — 無 streaming（純本地 app）

## 技術方案

### 工具

- **Jest + perf_hooks：** Node.js `performance` API 測量 JS 邏輯
- **React DevTools Profiler：** 手動檢查 component render 次數
- **iOS Instruments (Time Profiler)：** 真實設備效能分析（需要 Mac）
- **Android Profiler：** 真實設備效能分析（需要 Android 設備）

### 實現示例

```typescript
// __tests__/performance/perf-screen-mount.test.ts
import { performance, PerformanceObserver } from 'perf_hooks';

describe('I. Performance Tests', () => {
  it('should render GrowthScreen with 100 entries under 1s', async () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: `growth-${i}`,
      date: new Date().toISOString(),
      weight: 3.5 + i * 0.01,
    }));

    const start = performance.now();
    
    // Render with 100 entries
    render(<GrowthScreen entries={entries} />);
    
    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // < 1 second
  });

  it('should not exceed 10 AsyncStorage reads on initial mount', async () => {
    const mockStorage = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
    mockStorage.clear();
    
    render(<HomeScreen />);
    
    // Count how many times getItem was called
    const getItemCalls = mockStorage.getItem.mock.calls.length;
    expect(getItemCalls).toBeLessThanOrEqual(10);
  });
});
```

## 命令

```bash
cd JobbleBaby
npm run test:performance    # Jest performance tests
# Or manually with react-native-performance tools
```

## 輸出

```
runtime/logs/tests/<timestamp>/
├── perf-report.md
├── heap-snapshots/
├── trace.json
└── fps-log.csv
```

## Threshold Reference

| Metric | Threshold | Tool |
|--------|-----------|------|
| Initial load | < 3s | `Date.now()` |
| Tab switch | < 500ms | `performance.now()` |
| List render (100 items) | < 1s | `performance.now()` |
| AsyncStorage reads (mount) | ≤ 10 | Jest mock call count |
| Memory (after 20 nav cycles) | < 2x baseline | `process.memoryUsage()` |
| FPS (scroll) | ≥ 55 | RN Performance Monitor |

## 實現步驟

1. [ ] 建立 `__tests__/performance/` 目錄
2. [ ] 建立 screen mount performance tests
3. [ ] 建立 AsyncStorage call count tests
4. [ ] 建立 rapid navigation tests
5. [ ] 設定 CI threshold gates
6. [ ] 整合進 `npm run test:all`
