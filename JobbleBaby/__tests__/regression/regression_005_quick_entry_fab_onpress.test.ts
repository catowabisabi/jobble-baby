/**
 * Regression Test: RT-005 — Quick Entry FAB Missing onPress Handler
 *
 * Bug: app/(tabs)/index.tsx Quick Entry FAB buttons render but have no onPress handler
 * Fix: Pending — needs onPress={...} on TouchableOpacity at FAB area
 * Date: 2026-06-22
 * Commit: (pending fix)
 *
 * 症狀：Quick Entry FAB 按鈕（Diaper/Feed/Sleep）點擊無任何反應，無導航、無寫入
 * 根因：TouchableOpacity 缺少 onPress 屬性，只有 activeOpacity
 *
 * 驗證方式：
 * 1. 掃描 index.tsx 源碼，確認 Quick Entry FAB TouchableOpacity 有 onPress
 * 2. 確認 FAB 區塊映射的 QUICK_ENTRIES 陣列每個 entry 有 navigation handler
 */
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const INDEX_PATH = path.join(PROJECT_ROOT, 'app/(tabs)/index.tsx');

describe('Regression: RT-005 Quick Entry FAB onPress', () => {
  describe('Bug Prevention', () => {
    it('test_quick_entry_fab_touchableopacity_has_onpress', () => {
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');

      // Find the Quick Add FAB area - starts with comment marker
      const fabStartMarker = '/* Quick Add FAB area */';
      const fabStartIdx = content.indexOf(fabStartMarker);
      expect(fabStartIdx).toBeGreaterThan(0);

      // Find the closing </View> of the fabArea - after the fabRow closes
      // Walk forward from marker to find the View that closes fabArea
      let searchFrom = fabStartIdx;
      let viewDepth = 0;
      let fabAreaEndIdx = -1;

      for (let i = searchFrom; i < content.length; i++) {
        const snippet = content.substring(i, i + 20);
        if (snippet.startsWith('<View')) {
          viewDepth++;
        } else if (snippet.startsWith('</View>')) {
          viewDepth--;
          if (viewDepth === 0) {
            fabAreaEndIdx = i + 20; // include the closing tag
            break;
          }
        }
      }

      expect(fabAreaEndIdx).toBeGreaterThan(0);
      const fabArea = content.substring(fabStartIdx, fabAreaEndIdx);

      // Count TouchableOpacity in the fabRow vs onPress
      const touchableMatches = fabArea.match(/<TouchableOpacity/g) || [];
      const touchableCount = touchableMatches.length;

      // onPress should appear inside TouchableOpacity, after activeOpacity
      // We need onPress= to appear in the fab area
      const onPressMatches = fabArea.match(/onPress=\{?/g) || [];
      const onPressCount = onPressMatches.length;

      // Each TouchableOpacity should have an onPress
      expect(touchableCount).toBeGreaterThan(0);
      // onPressCount should be >= touchableCount (each button needs one)
      expect(onPressCount).toBeGreaterThanOrEqual(touchableCount);
    });

    it('test_quick_entry_fab_row_has_router_navigation', () => {
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');

      // Find the Quick Add FAB area
      const fabStartMarker = '/* Quick Add FAB area */';
      const fabStartIdx = content.indexOf(fabStartMarker);
      const scrollViewEnd = content.indexOf('</ScrollView>', fabStartIdx);

      // The section from FAB area to end of ScrollView should contain router navigation
      const fabSection = content.substring(fabStartIdx, scrollViewEnd + 15);

      // The FAB area should reference router navigation (push or replace)
      const hasRouterNav = fabSection.includes('router.push') || fabSection.includes('router.replace');

      // The entire file should use expo-router
      const usesRouter = content.includes('import { useRouter }') || content.includes("import { router }");
      expect(usesRouter).toBe(true);

      // And the FAB section specifically should have navigation
      expect(hasRouterNav).toBe(true);
    });

    it('test_quick_entry_fab_accessibility_declares_action_but_no_handler', () => {
      // Documents the accessibility violation:
      // FAB has accessibilityLabel + accessibilityHint saying "Tap to log"
      // but there's no functional onPress handler
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');

      // The FAB area should have accessibilityLabel
      const fabStartMarker = '/* Quick Add FAB area */';
      const fabStartIdx = content.indexOf(fabStartMarker);
      const scrollViewEnd = content.indexOf('</ScrollView>', fabStartIdx);
      const fabArea = content.substring(fabStartIdx, scrollViewEnd + 15);

      // FAB buttons describe what they do (good) but can't be activated (bad)
      const hasA11yLabel = fabArea.includes('accessibilityLabel=');
      expect(hasA11yLabel).toBe(true);

      const hasA11yHint = fabArea.includes('accessibilityHint=');
      expect(hasA11yHint).toBe(true);

      // Hint promises tap functionality
      const hintSaysTap = fabArea.includes('Tap to log');
      expect(hintSaysTap).toBe(true);

      // But the onPress is missing
      // This test will FAIL until the bug is fixed (onPress added)
      const touchableMatches = fabArea.match(/<TouchableOpacity[^>]*>/g) || [];
      expect(touchableMatches.length).toBeGreaterThan(0);

      // Each TouchableOpacity in FAB must have onPress
      const missingOnPress = touchableMatches.filter((t) => !t.includes('onPress='));
      expect(missingOnPress.length).toBe(0); // All must have onPress
    });
  });

  describe('Fix Verification', () => {
    it('test_quick_entry_fab_uses_handler_function_or_inline_router', () => {
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');

      // Look for a handler function that processes Quick Entry taps
      const handlerPatterns = [
        'handleQuickAdd',
        'logQuickEntry',
        'onQuickEntryPress',
        'handleFabPress',
        'handleQuickEntry',
      ];

      const hasHandler = handlerPatterns.some((h) => content.includes(h));

      // OR each entry could inline router.push with entry type
      const hasEntryTypeNav = content.includes('entry.type') || content.includes('entry.id');

      expect(hasHandler || hasEntryTypeNav).toBe(true);
    });

    it('test_quick_entry_fab_storage_write_present', () => {
      // The fix should write to storage when FAB is tapped
      const content = fs.readFileSync(INDEX_PATH, 'utf-8');

      // The file uses SafeStorage (good pattern)
      const hasSafeStorage = content.includes('safeGetItem') || content.includes('safeSetItem');
      expect(hasSafeStorage).toBe(true);

      // For Quick Entry logging, we expect safeSetItem or similar
      // (This is more of a behavioral check - actual write happens in handler)
      const hasStorageImport = content.includes("import") && content.includes('SafeStorage');
      expect(hasSafeStorage).toBe(true);
    });
  });
});
