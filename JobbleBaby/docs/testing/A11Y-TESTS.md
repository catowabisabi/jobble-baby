# J. 無障礙/UX 測試 (Accessibility / Basic UX Tests)

## 執行方式
```bash
npm run test:a11y
```

## 狀態：⚠️ 測試文件存在但為 placeholder

現有 `__tests__/a11y/a11y.test.ts` 包含 14 個測試，但幾乎全部是 placeholder（測試內沒有真正渲染任何 React Native 組件）。

## 現有覆蓋（Placeholder）

| 測試場景 | 狀態 |
|----------|------|
| Interactive elements 有 accessibilityLabel | ⚠️ Placeholder |
| Screen reader semantic structure | ⚠️ Placeholder |
| 中英文混排渲染 | ⚠️ Placeholder |
| 顏色對比度（light theme） | ⚠️ Placeholder |
| Interactive elements 顏色區分 | ⚠️ Placeholder |
| Touch target size（44pt minimum） | ⚠️ Placeholder |
| Error messages accessible | ⚠️ Placeholder |
| Error color distinct | ⚠️ Placeholder |
| Loading state announced | ⚠️ Placeholder |
| Onboarding progress indication | ⚠️ Placeholder |
| Skip button availability | ⚠️ Placeholder |
| Inline validation errors | ⚠️ Placeholder |
| Navigation back | ⚠️ Placeholder |

## 需要真正實現的測試

### 1. Keyboard Navigation
```typescript
// 使用 RTL 的 fireEvent PRESS 模擬 keyboard 操作
it('should navigate when Enter is pressed on focused element', async () => {
  const { getByText } = render(<HomeScreen />);
  const feedButton = getByText('Feed');
  
  // 驗證按鈕可 focus
  expect(feedButton.props.accessibilityRole).toBe('button');
  
  // 模擬 keyboard 提交
  fireEvent(feedButton, 'submitEditing');
  expect(useRouter().push).toHaveBeenCalledWith('/feed');
});
```

### 2. Focus Trap in Modal
```typescript
// SOS Modal 應 trap focus
it('should trap focus inside SOS modal', async () => {
  // 渲染含 Modal 的組件
  // focus trap: Tab 鍵不應離開 modal
});
```

### 3. Escape 關閉 Modal
```typescript
// Android back button / Escape 應關閉 modal
it('should close modal on Escape press', () => {
  // fireEvent keyDown Escape
  // 驗證 modal 關閉
});
```

### 4. Quick Entry 按鈕 Accessibility
```typescript
// 驗證 Quick Entry 按鈕有 accessibilityLabel
it('should have accessible labels on Quick Entry buttons', async () => {
  const { getAllByRole } = renderWithProviders(<HomeScreen />);
  const buttons = getAllByRole('button');
  
  buttons.forEach(btn => {
    expect(btn.props.accessibilityLabel).toBeTruthy();
  });
});
```

### 5. Loading Indicator
```typescript
// Loading 時應有 accessibilityLabel
it('should announce loading state', async () => {
  // mock safeGetItem 延遲
  // 驗證 loading indicator 可見且有 accessibilityLabel
});
```

### 6. Error State
```typescript
// Error popup 應有 accessible role 和 message
it('should display accessible error messages', () => {
  // 觸發 error
  // 驗證 error container 有 accessibilityRole='alert'
});
```

### 7. Disabled Button 有原因
```typescript
// Disabled button 應有 accessibilityHint 說明原因
it('should explain why button is disabled', () => {
  // 驗證 disabled 按鈕有 accessibilityHint
});
```

### 8. Small Screen Layout
```typescript
// 小屏幕（320pt）不應有元素重疊
it('should not overlap on small screens', async () => {
  // 使用不同的 screen dimensions 渲染
  // 驗證佈局正常
});
```

## 工具建議

- `@testing-library/react-native` — 已安裝
- `jest-native` — 已安裝（`@testing-library/jest-native`）
- `react-native-a11y` — 可考慮額外安裝

## Jest 配置

目前 `jest.config.js` 的 `testPathIgnorePatterns` 將 `__tests__/a11y/` 排除，這是正確的（a11y 測試需要真實 DOM/Component rendering，不適合普通 Jest）。

**建議：** 將 `test:a11y` 改為使用 `--testPathPattern="__tests__/a11y"` 並確保 `--testPathIgnorePatterns` 不再忽略它。

```json
// jest.config.js 建議修改
testPathIgnorePatterns: [
  '/node_modules/',
  '/__tests__/smoke/',   // smoke 用 tsx 直跑
  '/__tests__/e2e/',     // detox 單獨跑
  // 移除 '/__tests__/a11y/' — a11y 現在可用 Jest 跑
],
```

## 覆蓋缺口

|| 測試場景 | 優先級 |
||----------|--------|
| Quick Entry 按鈕 accessibilityLabel | P0 |
| Loading state accessibility | P1 |
| Error popup accessible role | P1 |
| Modal focus trap | P2 |
| Keyboard navigation | P2 |
| Small screen layout | P2 |
