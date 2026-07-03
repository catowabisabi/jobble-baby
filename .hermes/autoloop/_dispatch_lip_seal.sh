#!/bin/bash
# Dispatch cycle 1101 — Task #411: Lip Seal Navigator
TARGET="jobble-baby:1.0"

tmux send-keys -t "$TARGET" C-c
sleep 1

cat > /tmp/task_lipseal.txt << 'TASK_END'
# Task: Implement Lip Seal Competence Navigator Tab

## Context
- REPO: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
- Tab file to create: JobbleBaby/app/(tabs)/lip-seal-navigator.tsx
- i18n files: JobbleBaby/app/i18n/en.json + zh.json
- Register in: JobbleBaby/app/(tabs)/_layout.tsx

## Keywords (prompt3)
lip_seal_competence, nasal_breathing_establishment, oral_motor_development

## Full Spec

### Problem
Lip seal competence is a critical but overlooked oral motor development indicator. Babies who fail to develop adequate lip seal by 6-12 months risk prolonged mouth breathing, affecting sleep quality, facial development, and feeding efficiency.

### What to build

Create app/(tabs)/lip-seal-navigator.tsx with these sections:

**Section 1 — Lip Seal Assessment**
- Weekly log entry with 3-level quality picker: sealed (good) / partially open (monitor) / mouth breathing (refer)
- Date picker for each entry
- Optional note field
- List view of past entries with date + quality badge

**Section 2 — Nasal Breathing Establishment Timeline**
- Toggle: "Baby breathes through nose during sleep" Yes/No/Unknown per entry
- Toggle: "Baby breathes through nose while awake" Yes/No/Unknown
- Timeline view showing establishment progress over time

**Section 3 — Feeding Efficiency Correlation**
- Quick log: feeding session quality (good latch / fair / poor) linked to lip seal score
- Show correlation: if lip seal is "sealed" does feeding quality improve?
- Simple bar or line chart: feeding quality vs lip seal score over 30 days

**Section 4 — Facial Development Checkpoints**
- 4 milestone toggles with dates:
  - "Mouth rests closed when awake" (achieved / not yet)
  - "Tongue rests on palate" (achieved / not yet)
  - "No persistent open-mouth posture" (achieved / not yet)
  - "Midface appears normal" (achieved / not yet)
- Visual checklist with date stamps

**Section 5 — Alert System**
- Alert banner if mouth breathing logged after 6 months age
- Alert if all facial milestones still "not yet" by 9 months
- Alert: "Lip tie screening recommended — consult pediatric dentist"

### Data Model
- @jobble/lip_seal_log: Array of { date, quality, feedingQuality, notes }
- @jobble/nasal_breathing_timeline: Array of { date, nasalSleep, nasalAwake }
- @jobble/facial_milestones: { mouthRestClosed, tongueOnPalate, noOpenMouth, midfaceNormal }

### i18n Keys to add
Add to en.json and zh.json under lipSeal section:
- lipSeal.title, lipSeal.assessTitle, lipSeal.sealed, lipSeal.partiallyOpen, lipSeal.mouthBreathing
- lipSeal.nasalTitle, lipSeal.nasalSleep, lipSeal.nasalAwake, lipSeal.nasalYes, lipSeal.nasalNo, lipSeal.nasalUnknown
- lipSeal.feedingTitle, lipSeal.feedingGood, lipSeal.feedingFair, lipSeal.feedingPoor
- lipSeal.milestoneTitle, lipSeal.milestone1, lipSeal.milestone2, lipSeal.milestone3, lipSeal.milestone4
- lipSeal.alertMouthBreathing, lipSeal.alertMilestonesDelayed, lipSeal.alertLipTieScreening
- tabs.lipSeal (for TabNavigator label)

### Steps
1. Create app/(tabs)/lip-seal-navigator.tsx following existing tab patterns (e.g., suckle-to-chew-bridge.tsx)
2. Register Tabs.Screen in app/(tabs)/_layout.tsx
3. Add all i18n keys to en.json and zh.json
4. Run: npx tsc --noEmit → must pass 0 errors
5. Run: node scripts/pre-submission-audit.js → must pass

### Verification
- TSC: 0 errors
- Audit: PASS
- Tab visible in TabNavigator
- All interactive elements have accessibilityLabel
- No hardcoded user-facing strings

ULW
TASK_END

tmux send-keys -t "$TARGET" "cat /tmp/task_lipseal.txt | opencode run --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -m minimax-coding-plan/MiniMax-M2.7 -- > /tmp/opencode_lipseal.log 2>&1 &" Enter
sleep 2
echo "Dispatched cycle 1101 — Lip Seal Navigator (todo #411)"
