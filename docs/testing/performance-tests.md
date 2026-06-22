# 效能/穩定性測試 (Performance / Stability Tests)

> 目的：找出卡死、request storm、過慢、memory leak

## 運行方式

```bash
cd JobbleBaby
npm run test:performance
# 或
detox test --configuration ios.simulator --testNamePattern="performance"
```

## 測試閾值 (Thresholds)

| 指標 | 閾值 | 超過時 |
|------|------|--------|
| 初始載入時間 | < 3 秒 | Loading state 必須顯示 |
| Tab 切換響應 | < 500ms | Loading indicator 必須顯示 |
| 列表 Scroll | 60 FPS | 不可低於 30 FPS |
| AsyncStorage 操作 | < 100ms | Error popup 必須顯示 |
| E2E 流程完成 | < 30 秒 | Timeout 錯誤 |

---

## A. 初始載入效能 (Initial Load Performance)

### 測試目標

確認 App 首次啟動時不會發送過多 AsyncStorage 請求。

```typescript
describe('Initial Load Performance', () => {
  it('test_no_request_storm_on_initial_load', async () => {
    // 追蹤 AsyncStorage 調用次數
    const requestCount = await trackAsyncStorageCalls(() => {
      return render(<HomeScreen />);
    });
    
    // App 為純本地，初始載入不應有任何網絡請求
    // AsyncStorage 請求不應超過 10 次（加載所有 context keys）
    expect(requestCount).toBeLessThan(10);
  });
  
  it('test_initial_load_time_under_3_seconds', async () => {
    const start = performance.now();
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(3000);
  });
});
```

---

## B. Idle 狀態請求數 (Idle Request Count)

### 測試目標

確認 App 在 idle 狀態（無用戶操作）下不會持續發送請求。

```typescript
describe('Idle State Performance', () => {
  it('test_no_requests_during_idle_30_seconds', async () => {
    render(<HomeScreen />);
    await waitForHomeToLoad();
    
    // 等待 30 秒 idle
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Idle 期間不應有新的 AsyncStorage 請求
    const idleRequests = getAsyncStorageCallCount() - baselineCount;
    expect(idleRequests).toBe(0);
  });
});
```

---

## C. 快速點擊效能 (Rapid Click Performance)

### 測試目標

確認用戶快速連續點擊按鈕時，App 不會崩潰或重複寫入。

```typescript
describe('Rapid Click Performance', () => {
  it('test_rapid_tab_switching_no_crash', async () => {
    const { getByText } = renderWithProviders(<HomeScreen />);
    
    const tabs = ['Home', 'Tracking', 'Schedule', 'Products', 'Growth'];
    
    // 快速切換每個 Tab 10 次
    for (let i = 0; i < 10; i++) {
      for (const tab of tabs) {
        fireEvent.press(getByText(tab));
      }
    }
    
    // 最後應該穩定在最後一個 Tab
    await waitFor(() => {
      expect(getByText('Growth')).toBeTruthy();
    });
  });
  
  it('test_rapid_fab_tapping_no_duplicate_writes', async () => {
    await renderWithProviders(<HomeScreen />);
    
    // 快速點擊 Quick Entry 5 次
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText('Diaper'));
    }
    
    // 應該只有 1 筆記錄被寫入
    const diaperEntries = await AsyncStorage.getItem('@jobble/tracking_entries');
    const entries = JSON.parse(diaperEntries || '[]');
    expect(entries.filter(e => e.type === 'diaper').length).toBeLessThanOrEqual(1);
  });
});
```

---

## D. 列表渲染效能 (List Rendering Performance)

### 測試目標

確認大量數據（100+ 條記錄）時，列表仍能流暢滾動。

```typescript
describe('List Rendering Performance', () => {
  beforeEach(async () => {
    // 準備 100 條測試數據
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: `test-${i}`,
      type: 'diaper',
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    }));
    await AsyncStorage.setItem('@jobble/tracking_entries', JSON.stringify(entries));
  });
  
  it('test_100_entries_render_without_dropping_frames', async () => {
    const { getByTestId } = renderWithProviders(<TimelineScreen />);
    const scrollView = getByTestId('timeline-scroll');
    
    const frameRates: number[] = [];
    
    // 滾動並測量 FPS
    for (let i = 0; i < 10; i++) {
      const fps = await measureFPS(() => {
        fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: i * 100 } } });
      });
      frameRates.push(fps);
    }
    
    // 平均 FPS 不應低於 30
    const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
    expect(avgFPS).toBeGreaterThanOrEqual(30);
  });
});
```

---

## E. 長時間 Streaming 效能 (Long Streaming Response)

### 測試目標

確認長時間操作（如有 streaming）不會導致 UI 卡死。

```typescript
describe('Long Operation Performance', () => {
  it('test_no_ui_freeze_during_5_second_operation', async () => {
    render(<ExportScreen />);
    
    // 點擊導出按鈕（假設需要 5 秒）
    fireEvent.press(getByText('Export'));
    
    // Loading 應該在 100ms 內出現
    const loadingStart = performance.now();
    await waitFor(() => {
      expect(getByText('Exporting...')).toBeTruthy();
    });
    const loadingDelay = performance.now() - loadingStart;
    expect(loadingDelay).toBeLessThan(100);
  });
});
```

---

## F. 記憶體洩漏檢測 (Memory Leak Detection)

### 測試目標

確認多次操作後，記憶體不會持續增長。

```typescript
describe('Memory Stability', () => {
  it('test_memory_stable_after_50_operations', async () => {
    // 這個測試需要在 Detox 中使用 heap capture
    // 以下為概念示例
    
    const initialMemory = await device.getMemoryUsage();
    
    // 執行 50 次操作
    for (let i = 0; i < 50; i++) {
      await addQuickEntry({ type: 'diaper' });
      await navigateToHome();
      await navigateToTracking();
    }
    
    const finalMemory = await device.getMemoryUsage();
    const memoryGrowth = finalMemory - initialMemory;
    
    // 記憶體增長不應超過 50MB
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});
```

---

## G. Server Restart Recovery

### 測試目標

確認 App 重啟後能正確恢復狀態。

```typescript
describe('Server Restart Recovery', () => {
  it('test_data_persists_after_app_restart', async () => {
    // 1. 添加數據
    await addQuickEntry({ type: 'diaper', notes: 'test' });
    
    // 2. 重啟 App
    await device.reloadReactNative();
    
    // 3. 驗證數據仍存在
    const storedData = await AsyncStorage.getItem('@jobble/tracking_entries');
    const entries = JSON.parse(storedData || '[]');
    
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].notes).toBe('test');
  });
  
  it('test_no_crash_on_corrupted_storage', async () => {
    // 寫入損壞的 JSON
    await AsyncStorage.setItem('@jobble/tracking_entries', 'invalid-json{{{');
    
    // App 重啟不應崩潰
    await device.reloadReactNative();
    
    // 應該顯示 empty state 或 error state，而不是 crash
    await expect(element(by.text('No entries yet'))).toBeVisible();
  });
});
```

---

## 效能測試工具

### 1. React Native Performance Monitor

```typescript
import { PerformanceObserver, performance } from 'react-native';

const measureAsyncStorage = async (operation: () => Promise<any>) => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
};
```

### 2. Detox Performance Logger

```typescript
// e2e/performance.test.ts
beforeAll(async () => {
  await device.enablePerformanceDiagnostics();
});
```

---

## 輸出位置

```
runtime/logs/tests/<timestamp>/
├── performance-report.md
├── fps-trace.json
├── memory-snapshots/
└── timeline-trace.json
```

---

## 閾值配置

```typescript
// __tests__/performance/thresholds.ts
export const PERFORMANCE_THRESHOLDS = {
  INITIAL_LOAD_MS: 3000,
  TAB_SWITCH_MS: 500,
  IDLE_REQUESTS_PER_SECOND: 0,
  MIN_FPS: 30,
  MAX_MEMORY_MB: 100,
  ASYNC_STORAGE_OPERATION_MS: 100,
};
```

---

*最後更新：2026-06-22*
