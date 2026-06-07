#!/usr/bin/env python3
"""
Sisyphus Task Dispatch — Cycle 238
Write task to sisyphus_task.txt and signal worker to execute
"""
import subprocess, time, os

task = """# Sisyphus Task — Cycle 238

## Context
Jobble Baby: TSC 0 errors, 51 tabs, all implemented. Critical accessibility gap identified: 861 interactive elements have ZERO accessibilityLabel attributes. WCAG 2.1 AA requires all interactive elements have accessible names. This must be fixed before App Store submission.

## Task: Fix Accessibility — Add accessibilityLabel to All Interactive Elements

Audit and fix ALL interactive elements across the entire codebase. Every button, TouchableOpacity, Pressable, TextInput, and tab bar icon must have a meaningful accessibilityLabel.

### Scope
- app/(tabs)/ — all .tsx files (51 tabs)
- components/ — any shared interactive components
- Tab bar icons in app/(tabs)/_layout.tsx

### Rules
1. Add accessibilityLabel to every interactive element
2. Labels must be human-readable, specific, and localized (use t() for i18n text)
3. Do NOT use generic labels like button — use Add feeding entry, Navigate to sleep schedule
4. For icons without text: accessibilityLabel={t('a11y.iconName')} — add keys to en.json + zh.json
5. For tab bar items: each tab icon needs a label like Home tab, Tracking tab, etc.
6. Do NOT change any logic, styles, or functionality — only add accessibilityLabel props

### Approach
1. Get baseline: cd JobbleBaby && grep -r TouchableOpacity\\\\|Pressable\\\\|<Button\\\\|accessibilityLabel app/ --include=*.tsx | wc -l
2. Go tab by tab, add accessibilityLabel to every interactive element
3. Add missing i18n keys for icon labels to en.json + zh.json under a11y.* namespace
4. Run: cd JobbleBaby && npx tsc --noEmit — 0 errors required

### After Fix
1. Run: cd JobbleBaby && npx tsc --noEmit (0 errors required)
2. Count labeled: grep -r accessibilityLabel app/ --include=*.tsx | wc -l
3. Commit: git add -A && git commit -m 'fix(a11y): add accessibilityLabel to all interactive elements — WCAG 2.1 AA compliance'
4. git push

## Keywords for this task
polyphasic sleep pattern, data_sovereignty, heart rate variability

## ULW — execute without asking"""

# Write task to sisyphus_task.txt
AUTOLOOP = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop"
task_file = os.path.join(AUTOLOOP, "sisyphus_task.txt")
with open(task_file, "w") as f:
    f.write(task + "\n")

# Also update _sisyphus_task.txt
current_dispatch = os.path.join(AUTOLOOP, "_sisyphus_task.txt")
with open(current_dispatch, "w") as f:
    f.write(task + "\n")

print(f"Task written to {task_file}")

# Signal worker via a marker file
marker = os.path.join(AUTOLOOP, "_dispatch_signal")
with open(marker, "w") as f:
    f.write("238\n")

# Send Enter to tmux to ensure Sisyphus is at a prompt
subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", "Enter"])
time.sleep(0.5)

# Check if there's a watcher process that reads sisyphus_task.txt
# If not, we need to cat the file to Sisyphus
result = subprocess.run(["tmux", "capture-pane", "-t", "jobble-baby", "-p"],
                       capture_output=True, text=True)
pane_content = result.stdout

# If Sisyphus is at a prompt, send a command to read the task
if "JobbleBaby$" in pane_content or "$" in pane_content:
    # Send cat command to display task
    cmd = f'echo "=== TASK DISPATCHED ===" && cat {task_file}'
    for line in cmd.split("\n"):
        subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", line])
        subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", "Enter"])
        time.sleep(0.1)

print("Dispatch signal sent")