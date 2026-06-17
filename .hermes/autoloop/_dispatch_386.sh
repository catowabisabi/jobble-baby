#!/bin/bash
# Cycle 386 dispatch — Fix 5 tab files hardcoded label arrays → i18n
# Painpoint: #26

cat > /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_386.txt << 'TASK'
Repo: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

## Task

Fix hardcoded user-visible string arrays in 5 tab files → convert to i18n using `t()` helper.

### File 1: bilateral-coordination.tsx
Lines 37-46 — 10 hardcoded activity labels in ACTIVITY_OPTIONS array.
Add key `bilateral-coordination.activityOptions` with 10 sub-keys to en.json + zh.json.
Convert each `label:` to use `t('bilateral-coordination.activityOptions.grasping')` etc.

### File 2: circadian.tsx
Lines 68, 71, 73, 92 — 4 phase labels ('Sleep', 'Feeding', 'Wake').
Add keys `circadian.phase.sleep`, `circadian.phase.feeding`, `circadian.phase.wake`.
Also `circadian.nextPhase.feeding`, `circadian.nextPhase.wake`, `circadian.nextPhase.sleep`.

### File 3: colic-relief.tsx
Lines 26-30 — 5 technique labels in TECHNIQUE_OPTIONS.
Add key `colicRelief.techniqueOptions` with 5 sub-keys to en.json + zh.json.
Icon emojis remain hardcoded (not i18n'd).

### File 4: caregiver-fatigue.tsx
Lines 53-60 — 8 activity labels in ACTIVITY_ESTIMATES array.
Add key `caregiverFatigue.activityEstimates` with 8 sub-keys.

### File 5: asymmetric-growth.tsx
Lines 42-45 — 4 severity labels in `getSeverity()`.
Add keys `asymmetric.severity.normal`, `mild`, `moderate`, `significant`.
Colors stay hardcoded.

### Verification
After each file: `npx tsc --noEmit` → 0 errors required.

**DONE ULW**
TASK

echo "Dispatch written: sisyphus_task_386.txt"
