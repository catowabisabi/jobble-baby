/**
 * B. 單元測試 — i18n
 * 
 * 驗證國際化文件的完整性和一致性
 */
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const enPath = path.join(PROJECT_ROOT, 'app/i18n/en.json');
const zhPath = path.join(PROJECT_ROOT, 'app/i18n/zh.json');

function loadJson(filePath: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n', () => {
  let enKeys: Set<string>;
  let zhKeys: Set<string>;
  let enData: Record<string, unknown>;
  let zhData: Record<string, unknown>;

  beforeAll(() => {
    enData = loadJson(enPath);
    zhData = loadJson(zhPath);
    enKeys = new Set(flattenKeys(enData));
    zhKeys = new Set(flattenKeys(zhData));
  });

  it('should have both en.json and zh.json files', () => {
    expect(fs.existsSync(enPath)).toBe(true);
    expect(fs.existsSync(zhPath)).toBe(true);
  });

  it('should have all keys in zh.json that exist in en.json', () => {
    const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));
    expect(missingInZh).toHaveLength(0);
  });

  it('should have tabs translation', () => {
    expect(enData).toHaveProperty('tabs');
    expect(zhData).toHaveProperty('tabs');
  });

  it('should have home screen translation', () => {
    expect(enData).toHaveProperty('home');
    expect(zhData).toHaveProperty('home');
  });

  it('should have common/action translations', () => {
    expect(enData).toHaveProperty('common');
    expect(zhData).toHaveProperty('common');
  });

  it('should have at least 100 total translation keys', () => {
    expect(enKeys.size).toBeGreaterThanOrEqual(100);
  });

  it('should have translation for all 16+ tabs', () => {
    const tabs = enData.tabs as Record<string, string>;
    const tabCount = Object.keys(tabs).length;
    expect(tabCount).toBeGreaterThanOrEqual(16);
  });

  it('should have SOS/emergency related translations', () => {
    const enFlat = flattenKeys(enData).join(' ');
    const hasEmergency = enFlat.includes('sos') || enFlat.includes('emergency') || enFlat.includes('SOS');
    expect(hasEmergency).toBe(true);
  });
});
