# 回歸測試 (Regression Tests) 詳情

> 目的：把曾經發生的 bug 變成永久測試，防止再次出現

## 命名規範

```
test_<症狀描述>
```

示例：
- `test_no_request_storm_on_initial_load`
- `test_sos_modal_closes_on_escape`
- `test_data_persists_after_app_restart`
- `test_missing_folder_relink_closes_modal`

## 回歸測試模板

```typescript
/**
 * Regression Test: <Issue Title>
 * 
 * Bug: <描述問題>
 * Fix: <如何修復>
 * Date: <YYYY-MM-DD>
 * 
 * 症狀：<用戶可見的錯誤表現>
 * 根因：<問題根本原因>
 */
describe('Regression: <Issue Title>', () => {
  it('test_<specific_behavior>', async () => {
    // Arrange
    // ...

    // Act
    // ...

    // Assert
    // ...
  });
});
```

## 已記錄的回歸測試

### RT-001: 初始載入請求風暴

**症狀：** App 啟動時發送過多 AsyncStorage 請求，導致卡頓

**測試：**
```typescript
it('test_no_request_storm_on_initial_load', async () => {
  const requestCount = await trackAsyncStorageCalls(() => {
    return render(<HomeScreen />);
  });
  expect(requestCount).toBeLessThan(10);
});
```

### RT-002: SOS Modal 無法關閉

**症狀：** 長按 SOS 按鈕後 Modal 無法關閉

**測試：**
```typescript
it('test_sos_modal_closes_on_long_press', async () => {
  const { getById } = render(<HomeScreen />);
  await element(by.id('sosButton')).longPress(1000);
  await expect(element(by.id('sosModal'))).toBeVisible();
  await element(by.text('Close')).tap();
  await expect(element(by.id('sosModal'))).not.toBeVisible();
});
```

### RT-003: 數據重啟後丢失

**症狀：** App 重啟後之前添加的記錄消失

**測試：**
```typescript
it('test_data_persists_after_app_restart', async () => {
  // 添加記錄
  await addTrackingEntry({ type: 'diaper' });
  
  // 重啟
  await device.reloadReactNative();
  
  // 驗證存在
  const entries = await getStoredEntries();
  expect(entries.length).toBeGreaterThan(0);
});
```

## 添加新的回歸測試

當修復 bug 時，同時添加回歸測試：

1. 在 `__tests__/regression/` 創建新文件
2. 命名格式：`regression_<issue_number>.test.ts`
3. 包含：
   - Bug 描述
   - 修復方式
   - 測試案例
4. 運行 `npm run test:unit` 確認通過

## 回歸測試位置

```
JobbleBaby/__tests__/
├── regression/
│   ├── regression_001_request_storm.test.ts
│   ├── regression_002_sos_modal.test.ts
│   └── ...
```

## 運行回歸測試

```bash
cd JobbleBaby
npm run test:unit -- --testPathPattern="regression"
```
