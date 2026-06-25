# D. 前端 Mocked 測試 (Frontend Mocked Tests)

## 執行方式
```bash
npm run test:mocked
# 或: npm test -- --testPathPattern="__tests__/mocked"
```

## 測試套件

### ✅ HomeScreen.test.tsx (4/4 PASS)

**覆蓋：**
- safeGetItem 在 mount 時被調用
- Quick Entry 按鈕渲染 (Diaper/Feed/Sleep)
- Profile key 被正確調用
- Projection card 渲染

### ✅ BottleFeedingScreen.test.tsx (5/5 PASS)

**覆蓋：**
- Mount without crash
- Title renders
- Tab structure renders
- Nipple level selector works
- Log button present

### ✅ MilestonesScreen.test.tsx (6/6 PASS)

**覆蓋：**
- Mount calls safeGetItem for milestone photos
- Milestone type selector (First Smile)
- Developmental age window
- Brain Builder section
- Milestone type selector (First Steps)
- Milestone Gallery section

### ✅ EmergencySOSScreen.test.tsx (5/5 PASS)

**覆蓋：**
- Mount calls safeGetItem for SOS events
- Panic mode button renders
- 4-7-8 breathing exercise section
- Safe Space Checklist
- Quick Dial with emergency contacts

### ✅ FeedingReadinessNavigator.test.tsx (11/11 PASS)

**覆蓋：**
- Checklist rendering
- Composite score calculation
- Texture progression display
- Data persistence on mount

### ✅ CryAcousticFingerprint.test.tsx (14/14 PASS)

**覆蓋：**
- Mount without crash
- Recording toggle
- FAB present
- RT-006 i18n language checks

### ✅ MilkThermalSafetyChecker.test.tsx (11/11 PASS) — **Added Cycle 514**

**文件：** `__tests__/mocked/MilkThermalSafetyChecker.test.tsx`

**覆蓋：**
- Mount without crash
- AsyncStorage.getItem called on mount
- Temperature input field renders (placeholder "37")
- Target temperature display (37°C)
- Start Timer → AsyncStorage.setItem called with session object
- Stop → AsyncStorage.removeItem called for milk_warming_session
- Thawed milk toggle present
- Safety Tips accordion section
- All 3 warming method buttons (Bottle Warmer, Warm Water Bath, Ambient Warming)
- Timer in MM:SS format when session loaded from storage
- Thawed milk toggle interaction

## Mock 現狀

|| Mock 目標 | 狀態 | 備註 |
|-----------|------|------|
| `SafeStorage` | ✅ | `safeGetItem` mock 工作正常 |
| `@expo/vector-icons` | ✅ | 簡單字符串 mock |
| `expo-router` | ✅ | `useRouter` mock 工作正常 |
| `AsyncStorage` | ✅ | 全域 clear in beforeEach |
| `ThemeProvider` | ✅ | 通過 renderWithProviders 包裹 |
| `LanguageProvider` | ✅ | 通過 renderWithProviders 包裹 |

## 測試文件位置
- `__tests__/mocked/HomeScreen.test.tsx` — 唯一 mocked 測試
- `__tests__/helpers/render-with-providers.tsx` — provider wrapper（**新建**）
- `app/(tabs)/index.tsx` — HomeScreen 組件

## 隔離原則
- 每個 `beforeEach`: `jest.clearAllMocks()` + `AsyncStorage.clear()`
- 不依賴真實 AsyncStorage 數據
- 不發送真實網絡請求

## 已知 Gap

**⚠️ Quick Entry FAB 按鈕沒有 onPress 處理函數**

`app/(tabs)/index.tsx` 第 363-374 行的 Quick Entry FAB 按鈕是 `TouchableOpacity`，但**沒有 `onPress` 屬性**。按鈕顯示但不觸發任何導航。

這意味著：
- UI 測試可以驗證按鈕渲染 ✓
- UI 測試**無法**驗證按鈕按壓行為（因為根本沒有 handler）
- 需要先在 `app/(tabs)/index.tsx` 添加 `onPress` 處理函數

**修復後需添加的回歸測試：**
```tsx
it('should navigate to /feed when Feed FAB is pressed', async () => {
  const { getAllByText } = renderWithProviders(<HomeScreen />);
  await waitFor(() => expect(getAllByText('Feed')[0]).toBeTruthy());
  fireEvent.press(getAllByText('Feed')[0]);
  expect(useRouter().push).toHaveBeenCalledWith('/feed');
});
```
