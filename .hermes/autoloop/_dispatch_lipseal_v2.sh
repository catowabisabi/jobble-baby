#!/bin/bash
# Dispatch cycle 1103 — Task #412: Lip Seal Navigator (re-dispatch)
TARGET="jobble-baby:1.0"

tmux send-keys -t "$TARGET" C-c
sleep 1

cat > /tmp/task_lipseal_v2.txt << 'TASK_END'
# Task: Implement Lip Seal Competence Navigator Tab — DO IT NOW

## Context
- REPO: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
- Tab file to create: app/(tabs)/lip-seal-navigator.tsx
- i18n files: app/i18n/en.json + app/i18n/zh.json
- Register in: app/(tabs)/_layout.tsx

## What to build (5 sections)

### Section 1 — Lip Seal Assessment
- Weekly log: 3-level quality picker (sealed/partiallyOpen/mouthBreathing)
- Date picker + optional notes per entry
- List view of past entries with quality badge

### Section 2 — Nasal Breathing Establishment Timeline
- Toggle per entry: nasalSleep (Yes/No/Unknown) + nasalAwake (Yes/No/Unknown)
- Timeline view

### Section 3 — Feeding Efficiency Correlation
- Feeding quality per session: goodLatch/fair/poor
- Simple bar chart: lip seal quality vs feeding quality over 30 days

### Section 4 — Facial Development Checkpoints
- 4 milestone toggles with dates: mouthRestClosed, tongueOnPalate, noOpenMouth, midfaceNormal
- Visual checklist with date stamps

### Section 5 — Alert System
- Alert if mouth breathing logged after 6 months
- Alert if all facial milestones "not yet" by 9 months
- Alert: lip tie screening referral

## Data Model
- @jobble/lip_seal_log: Array of {date, quality, feedingQuality, notes}
- @jobble/nasal_breathing_timeline: Array of {date, nasalSleep, nasalAwake}
- @jobble/facial_milestones: {mouthRestClosed, tongueOnPalate, noOpenMouth, midfaceNormal}

## i18n Keys (add to both en.json + zh.json)
lipSeal.title, lipSeal.assessTitle, lipSeal.sealed, lipSeal.partiallyOpen, lipSeal.mouthBreathing
lipSeal.nasalTitle, lipSeal.nasalSleep, lipSeal.nasalAwake, lipSeal.nasalYes, lipSeal.nasalNo, lipSeal.nasalUnknown
lipSeal.feedingTitle, lipSeal.feedingGood, lipSeal.feedingFair, lipSeal.feedingPoor
lipSeal.milestoneTitle, lipSeal.milestone1, lipSeal.milestone2, lipSeal.milestone3, lipSeal.milestone4
lipSeal.alertMouthBreathing, lipSeal.alertMilestonesDelayed, lipSeal.alertLipTieScreening
tabs.lipSeal

## Steps
1. cat app/(tabs)/suckle-to-chew-bridge.tsx | head -30  (study pattern)
2. create app/(tabs)/lip-seal-navigator.tsx (follow pattern)
3. add i18n keys to en.json and zh.json
4. register tab in app/(tabs)/_layout.tsx (add to tabs array + import)
5. npx tsc --noEmit  (must pass 0 errors)
6. git add -A && git commit -m "feat: Lip Seal Competence Navigator tab"

## Pattern to follow
Use: useTheme, ThemedView, ThemedText, PressableScale, t() from i18n
AsyncStorage keys from: app/(tabs)/index.tsx or store/storage-keys.ts
ULW
TASK_END

tmux send-keys -t "$TARGET" "cat > /tmp/task_lipseal_v2.txt << 'TASK_END'
# Task: Implement Lip Seal Competence Navigator Tab — DO IT NOW

## Context
- REPO: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
- Tab file to create: app/(tabs)/lip-seal-navigator.tsx
- i18n files: app/i18n/en.json + app/i18n/zh.json
- Register in: app/(tabs)/_layout.tsx

## What to build (5 sections)

### Section 1 — Lip Seal Assessment
- Weekly log: 3-level quality picker (sealed/partiallyOpen/mouthBreathing)
- Date picker + optional notes per entry
- List view of past entries with quality badge

### Section 2 — Nasal Breathing Establishment Timeline
- Toggle per entry: nasalSleep (Yes/No/Unknown) + nasalAwake (Yes/No/Unknown)
- Timeline view

### Section 3 — Feeding Efficiency Correlation
- Feeding quality per session: goodLatch/fair/poor
- Simple bar chart: lip seal quality vs feeding quality over 30 days

### Section 4 — Facial Development Checkpoints
- 4 milestone toggles with dates: mouthRestClosed, tongueOnPalate, noOpenMouth, midfaceNormal
- Visual checklist with date stamps

### Section 5 — Alert System
- Alert if mouth breathing logged after 6 months
- Alert if all facial milestones \"not yet\" by 9 months
- Alert: lip tie screening referral

## Data Model
- @jobble/lip_seal_log: Array of {date, quality, feedingQuality, notes}
- @jobble/nasal_breathing_timeline: Array of {date, nasalSleep, nasalAwake}
- @jobble/facial_milestones: {mouthRestClosed, tongueOnPalate, noOpenMouth, midfaceNormal}

## i18n Keys (add to both en.json + zh.json)
lipSeal.title, lipSeal.assessTitle, lipSeal.sealed, lipSeal.partiallyOpen, lipSeal.mouthBreathing
lipSeal.nasalTitle, lipSeal.nasalSleep, lipSeal.nasalAwake, lipSeal.nasalYes, lipSeal.nasalNo, lipSeal.nasalUnknown
lipSeal.feedingTitle, lipSeal.feedingGood, lipSeal.feedingFair, lipSeal.feedingPoor
lipSeal.milestoneTitle, lipSeal.milestone1, lipSeal.milestone2, lipSeal.milestone3, lipSeal.milestone4
lipSeal.alertMouthBreathing, lipSeal.alertMilestonesDelayed, lipSeal.alertLipTieScreening
tabs.lipSeal

## Steps
1. cat app/(tabs)/suckle-to-chew-bridge.tsx | head -30  (study pattern)
2. create app/(tabs)/lip-seal-navigator.tsx (follow pattern)
3. add i18n keys to en.json and zh.json
4. register tab in app/(tabs)/_layout.tsx (add to tabs array + import)
5. npx tsc --noEmit  (must pass 0 errors)
6. git add -A && git commit -m \"feat: Lip Seal Competence Navigator tab\"

## Pattern to follow
Use: useTheme, ThemedView, ThemedText, PressableScale, t() from i18n
AsyncStorage keys from: app/(tabs)/index.tsx or store/storage-keys.ts
ULW
TASK_END"
sleep 1
tmux send-keys -t "$TARGET" Enter
sleep 1
echo "Task written to /tmp/task_lipseal_v2.txt"
