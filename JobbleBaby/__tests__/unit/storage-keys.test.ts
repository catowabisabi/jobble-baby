/**
 * B. 單元測試 — Storage Keys
 * 
 * 驗證 storage-keys.ts 的完整性和正確性
 */
import { STORAGE_KEYS } from '../../store/storage-keys';

describe('STORAGE_KEYS', () => {
  it('should have all required core keys', () => {
    const requiredKeys = [
      'BABY_BIRTHDATE',
      'ALLERGEN_LOG',
      'GROWTH_ENTRIES',
      'MILESTONE_ENTRIES',
      'SLEEP_ENTRIES',
      'TRACKING_ENTRIES',
      'SCHEDULE_ENTRIES',
      'SHIFT_LOG',
    ];

    requiredKeys.forEach((key) => {
      expect(STORAGE_KEYS).toHaveProperty(key);
      expect((STORAGE_KEYS as Record<string, string>)[key]).toMatch(/^@jobble\//);
    });
  });

  it('should have 180+ total storage keys', () => {
    const keyCount = Object.keys(STORAGE_KEYS).length;
    expect(keyCount).toBeGreaterThanOrEqual(180);
  });

  it('should have all keys prefixed with @jobble/', () => {
    Object.entries(STORAGE_KEYS).forEach(([key, value]) => {
      expect(value).toMatch(/^@jobble\//);
      expect(key).toMatch(/^[A-Z_][A-Z0-9_]*$/);
    });
  });

  it('should have unique values (no duplicate keys)', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should have required feeding-related keys', () => {
    const feedingKeys = [
      'BOTTLE_SESSION',
      'FEEDING_READINESS',
      'MILK_TRANSFER_HISTORY',
      'CUP_FEEDING_ENTRIES',
      'BOTTLE_REFUSAL_ENTRIES',
    ];

    feedingKeys.forEach((key) => {
      expect(STORAGE_KEYS).toHaveProperty(key);
    });
  });

  it('should have required developmental keys', () => {
    const devKeys = [
      'MILESTONE_ENTRIES',
      'REFLEX_ENTRIES',
      'MORO_REFLEX_EVENTS',
      'GALANT_REFLEX_LOG',
      'SENSORY_ENTRIES',
    ];

    devKeys.forEach((key) => {
      expect(STORAGE_KEYS).toHaveProperty(key);
    });
  });

  it('should have required stress/caregiver keys', () => {
    const stressKeys = [
      'STRESS_LOG',
      'STRESS_CASCADE',
      'CAREGIVER_SURVEY',
      'PARENT_SLEEP_ENTRIES',
    ];

    stressKeys.forEach((key) => {
      expect(STORAGE_KEYS).toHaveProperty(key);
    });
  });
});
