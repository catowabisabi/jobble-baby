#!/bin/bash
# Cycle 466 — Dispatch task #395: Lactation & Pumping Tracker

TASK_FILE="/tmp/task_466.txt"
LOG_FILE="/tmp/sisyphus_466_log.txt"
OUT_FILE="/tmp/opencode_466.log"

cat > "$TASK_FILE" << 'TASKEOF'
# Task #395 — Implement Lactation & Pumping Tracker tab

## Context
Jobble Baby is a bilingual (EN/ZH) React Native / Expo app. The git repo is at /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/ — the app code lives in the JobbleBaby/ subdirectory.

## Goal
Implement a new tab: app/(tabs)/lactation.tsx — Lactation & Pumping Tracker.

## Features

### 1. Pumping Session Logger
- Duration (minutes), volume (oz or ml), pump type (hands-free, electric, manual)
- Letdown quality: fast / medium / slow
- Side: left / right / both
- Notes text field
- Date/time (auto-captured)
- Save to AsyncStorage key: @jobble/lactation_entries

### 2. Supply Trend Chart
- Weekly totals chart (bar chart)
- Alert card if daily output drops >30% vs weekly average (possible mastitis/hormonal shift)
- Alert card if supply ramping well (3+ consecutive increases)

### 3. Milk Storage Manager
- Add stored milk: amount, date expressed, expiration date, storage location (freezer/fridge/donor)
- List view sorted by expiration (FIFO)
- Mark as used/defrosted
- Storage key: @jobble/lactation_storage

### 4. Weaning Predictor
- Based on last 14 days pumping frequency, estimate weeks-to-weaning
- Show if frequency trending down (>20% drop over 2 weeks = active weaning)
- Suggest gradual reduction schedule (drop 1 session per week)

### 5. Tab Integration
- Correlate with feeding tab: show direct BF vs pumping ratio
- Correlate with sleep: show night pumping disruption score

## Technical Requirements
- File: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/app/(tabs)/lactation.tsx
- Add Tabs.Screen to /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/app/(tabs)/_layout.tsx — use existing i18n key pattern e.g. 'lactation.title' → "Lactation"
- Add i18n keys to /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/app/i18n/en.json and zh.json under "lactation.*"
- AsyncStorage keys: @jobble/lactation_entries, @jobble/lactation_storage, @jobble/lactation_settings
- Use safeGetItem/safeSetItem from ../utils/SafeStorage
- Use useLanguage() hook for t() translations
- TSC must pass: npx tsc --noEmit → 0 errors
- Accessibility: all interactive elements must have accessibilityLabel
- Style consistently with existing tabs (use existing StyleSheet patterns)

## Verification
1. Run: npx tsc --noEmit in JobbleBaby/ — must be 0 errors
2. Run: node scripts/pre-submission-audit.js — must PASS
3. Verify tab appears in the tab navigator
4. Write summary to $LOG_FILE

## Quality Gates
- No hardcoded user-facing strings — all via t() i18n
- No console.log statements
- TypeScript strict — no 'any' types
TASKEOF

cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

cat "$TASK_FILE" | opencode run \
  --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby \
  --prompt > "$OUT_FILE" 2>&1 &

echo "Dispatched PID: $!"
echo "Log: $OUT_FILE"
echo "Task: $TASK_FILE"
