#!/usr/bin/env python3
"""Dispatch Cycle 317 — Fix remaining hardcoded strings"""
import subprocess
import sys

TASK = """# Task: Fix Hardcoded Strings — 20 remaining i18n keys

## Context
App is submission-ready (68 tabs, TSC 0, i18n 1738 keys matched) but pre-submission audit still reports 20 hardcoded strings across 5 files.

## Objective
Replace ALL remaining hardcoded strings with i18n t() calls. Add missing keys to en.json + zh.json.

## Files + Lines to Fix

### sleep-association.tsx
- Line 314: "Today's Log" → t('sleepAssociation.todayLog')
- Line 324: "Fall asleep:" → t('sleepAssociation.fallAsleep')
- Line 328: "Wakings:" → t('sleepAssociation.wakings')
- Line 332: "Longest:" → t('sleepAssociation.longest')
- Line 349: "Edit Entry" → t('sleepAssociation.editEntry')
- Line 558: "Fall:" → t('sleepAssociation.fall')
- Line 562: "Wakings:" → t('sleepAssociation.wakings')
- Line 566: "Longest:" → t('sleepAssociation.longest')

### solid-food.tsx
- Line 367: "Feeding Journey" → t('solidFood.feedingJourney')
- Line 597: "Current" → t('solidFood.current')
- Line 656: "Growth Impact →" → t('solidFood.growthImpact')
- Line 668: "Teething → Food Refusal →" → t('solidFood.teethingFoodRefusal')

### stress-cascade.tsx
- Line 416: "Optional inputs" → t('stressCascade.optionalInputs')
- Line 484: "Come back in 5 minutes" → t('stressCascade.comeBackIn5Minutes')

### teething.tsx
- Line 314: "Expected Soon" → t('teething.expectedSoon')
- Line 350: "ERUPTED" → t('teething.erupted')

### tongue-tie.tsx
- Line 431: "Latch:" → t('tongueTie.latch')
- Line 433: "Milk:" → t('tongueTie.milk')
- Line 434: "Flow:" → t('tongueTie.flow')
- Line 514: "Cancel" → t('tongueTie.cancel')

## Steps
1. Add all missing i18n keys to en.json and zh.json (under appropriate sections)
2. Replace each hardcoded string in each file with t('key')
3. Run: npx tsc --noEmit to verify TSC 0 errors
4. Run: node scripts/pre-submission-audit.js to verify HardcodedStrings PASS

## Keywords
prompt3: sleep_association_log, solid_food_journey, stress_cascade_inputs, teething_eruption_milestone, tongue_tie_latch_flow

## Verification
- TSC: 0 errors
- Audit: HardcodedStrings PASS

ULW"""

def main():
    # Write task to sisyphus_task.txt
    with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt', 'w') as f:
        f.write(TASK)

    # Copy to current dispatch
    with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/_current_dispatch.txt', 'w') as f:
        f.write(TASK)

    # Set tmux buffer and paste
    with open('/tmp/task_buffer.txt', 'w') as f:
        f.write(TASK)

    # Use tmux set-buffer and paste
    subprocess.run(['tmux', 'set-buffer', '-b', 'sisyphus_task', '-f', 'copy-mode', 'task_buffer.txt'], check=False)
    subprocess.run(['tmux', 'paste-buffer', '-b', 'sisyphus_task', '-t', 'sisyphus'], check=False)
    subprocess.run(['tmux', 'send-keys', '-t', 'sisyphus', 'C-m'], check=False)

    print("Dispatched: Fix 20 hardcoded strings across 5 files")
    return 0

if __name__ == '__main__':
    sys.exit(main())
