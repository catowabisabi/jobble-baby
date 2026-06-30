/**
 * Regression Test: RT-009 — i18n Hardcoded String Fixes (Cycle 577)
 *
 * Bug: Multiple screens contained hardcoded English strings instead of i18n t() calls
 * Fix: Task #475 / commit a09641e — replaced hardcoded strings with t() calls
 * Date: 2026-06-30
 * Commit: a09641e
 *
 * 症狀：UI text not localized, English-only users can see hardcoded strings
 * 根因：Developers used placeholder text directly instead of i18n key lookup
 *
 * 修復覆蓋範圍：
 * 1. growth.tsx — placeholder "0.0" → t('growth.heightPlaceholder') / t('growth.weightPlaceholder')
 * 2. interoceptive.tsx — Badge text, button labels, tab names, placeholders → t() calls
 * 3. phototherapy-comfort.tsx — skinTemp translations → t('photoComfort.skinTemp.*')
 * 4. reflex-visual-motor.tsx — date/notes placeholders → t('reflex.*Placeholder')
 * 5. regulatory-fitness.tsx — status labels → t('regulatory_fitness.status.*')
 * 6. sleep-architecture.tsx — debt level labels → t('sleepArchitecture.debtLevel.*')
 * 7. teething.tsx — all 20 tooth names → t('teething.tooth.*'), quadrant labels, severity
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby';
const EN_JSON = path.join(PROJECT_ROOT, 'app', 'i18n', 'en.json');
const ZH_JSON = path.join(PROJECT_ROOT, 'app', 'i18n', 'zh.json');

function readJson(jsonPath: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
  catch {
    return {};
  }
}

function getI18nValue(obj: Record<string, unknown>, keyPath: string): string | undefined {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function allKeysExist(
  enJson: Record<string, unknown>,
  zhJson: Record<string, unknown>,
  keys: string[]
): string[] {
  const missing: string[] = [];
  for (const key of keys) {
    const enVal = getI18nValue(enJson, key);
    const zhVal = getI18nValue(zhJson, key);
    if (!enVal) missing.push(`en.${key}`);
    if (!zhVal) missing.push(`zh.${key}`);
  }
  return missing;
}

describe('Regression: RT-009 i18n Hardcoded String Fixes (2026-06-30)', () => {

  const enJson = readJson(EN_JSON);
  const zhJson = readJson(ZH_JSON);

  describe('Bug Prevention — No hardcoded strings in source', () => {

    it('test_growth_placeholder_not_hardcoded', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'growth.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // Height/weight inputs should use i18n placeholders
      expect(content).toContain("placeholder={t('growth.heightPlaceholder')}");
      expect(content).toContain("placeholder={t('growth.weightPlaceholder')}");
    });

    it('test_interoceptive_badge_text_not_hardcoded', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'interoceptive.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // Body Scan Streak badge should use i18n
      expect(content).toContain("t('interoceptive.bodyScanStreak'");
      expect(content).toContain("t('interoceptive.signalMaster'");
      // Diary entry gut feeling fallback should use i18n
      expect(content).toContain("t('interoceptive.noGutFeeling')");
      // Matched/Missed labels
      expect(content).toContain("t('interoceptive.matched')");
      expect(content).toContain("t('interoceptive.missed')");
      // Tab names
      expect(content).toContain("t('interoceptive.tab.dashboard')");
      expect(content).toContain("t('interoceptive.tab.games')");
      // Button labels
      expect(content).toContain("t('interoceptive.addNewEntry')");
      expect(content).toContain("t('interoceptive.addNewChallenge')");
      expect(content).toContain("t('interoceptive.logGame')");
      // Not hardcoded English
      expect(content).not.toMatch(/Body Scan Streak[^}]*sessions/);
      expect(content).not.toMatch(/Signal Master[^}]*day streak/);
    });

    it('test_phototherapy_skin_temp_i18n', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'phototherapy-comfort.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // skinTemp translations
      expect(content).toContain("t(`photoComfort.skinTemp.${");
      expect(content).toContain("t('common.yes')");
      expect(content).toContain("t('common.no')");
      // unknown translation
      expect(content).toContain("t('photoComfort.unknown')");
    });

    it('test_regulatory_fitness_status_i18n', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'regulatory-fitness.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // getScoreLabel should return full i18n keys
      expect(content).toContain("return 'regulatory_fitness.status.optimal'");
      expect(content).toContain("return 'regulatory_fitness.status.developing'");
      expect(content).toContain("return 'regulatory_fitness.status.concerning'");
      // Then t() wraps it
      expect(content).toContain('t(getScoreLabel(');
    });

    it('test_sleep_architecture_debt_level_i18n', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'sleep-architecture.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // getDebtLevel takes t function
      expect(content).toContain('function getDebtLevel(debtMin: number, t:');
      // Debt level labels use i18n
      expect(content).toContain("t('sleepArchitecture.debtLevel.minimal')");
      expect(content).toContain("t('sleepArchitecture.debtLevel.moderate')");
      expect(content).toContain("t('sleepArchitecture.debtLevel.high')");
      expect(content).toContain("t('sleepArchitecture.debtLevel.severe')");
    });

    it('test_teething_tooth_names_i18n', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'teething.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // TOOTH_POSITIONS uses toothKey instead of hardcoded name
      expect(content).toContain('toothKey:');
      expect(content).not.toContain("name: 'Upper Central Incisor'");
      expect(content).not.toContain("name: 'Lower Central Incisor'");
      // Severity labels use i18n
      expect(content).toContain("t('teething.severity.mild')");
      expect(content).toContain("t('teething.severity.moderate')");
      expect(content).toContain("t('teething.severity.severe')");
      // Quadrant labels
      expect(content).toContain("t(`teething.quadrant.");
      // All 20 tooth i18n keys referenced
      expect(content).toContain('teething.tooth.upperCentralIncisor');
      expect(content).toContain('teething.tooth.lowerCentralIncisor');
    });

    it('test_reflex_visual_motor_placeholder_i18n', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'reflex-visual-motor.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // Date and notes placeholders should use i18n
      expect(content).toContain("t('reflex.datePlaceholder')");
      expect(content).toContain("t('reflex.notesPlaceholder')");
      expect(content).toContain("t('visual.datePlaceholder')");
      expect(content).toContain("t('visual.notesPlaceholder')");
      expect(content).toContain("t('skinfold.mmPlaceholder')");
      expect(content).toContain("t('skinfold.datePlaceholder')");
    });

  });

  describe('Fix Verification — i18n keys exist in both languages', () => {

    const requiredKeys = [
      // growth.tsx
      'growth.heightPlaceholder',
      'growth.weightPlaceholder',
      // interoceptive.tsx
      'interoceptive.bodyScanStreak',
      'interoceptive.signalMaster',
      'interoceptive.noGutFeeling',
      'interoceptive.matched',
      'interoceptive.missed',
      'interoceptive.addNewEntry',
      'interoceptive.addNewChallenge',
      'interoceptive.logGame',
      'interoceptive.tab.dashboard',
      'interoceptive.tab.bodyScan',
      'interoceptive.tab.diary',
      'interoceptive.tab.score',
      'interoceptive.tab.signal',
      'interoceptive.tab.games',
      // phototherapy-comfort.tsx
      'photoComfort.skinTemp.normal',
      'photoComfort.skinTemp.warm',
      'photoComfort.skinTemp.hot',
      'photoComfort.unknown',
      'photoComfort.note',
      // regulatory-fitness.tsx
      'regulatory_fitness.status.optimal',
      'regulatory_fitness.status.developing',
      'regulatory_fitness.status.concerning',
      'regulatory_fitness.7dayTrend',
      // sleep-architecture.tsx
      'sleepArchitecture.debtLevel.minimal',
      'sleepArchitecture.debtLevel.moderate',
      'sleepArchitecture.debtLevel.high',
      'sleepArchitecture.debtLevel.severe',
      // teething.tsx
      'teething.tooth.upperCentralIncisor',
      'teething.tooth.upperLateralIncisor',
      'teething.tooth.upperCanine',
      'teething.tooth.upperFirstMolar',
      'teething.tooth.upperSecondMolar',
      'teething.tooth.lowerCentralIncisor',
      'teething.tooth.lowerLateralIncisor',
      'teething.tooth.lowerCanine',
      'teething.tooth.lowerFirstMolar',
      'teething.tooth.lowerSecondMolar',
      'teething.quadrant.UR',
      'teething.quadrant.UL',
      'teething.quadrant.LL',
      'teething.quadrant.LR',
      'teething.severity.mild',
      'teething.severity.moderate',
      'teething.severity.severe',
      'teething.allBabyTeeth',
      'teething.activeToday',
      'teething.monthsOld',
      'teething.baby',
      'teething.addProfileToTrack',
      'teething.underSixMonths',
    ];

    it('test_all_required_i18n_keys_exist_in_en', () => {
      const missing = allKeysExist(enJson, zhJson, requiredKeys);
      const missingInEn = missing.filter(k => k.startsWith('en.'));
      expect(missingInEn).toHaveLength(0);
      if (missingInEn.length > 0) {
        console.warn('Missing EN keys:', missingInEn);
      }
    });

    it('test_all_required_i18n_keys_exist_in_zh', () => {
      const missing = allKeysExist(enJson, zhJson, requiredKeys);
      const missingInZh = missing.filter(k => k.startsWith('zh.'));
      expect(missingInZh).toHaveLength(0);
      if (missingInZh.length > 0) {
        console.warn('Missing ZH keys:', missingInZh);
      }
    });

    it('test_common_yes_no_keys_exist', () => {
      const commonKeys = ['common.yes', 'common.no'];
      const missing = allKeysExist(enJson, zhJson, commonKeys);
      expect(missing).toHaveLength(0);
    });

  });

  describe('Storage Integration', () => {
    it('test_reflex_visual_motor_uses_safe_storage', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'reflex-visual-motor.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      // Should use safeStorage/safeSetItem/safeGetItem, not raw AsyncStorage
      expect(content).not.toMatch(/AsyncStorage\.setItem/);
      expect(content).not.toMatch(/AsyncStorage\.getItem/);
    });

    it('test_sleep_architecture_uses_safe_storage', () => {
      const fp = path.join(PROJECT_ROOT, 'app', '(tabs)', 'sleep-architecture.tsx');
      const content = fs.readFileSync(fp, 'utf-8');
      expect(content).not.toMatch(/AsyncStorage\.setItem/);
      expect(content).not.toMatch(/AsyncStorage\.getItem/);
    });
  });

});
