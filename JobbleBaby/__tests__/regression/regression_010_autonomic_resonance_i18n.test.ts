/**
 * Regression Test: RT-010 — AutonomicResonanceScreen i18n Hardcoded String Fixes
 *
 * Bug: AutonomicResonanceScreen (commit d2c4501) contains references to i18n keys
 *      that were not present in en.json/zh.json at commit time.
 *
 * 症狀：UI renders raw key strings (e.g. "autonomicResonance.updateAllostaticLoad")
 *       instead of localized text because t() falls back to key when key is missing.
 *
 * 根因：Feature committed with missing i18n keys — VagalBrakePrompts and modal titles
 *       referenced keys that don't exist in the translation files.
 *
 * 修復覆蓋範圍：
 * 1. updateAllostaticLoad — modal title for AllostaticLoadModal
 * 2. vagalBrakeTitle — VagalBrakePrompts section title
 * 3. vagalBrakeSubtitle — VagalBrakePrompts section subtitle
 * 4. breathingCue — first vagal prompt title
 * 5. breathingCueDesc — first vagal prompt description
 * 6. cooingCue — second vagal prompt title
 * 7. cooingCueDesc — second vagal prompt description
 * 8. vestibularCue — third vagal prompt title
 * 9. vestibularCueDesc — third vagal prompt description
 * 10. contingentCue — fourth vagal prompt title
 * 11. contingentCueDesc — fourth vagal prompt description
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby';
const EN_JSON = path.join(PROJECT_ROOT, 'app', 'i18n', 'en.json');
const ZH_JSON = path.join(PROJECT_ROOT, 'app', 'i18n', 'zh.json');
const SCREEN_FILE = path.join(PROJECT_ROOT, 'app', '(tabs)', 'autonomic-resonance.tsx');

interface I18nCheck {
  key: string;
  usage: string; // code location hint
}

const EXPECTED_KEYS: I18nCheck[] = [
  // AllostaticLoadModal title
  { key: 'autonomicResonance.updateAllostaticLoad', usage: 'AllostaticLoadModal title at line ~312' },

  // VagalBrakePrompts section
  { key: 'autonomicResonance.vagalBrakeTitle', usage: 'VagalBrakePrompts title at line ~343' },
  { key: 'autonomicResonance.vagalBrakeSubtitle', usage: 'VagalBrakePrompts subtitle at line ~344' },

  // Vagal prompt cards
  { key: 'autonomicResonance.breathingCue', usage: 'First vagal prompt title at line ~335' },
  { key: 'autonomicResonance.breathingCueDesc', usage: 'First vagal prompt desc at line ~335' },
  { key: 'autonomicResonance.cooingCue', usage: 'Second vagal prompt title at line ~336' },
  { key: 'autonomicResonance.cooingCueDesc', usage: 'Second vagal prompt desc at line ~336' },
  { key: 'autonomicResonance.vestibularCue', usage: 'Third vagal prompt title at line ~337' },
  { key: 'autonomicResonance.vestibularCueDesc', usage: 'Third vagal prompt desc at line ~337' },
  { key: 'autonomicResonance.contingentCue', usage: 'Fourth vagal prompt title at line ~338' },
  { key: 'autonomicResonance.contingentCueDesc', usage: 'Fourth vagal prompt desc at line ~338' },
];

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

describe('RT-010: AutonomicResonanceScreen i18n keys', () => {
  let enJson: Record<string, unknown>;
  let zhJson: Record<string, unknown>;

  beforeAll(() => {
    enJson = readJson(EN_JSON);
    zhJson = readJson(ZH_JSON);
  });

  it('AutonomicResonanceScreen file should exist', () => {
    expect(fs.existsSync(SCREEN_FILE)).toBe(true);
  });

  test.each(EXPECTED_KEYS)(
    'i18n key "$key" should exist in en.json',
    ({ key }) => {
      const value = getI18nValue(enJson, key);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
      expect(value).not.toBe(key); // Should not fall back to key itself
      expect((value as string).length).toBeGreaterThan(0);
    }
  );

  test.each(EXPECTED_KEYS)(
    'i18n key "$key" should exist in zh.json',
    ({ key }) => {
      const value = getI18nValue(zhJson, key);
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
      expect(value).not.toBe(key);
      expect((value as string).length).toBeGreaterThan(0);
    }
  );

  it('all autonomicResonance keys used in autonomic-resonance.tsx should be present in en.json', () => {
    const screenContent = fs.readFileSync(SCREEN_FILE, 'utf-8');

    // Extract all t('autonomicResonance.*') calls from the screen
    const tCallPattern = /t\(['"](autonomicResonance\.[^'")]+)['"]\)/g;
    const usedKeys = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = tCallPattern.exec(screenContent)) !== null) {
      usedKeys.add(match[1]);
    }

    const missingKeys: string[] = [];
    for (const key of usedKeys) {
      const value = getI18nValue(enJson, key);
      if (value === undefined || value === key) {
        missingKeys.push(key);
      }
    }

    expect(missingKeys).toEqual([]);
    if (missingKeys.length > 0) {
      console.error('Missing i18n keys:', missingKeys);
    }
  });
});
