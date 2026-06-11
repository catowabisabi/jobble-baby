#!/usr/bin/env python3
"""Dispatch todo #120 - fix 12 accessibility labels - using here-doc approach"""
import subprocess
import time

session = "jobble-baby"

# Task content
task_content = """# Task: Fix Remaining 12 Accessibility Labels (Todo #120)

Pre-submission audit found 12 elements missing accessibilityLabel across 4+ tab files.
Fix all of them to achieve WCAG 2.1 AA compliance before app store submission.

## Files + Line Numbers
1. app/(tabs)/asymmetric-growth.tsx - line 244 (1 element)
2. app/(tabs)/circadian.tsx - lines 565, 590, 603, 609, 612, 656 (6 elements)
3. app/(tabs)/eight-month-storm.tsx - lines 180, 183 (2 elements)
4. app/(tabs)/jaundice-threshold.tsx - line 297 (1 element)
5. Check full audit output for 2 more elements

## Verification
Run: cd JobbleBaby && node scripts/pre-submission-audit.js
Section [4/9] Accessibility Labels should show: PASS (0 found)

## Rules
- Use existing i18n keys where applicable, or add new keys to en.json/zh.json
- TSC must pass: cd JobbleBaby && npx tsc --noEmit -> 0 errors
- Do NOT change any functionality - only add accessibilityLabel
- Commit after completion with: git add -A && git commit -m 'fix(a11y): remaining 12 accessibility labels' && git push

## Keywords
circadian_phase_shift, rem_cycle_stacking, clogged_milk_gland

ULW"""

# Write task to temp file
task_file = "/tmp/sisyphus_task_120.md"
with open(task_file, 'w') as f:
    f.write(task_content)

# Now send commands to tmux
subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
time.sleep(0.5)

# Clear
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)

# Send: read task file and execute instructions
subprocess.run(["tmux", "send-keys", "-t", session, f"cat {task_file}"])
subprocess.run(["tmux", "send-keys", "-t", session, "Enter"])
time.sleep(0.5)

# Send the task as a command to process
subprocess.run(["tmux", "send-keys", "-t", session, "python3 /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/_process_a11y_task.py &"])
subprocess.run(["tmux", "send-keys", "-t", session, "Enter"])

print("Dispatched todo #120 via file")

# Verify session is responsive
time.sleep(1)
result = subprocess.run(["tmux", "capture-pane", "-t", session, "-p"], capture_output=True, text=True)
print("Pane content (last 500 chars):", result.stdout[-500:] if result.stdout else "empty")