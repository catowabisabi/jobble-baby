#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

TASK="# Task: Fix Hardcoded i18n Strings (Todo #117)

## Overview
22 hardcoded string arrays across 8 tab files need i18n keys before App Store submission. Color hex arrays and numeric data can stay hardcoded (not UI-displayed).

## Files to Fix
1. app/(tabs)/asymmetric-growth.tsx — body part labels ('head', 'arm', 'leg')
2. app/(tabs)/bonding-journal.tsx — mood labels + color hex
3. app/(tabs)/colic-relief.tsx — trigger categories + sound types
4. app/(tabs)/cry-analyzer.tsx — weekday labels
5. app/(tabs)/feeding-readiness.tsx — taste categories ('bland', 'umami', 'sweet')
6. app/(tabs)/habit-reset.tsx — habit categories ('sleep', 'exercise', 'nutrition')
7. app/(tabs)/jaundice.tsx — light types ('LED', 'Halogen', 'Fiber Optic')
8. app/(tabs)/jet-lag.tsx — timezone strings ('UTC+8', 'UTC+5:30'...)

## Rules
- Add new keys to app/i18n/en.json AND app/i18n/zh.json
- Keep all existing i18n keys intact
- Color hex arrays and numeric data arrays can stay hardcoded (not UI-displayed strings)
- TSC must pass with 0 errors after changes
- Do NOT change any functionality — only replace hardcoded strings with t('key') calls

## Verification
1. npx tsc --noEmit → 0 errors
2. Run: node scripts/pre-submission-audit.js → 0 hardcoded string warnings
3. Both en.json and zh.json must have all new keys

## Keywords
muscle_mass_gain, suprachiasmatic_nucleus, homeodynamic_space
ULW"

echo "$TASK" | tmux load-buffer -b sisyphus_task -
