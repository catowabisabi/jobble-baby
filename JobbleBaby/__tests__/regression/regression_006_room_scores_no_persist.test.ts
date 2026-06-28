/**
 * Regression Test: RT-006 — Room Scores Not Persisted to AsyncStorage
 *
 * Bug: app/(tabs)/indoor-air-navigator.tsx updateRoomScore() calls setRoomScores()
 *      but does NOT call safeSetItem() to persist the updated room scores.
 *      Room score changes are lost on app restart.
 *
 * Date: 2026-06-28
 * Commit: 94610f7 (accessibilityLabel fix)
 *
 * 症狀：房間評分（1-5）在 UI 上即時更新，但重啟 App 後恢復為預設值 3
 * 根因：updateRoomScore() 缺少 await safeSetItem(ROOM_SCORES_KEY, ...)
 *
 * 驗證方式：
 * 1. 掃描 indoor-air-navigator.tsx 源碼，確認 updateRoomScore 有 safeSetItem 調用
 * 2. 確認 ROOM_SCORES_KEY 被定義且被使用
 */
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const NAVIGATOR_PATH = path.join(PROJECT_ROOT, 'app/(tabs)/indoor-air-navigator.tsx');

describe('Regression: RT-006 Room Scores Persistence', () => {
  describe('Bug Prevention — Source Code Check', () => {
    it('test_room_scores_key_is_defined', () => {
      const content = fs.readFileSync(NAVIGATOR_PATH, 'utf-8');

      // ROOM_SCORES_KEY should be defined and mapped to STORAGE_KEYS
      const hasKeyDef = /ROOM_SCORES_KEY\s*=\s*STORAGE_KEYS\./.test(content);
      expect(hasKeyDef).toBe(true);
    });

    it('test_updateRoomScore_calls_safeSetItem', () => {
      const content = fs.readFileSync(NAVIGATOR_PATH, 'utf-8');

      // Find updateRoomScore function
      const funcMatch = content.match(/async\s+function\s+updateRoomScore\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/);
      expect(funcMatch).not.toBeNull();

      const funcBody = funcMatch![0];

      // Must call safeSetItem with ROOM_SCORES_KEY
      const hasSave = /safeSetItem\s*\(\s*ROOM_SCORES_KEY/.test(funcBody);
      expect(hasSave).toBe(true);
    });

    it('test_roomScores_state_is_loaded_on_mount', () => {
      const content = fs.readFileSync(NAVIGATOR_PATH, 'utf-8');

      // loadData should load ROOM_SCORES_KEY
      const loadDataMatch = content.match(/async\s+function\s+loadData\s*\([\s\S]*?\n\s*\}/);
      if (loadDataMatch) {
        const hasLoad = /safeGetItem\s*\(\s*ROOM_SCORES_KEY/.test(loadDataMatch[0]);
        expect(hasLoad).toBe(true);
      } else {
        // If no loadData found, check useEffect loads room scores
        const hasEffectLoad = /useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?safeGetItem[\s\S]*?\}/.test(content);
        expect(hasEffectLoad).toBe(true);
      }
    });
  });
});
