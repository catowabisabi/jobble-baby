#!/usr/bin/env python3
"""Dispatch todo #120 - fix 12 accessibility labels"""
import subprocess
import time

session = "jobble-baby"

# Task content
task_lines = [
    "# Task: Fix Remaining 12 Accessibility Labels (Todo #120)",
    "",
    "## Overview",
    "Pre-submission audit found 12 elements missing accessibilityLabel across 4+ tab files.",
    "Fix all of them to achieve WCAG 2.1 AA compliance before app store submission.",
    "",
    "## Files + Line Numbers",
    "1. app/(tabs)/asymmetric-growth.tsx — line 244 (1 element)",
    "2. app/(tabs)/circadian.tsx — lines 565, 590, 603, 609, 612, 656 (6 elements)",
    "3. app/(tabs)/eight-month-storm.tsx — lines 180, 183 (2 elements)",
    "4. app/(tabs)/jaundice-threshold.tsx — line 297 (1 element)",
    "5. Check full audit output for 2 more elements",
    "",
    "## Verification",
    "Run: cd JobbleBaby && node scripts/pre-submission-audit.js",
    "Section [4/9] Accessibility Labels should show: PASS (0 found)",
    "",
    "## Rules",
    "- Use existing i18n keys where applicable, or add new keys to en.json/zh.json",
    "- TSC must pass: cd JobbleBaby && npx tsc --noEmit → 0 errors",
    "- Do NOT change any functionality — only add accessibilityLabel",
    "- Commit after completion with: git add -A && git commit -m 'fix(a11y): remaining 12 accessibility labels' && git push",
]

# Cancel any pending input
subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
time.sleep(0.5)

# Clear line
subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
time.sleep(0.3)
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)

# Send task content line by line
for line in task_lines:
    cmd = ["tmux", "send-keys", "-t", session, line]
    subprocess.run(cmd)
    subprocess.run(["tmux", "send-keys", "-t", session, ""])
    time.sleep(0.03)

time.sleep(0.3)

# Send keywords
keywords = "Keywords: circadian_phase_shift, rem_cycle_stacking, clogged_milk_gland"
subprocess.run(["tmux", "send-keys", "-t", session, keywords])
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)

# Send ULW
subprocess.run(["tmux", "send-keys", "-t", session, "ULW"])
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)

# Confirm
subprocess.run(["tmux", "send-keys", "-t", session, "echo 'Task dispatched to Sisyphus'"])
subprocess.run(["tmux", "send-keys", "-t", session, ""])

print("Dispatched todo #120")