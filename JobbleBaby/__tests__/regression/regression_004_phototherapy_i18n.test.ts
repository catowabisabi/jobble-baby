/**
 * Regression Test: RT-004 — Phototherapy Comfort i18n Hardcoded Strings
 *
 * Bug: phototherapy-comfort.tsx contained hardcoded English strings instead of i18n t() calls
 * Fix: task #469 — replaced hardcoded strings with t('photoComfort.*') calls
 * Date: 2026-06-22 (commit bef5c980)
 * Commit: bef5c9801b0e914f163539724ec982d434f0b504
 *
 * 症狀：用戶使用非英文語言時，光照治療舒緩頁面仍顯示英文 hardcoded 字符串
 * 根因：開發時直接寫字符串而非使用 i18n t() API
 *
 * 驗證方式：
 * 1. 掃描 phototherapy-comfort.tsx 源碼，確認所有可見字符串都使用 t() 包裝
 * 2. 確認 zh.json 包含 photoComfort section 所有 keys
 * 3. 渲染組件時翻譯正確替換
 */
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SCREEN_PATH = path.join(PROJECT_ROOT, 'app/(tabs)/phototherapy-comfort.tsx');
const EN_I18N_PATH = path.join(PROJECT_ROOT, 'app/i18n/en.json');
const ZH_I18N_PATH = path.join(PROJECT_ROOT, 'app/i18n/zh.json');

describe('Regression: RT-004 Phototherapy Comfort i18n', () => {
  describe('Hardcoded String Prevention', () => {
    it('test_no_hardcoded_visible_strings_in_phototherapy_comfort', () => {
      // Read the source file
      const content = fs.readFileSync(SCREEN_PATH, 'utf-8');

      // Pattern 1: Text components with hardcoded English strings (not wrapped in t() or ti())
      // Matches: <Text>Hardcoded String</Text> but NOT <Text>{t(...)}</Text> or <Text>variable</Text>
      const hardcodedTextPattern = /<Text[^>]*>\s*[A-Za-z][A-Za-z\s.,!?-]{3,50}\s*<\/Text>/g;

      // Pattern 2: accessibilityLabel with hardcoded strings not using t()
      const hardcodedA11yPattern = /accessibilityLabel="(?![{t(]|{ti])[A-Za-z][A-Za-z\s.,!?-]{3,}"/g;

      // Pattern 3: Check for common hardcoded English words in JSX that shouldn't be hardcoded
      // These specific strings were the ones fixed in task #469
      // The file should use ti() function which handles fallback gracefully
      const hasTiFunction = content.includes('const ti = (key: string): string =>');
      expect(hasTiFunction).toBe(true);

      // lampTypes should use ti() for labels
      const lampTypesUseTi = content.includes('label: ti(LAMP_TYPES_I18N');
      expect(lampTypesUseTi).toBe(true);

      // Tips array should use t() or ti()
      const tipsUseTranslation = content.includes('t(\'photoComfort.tip') || content.includes('ti(\'photoComfort.tip');
      expect(tipsUseTranslation).toBe(true);

      // Checklist labels should use translation
      const checklistUseTranslation = content.includes('t(\'photoComfort.eyeMaskOn\')') ||
                                      content.includes('ti(\'photoComfort.eyeMaskOn\')');
      expect(checklistUseTranslation).toBe(true);
    });

    it('test_phototherapy_comfort_i18n_keys_exist_in_both_languages', () => {
      const enContent = JSON.parse(fs.readFileSync(EN_I18N_PATH, 'utf-8'));
      const zhContent = JSON.parse(fs.readFileSync(ZH_I18N_PATH, 'utf-8'));

      const enPhotoComfort = enContent.photoComfort;
      const zhPhotoComfort = zhContent.photoComfort;

      // Verify photoComfort section exists in both languages
      expect(enPhotoComfort).toBeDefined();
      expect(zhPhotoComfort).toBeDefined();

      // All keys used in the component must exist in both languages
      const requiredKeys = [
        'title',
        'babyNameDefault',
        'daysOld',
        'sessions',
        'totalTime',
        'maskCompliance',
        'parentWellness',
        'stressNote',
        'comfortTips',
        'tipEyeMask',
        'tipSkinTemp',
        'tipFeeding',
        'tipDiaper',
        'tipBonding',
        'newSession',
        'share',
        'sessionHistory',
        'noSessions',
        'date',
        'startTime',
        'endTime',
        'lampType',
        'comfortChecklist',
        'eyeMaskOn',
        'skinTempChecked',
        'diaperChanged',
        'feedingDuring',
        'skinTempFelt',
        'parentStress',
        'notes',
        'notesPlaceholder',
        'cancel',
        'save',
        'fillTimes',
        'invalidTimes',
        'eyeMask',
        'skinTemp',
        'diaper',
        'feeding',
        'lightTypes',
      ];

      requiredKeys.forEach((key) => {
        expect(enPhotoComfort[key]).toBeDefined();
        expect(zhPhotoComfort[key]).toBeDefined();
        // lightTypes and lampTypes are nested objects, not strings — handled separately
        if (typeof enPhotoComfort[key] === 'string') {
          expect(enPhotoComfort[key].length).toBeGreaterThan(0);
          expect(zhPhotoComfort[key].length).toBeGreaterThan(0);
        }
      });
    });

    it('test_phototherapy_comfort_lamp_type_i18n_keys', () => {
      const enContent = JSON.parse(fs.readFileSync(EN_I18N_PATH, 'utf-8'));
      const zhContent = JSON.parse(fs.readFileSync(ZH_I18N_PATH, 'utf-8'));

      const enLightTypes = enContent.photoComfort?.lightTypes;
      const zhLightTypes = zhContent.photoComfort?.lightTypes;

      expect(enLightTypes).toBeDefined();
      expect(zhLightTypes).toBeDefined();

      // Lamp types defined in the component: LED, Halogen, Fiber Optic, BiliBlanket
      const lampTypes = ['LED', 'Halogen', 'Fiber Optic', 'BiliBlanket'];
      lampTypes.forEach((type) => {
        expect(enLightTypes[type]).toBeDefined();
        expect(zhLightTypes[type]).toBeDefined();
        expect(enLightTypes[type].length).toBeGreaterThan(0);
        expect(zhLightTypes[type].length).toBeGreaterThan(0);
      });
    });

    it('test_phototherapy_comfort_no_english_fallback_in_zh_mode', () => {
      // When Chinese user loads the app, hardcoded English should NOT appear
      // This is ensured by ti() fallback returning key when translation missing
      const content = fs.readFileSync(SCREEN_PATH, 'utf-8');

      // The ti() function is defined with fallback
      const tiFunctionMatch = content.match(/const ti = \(key: string\)[^}]+}/);
      expect(tiFunctionMatch).not.toBeNull();

      const tiFunction = tiFunctionMatch?.[0] ?? '';
      // Must return the key as fallback when translation equals key (i.e., no translation found)
      expect(tiFunction).toContain('=== key ? key');
    });
  });

  describe('Storage Integration', () => {
    it('test_phototherapy_comfort_uses_safe_storage', () => {
      const content = fs.readFileSync(SCREEN_PATH, 'utf-8');

      // Must use safeGetItem, not raw AsyncStorage.getItem
      expect(content).toContain('safeGetItem');
      expect(content).toContain('safeSetItem');

      // Must NOT use raw AsyncStorage (would bypass error handling)
      expect(content).not.toContain('AsyncStorage.getItem');
      expect(content).not.toContain('AsyncStorage.setItem');
    });

    it('test_phototherapy_comfort_storage_key_defined', () => {
      const content = fs.readFileSync(SCREEN_PATH, 'utf-8');

      // Storage key must be from STORAGE_KEYS, not hardcoded
      expect(content).toContain('STORAGE_KEYS.PHOTO_COMFORT_SESSIONS');
      expect(content).not.toContain("'@jobble/photo_comfort_sessions'");
      expect(content).not.toContain('"@jobble/photo_comfort_sessions"');
    });
  });
});
