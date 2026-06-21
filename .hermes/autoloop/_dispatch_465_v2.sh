#!/bin/bash
# Dispatch task 465 — Fix Remaining Hardcoded String Arrays for i18n
# Run from jobble-baby tmux session

TASK_ID=465
PROJECT_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
APP_DIR="$PROJECT_DIR/JobbleBaby"
LOG="$PROJECT_DIR/.hermes/autoloop/sisyphus_response_465.txt"

cat > /tmp/task_465_v2.txt << 'TASKEOF'
# Task 465 — Fix Remaining Hardcoded String Arrays for i18n (Round 2)

## Context
Jobble Baby app. 5 tab files contain hardcoded string arrays that need i18n keys.
User-facing strings must be externalised for bilingual support.

## Files to Fix

### 1. app/(tabs)/diaper-cream.tsx
Lines 11-15: hardcoded string arrays (zinc oxide options, skin regions, rash types, severity levels)
- Add i18n keys: diaperCream.zincOxide.*, diaperCream.skinRegion.*, diaperCream.rashType.*, diaperCream.severity.*
- Replace string literals with t('diaperCream.zincOxide.xxx')

### 2. app/(tabs)/phototherapy-comfort.tsx
Line 36: const LAMP_TYPE_VALUES = ['LED', 'Halogen', 'Fiber Optic', 'BiliBlanket'] as const;
- Add i18n keys: phototherapy.lampType.led, phototherapy.lampType.halogen, phototherapy.lampType.fiberOptic, phototherapy.lampType.biliBlanket
- Replace with t('phototherapy.lampType.led') etc.

### 3. app/(tabs)/reflex-visual-motor.tsx
Line 25: const REFLEX_STATUS_OPTIONS = ['present', 'partially', 'integrated'] as const;
- Add i18n keys: reflex.status.present, reflex.status.partially, reflex.status.integrated
- Replace with t('reflex.status.present') etc.

### 4. app/(tabs)/regulatory-fitness.tsx
Line 259: const domains = ['autonomic', 'sensory', 'motor', 'social'] as const;
- Add i18n keys: regulatory.domain.autonomic, regulatory.domain.sensory, regulatory.domain.motor, regulatory.domain.social
- Replace with t('regulatory.domain.autonomic') etc.

### 5. app/(tabs)/sleep-architecture.tsx
Lines 56-57: hardcoded sound/light arrays
- Add i18n keys for: sleep.sound.whiteNoise, sleep.sound.pinkNoise, sleep.sound.brownNoise, sleep.light.veryDark, sleep.light.dark, sleep.light.medium, sleep.light.bright
- Replace string literals with t() calls

## Requirements
1. cd JobbleBaby && npx tsc --noEmit → 0 errors
2. node scripts/pre-submission-audit.js → hardcoded strings reduced
3. Add ALL new keys to BOTH en.json AND zh.json (same values)
4. Git commit after all 5 files pass
5. Write log to /tmp/sisyphus_465_log.txt

## Verification Commands
cd JobbleBaby && npx tsc --noEmit
node scripts/pre-submission-audit.js | grep HardcodedStrings

## Commit Message
fix: i18n externalisation for 5 tab hardcoded string arrays

TASKEOF

echo "[Dispatch $(date)] Task 465 dispatched" > "$LOG"
echo "Task written to /tmp/task_465_v2.txt" >> "$LOG"

# Send to tmux jobble-baby session
tmux send-keys -t jobble-baby:1.0 "cat /tmp/task_465_v2.txt | opencode run --dir $APP_DIR -- --prompt" C-m

echo "Dispatched via tmux at $(date)" >> "$LOG"