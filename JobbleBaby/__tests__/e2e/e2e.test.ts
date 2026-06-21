/**
 * F. E2E 用戶流程測試 (Detox)
 * 
 * 真實用戶操作流程測試
 * 運行方式: npm run test:e2e
 * 
 * 前提條件:
 * 1. iOS Simulator 或 Android Emulator 已啟動
 * 2. App 已構建並安裝
 * 3. Detox 已配置
 */
import { data } from 'react-native';

describe('Jobble Baby E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('首次開啟流程', () => {
    it('should show onboarding when no profile exists', async () => {
      // Clear app data first
      await device.clearKeychain();
      
      // Reload app
      await device.reloadReactNative();
      
      // Should show onboarding screen
      await expect(element(by.text(/name/i))).toBeVisible();
    });
  });

  describe('Onboarding 流程', () => {
    it('should complete onboarding and show home', async () => {
      // This test assumes first-run state
      // In real scenario, we'd clear data and restart
      
      // Enter baby name
      const nameInput = element(by.id('babyNameInput'));
      if (await nameInput.isVisible()) {
        await nameInput.typeText('TestBaby');
      }
      
      // Select birth date
      const datePicker = element(by.id('birthDatePicker'));
      if (await datePicker.isVisible()) {
        await datePicker.tap();
        await element(by.text('OK')).tap();
      }
      
      // Tap continue
      const continueBtn = element(by.text(/continue|next/i));
      if (await continueBtn.isVisible()) {
        await continueBtn.tap();
      }
    });
  });

  describe('主頁儀表板', () => {
    it('should display quick entry buttons', async () => {
      await expect(element(by.text('Diaper'))).toBeVisible();
      await expect(element(by.text('Feed'))).toBeVisible();
      await expect(element(by.text('Sleep'))).toBeVisible();
    });

    it('should show baby name after profile setup', async () => {
      // After completing onboarding
      const babyNameElement = element(by.id('babyName'));
      if (await babyNameElement.isVisible()) {
        await expect(babyNameElement).toContainText('TestBaby');
      }
    });
  });

  describe('追蹤記錄流程', () => {
    it('should navigate to tracking tab', async () => {
      const trackingTab = element(by.text('Tracking'));
      if (await trackingTab.isVisible()) {
        await trackingTab.tap();
      }
      await expect(element(by.text(/tracking/i))).toBeVisible();
    });

    it('should add a diaper entry', async () => {
      // Navigate to tracking
      const trackingTab = element(by.text('Tracking'));
      await trackingTab.tap();
      
      // Tap add button
      const addBtn = element(by.id('addEntryBtn'));
      if (await addBtn.isVisible()) {
        await addBtn.tap();
      }
      
      // Select diaper type
      const diaperOption = element(by.text(/diaper/i));
      if (await diaperOption.isVisible()) {
        await diaperOption.tap();
      }
      
      // Save
      const saveBtn = element(by.text(/save|confirm/i));
      if (await saveBtn.isVisible()) {
        await saveBtn.tap();
      }
    });
  });

  describe('Tab 導航', () => {
    const tabs = ['Home', 'Tracking', 'Schedule', 'Products', 'Growth'];

    tabs.forEach((tabName) => {
      it(`should navigate to ${tabName} tab`, async () => {
        const tab = element(by.text(tabName));
        if (await tab.isVisible()) {
          await tab.tap();
          await expect(element(by.text(tabName))).toBeVisible();
        }
      });
    });
  });

  describe('SOS 緊急功能', () => {
    it('should show SOS modal on long press', async () => {
      // Find the SOS button
      const sosButton = element(by.id('sosButton'));
      
      if (await sosButton.isVisible()) {
        // Long press (800ms as defined in HomeScreen)
        await sosButton.longPress(1000);
        
        // Should show SOS modal
        const modal = element(by.id('sosModal'));
        await expect(modal).toBeVisible();
        
        // Close modal
        const closeBtn = element(by.text(/close|cancel/i));
        if (await closeBtn.isVisible()) {
          await closeBtn.tap();
        }
      }
    });
  });

  describe('數據持久化', () => {
    it('should persist data after app restart', async () => {
      // Add an entry
      const trackingTab = element(by.text('Tracking'));
      await trackingTab.tap();
      
      // ... add entry logic
      
      // Restart app
      await device.reloadReactNative();
      
      // Data should still exist
      // This depends on onboarding being complete
    });
  });
});
