#!/bin/bash
# Dispatch cycle 446 - Fix pre-submission audit failures
cat > /tmp/task_391.txt << 'TASK'
# Sisyphus Task — Cycle 446
# Priority: P2
# Project: Jobble Baby

Fix 2 pre-submission audit failures in the Jobble Baby app.

=== Issue 1: Missing i18n keys ===
Add these 4 keys to BOTH JobbleBaby/app/i18n/en.json AND JobbleBaby/app/i18n/zh.json:

- tabs.vestibularMotor: English "Vestibular Motor", Chinese "前庭運動"
- key: English "Key", Chinese "鍵"
- common.next: English "Next", Chinese "下一步"
- common.skip: English "Skip", Chinese "跳過"

Ensure keys are nested correctly in both JSON files.

=== Issue 2: Accessibility warnings in behavioral-rehearsal.tsx ===
File: JobbleBaby/app/(tabs)/behavioral-rehearsal.tsx

The audit flags 19 elements missing accessibilityLabel. Add meaningful labels to ALL flagged elements. Examples:
- Scenario cards (lines 280, 289): "Scenario: [scenario name]" — use existing i18n keys where possible
- Exposure hierarchy items (lines 300, 303, 372, 383, 386): "Exposure level N: [description]"
- Outcome logger items (lines 450, 463, 468): "Outcome: [result]"
- Remaining 9 elements: add appropriate labels based on context

If i18n keys don't exist for labels, add them to en.json + zh.json.

=== Verification ===
After fixing:
1. cd JobbleBaby && npx tsc --noEmit → must pass 0 errors
2. node scripts/pre-submission-audit.js → i18n Keys and Accessibility Labels must PASS

=== Keywords ===
feeding_velocity, heat_rash_neonatal, melatonin_suppression_threshold

ULW
TASK

tmux send-keys -t jobble-baby "cat /tmp/task_391.txt | opencode run -m minimax-coding-plan/MiniMax-M2 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter