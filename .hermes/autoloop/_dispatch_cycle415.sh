#!/bin/bash
# Cycle 415 dispatch — Fix sleep-architecture.tsx saved entry i18n bug
# Bug: Line 480 shows whiteNoiseLog entry soundType as raw string without ti() lookup

tmux send-keys -t jobble-baby:1.0 C-c
sleep 1

cat << 'PROMPT' | tmux load-buffer -b task415 -
# Task 386 — Fix sleep-architecture.tsx saved entry i18n display bug

## Bug Description
In `app/(tabs)/sleep-architecture.tsx`, line 480 displays a saved `whiteNoiseLog` entry's `soundType` as a raw string without i18n lookup:

```tsx
// Line 480 — BUG: raw string displayed
{t('sleepArchitecture.todaySound')}: {whiteNoiseLog[whiteNoiseLog.length - 1].soundType}
```

The `SOUND_TYPE_I18N` mapping exists (line 109-116) and is used correctly in the Chip components. But when **displaying saved entries**, the raw English value (e.g., "White Noise") is shown directly without `ti()` lookup.

## Fix Required
Wrap the soundType display with the i18n lookup:

```tsx
// CORRECT pattern (used in Chip label on line 467):
label={ti(SOUND_TYPE_I18N[sound])}

// Line 480 should use same pattern for saved data:
{t('sleepArchitecture.todaySound')}: {ti(SOUND_TYPE_I18N[whiteNoiseLog[whiteNoiseLog.length - 1].soundType])}
```

## Files to Modify
- `app/(tabs)/sleep-architecture.tsx` — line 480

## Rules
1. Read the file first to confirm exact context
2. The `SOUND_TYPE_I18N` object is already defined (lines 109-116)
3. Use `ti(SOUND_TYPE_I18N[...])` pattern matching what's used in Chip labels
4. Run `npx tsc --noEmit` after — must pass 0 errors

## Verification
- `npx tsc --noEmit` → 0 errors
- The saved soundType now displays via `ti()` lookup

## Output
Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_415.txt

ULW
PROMPT

tmux paste-buffer -t jobble-baby:1.0
echo "Dispatched cycle 415"
