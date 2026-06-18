#!/bin/bash
# Cycle 410 dispatch — Fix accessibilityLabel gaps in 4 tab files
# Priority: P2

cat > /tmp/sisyphus_task_410.txt << 'TASK_END'
# Sisyphus Task — Cycle 410
# Priority: P2
# Project: Jobble Baby

Fix accessibilityLabel gaps in 4 tab files — App Store accessibility compliance.

## Files to fix:

### 1. diaper-cream.tsx — 8 missing accessibilityLabel
- 11 TouchableOpacity elements, only 3 have accessibilityLabel
- Add accessibilityLabel to every TouchableOpacity
- Use t('diaperCream.*') keys where available
- If no existing key, add to en.json + zh.json under diaperCream namespace

### 2. suckle-to-chew-bridge.tsx — 12 missing accessibilityLabel
- 20 TouchableOpacity elements, only 8 have accessibilityLabel
- Many tabs and buttons are missing labels
- Use t('suckleToChewBridge.*') keys where available
- If no existing key, add to en.json + zh.json

### 3. sensory-integration.tsx — 4 missing accessibilityLabel
- 9 TouchableOpacity elements, only 5 have accessibilityLabel
- Use t('sensoryIntegration.*') keys where available
- Add new i18n keys if needed

### 4. reflex-visual-motor.tsx — 3 missing accessibilityLabel
- 13 TouchableOpacity elements, only 10 have accessibilityLabel
- Use t('reflexVisualMotor.*') keys where available
- Add new i18n keys if needed

## Requirements:
- Add accessibilityLabel={t('namespace.key')} or accessibilityLabel="text" to EVERY TouchableOpacity
- Add new i18n keys to app/i18n/en.json AND app/i18n/zh.json
- TSC: cd JobbleBaby && npx tsc --noEmit must pass 0 errors after each file
- Reference existing patterns in codebase (e.g., gesture-milestone.tsx has good accessibilityLabel coverage)
- No raw AsyncStorage — use safeGetItem/safeSetItem

## Verification:
After each file:
- npx tsc --noEmit → 0 errors
- grep -c accessibilityLabel on the file should match TouchableOpacity count

**DONE ULW**
Repo: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
TASK_END

echo "Task 410 written to /tmp/sisyphus_task_410.txt"
