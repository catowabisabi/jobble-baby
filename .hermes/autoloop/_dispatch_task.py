#!/usr/bin/env python3
"""
Sisyphus Task Dispatch — Cycle 238
Fix accessibility: add accessibilityLabel to all interactive elements
"""
import os

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
1. Add accessibilityLabel="meaningful description" to every interactive element
2. Labels must be human-readable, specific, and localized (use t() for i18n text)
3. Do NOT use generic labels like "button" — use "Add feeding entry", "Navigate to sleep schedule"
4. For icons without text: accessibilityLabel={t('a11y.iconName')} — add keys to en.json + zh.json
5. For tab bar items: each tab icon needs a label like "Home tab", "Tracking tab", etc.
6. Do NOT change any logic, styles, or functionality — only add accessibilityLabel props

### Approach
1. Get baseline: cd JobbleBaby && grep -r "TouchableOpacity\|Pressable\|<Button\|accessibilityLabel" app/ --include="*.tsx" | wc -l
2. Go tab by tab, add accessibilityLabel to every interactive element
3. Add missing i18n keys for icon labels to en.json + zh.json under a11y.* namespace
4. Run: cd JobbleBaby && npx tsc --noEmit — 0 errors required

### After Fix
1. Run: cd JobbleBaby && npx tsc --noEmit (0 errors required)
2. Count labeled: grep -r "accessibilityLabel" app/ --include="*.tsx" | wc -l
3. Commit: git add -A && git commit -m "fix(a11y): add accessibilityLabel to all interactive elements — WCAG 2.1 AA compliance"
4. git push

## Keywords for this task
polyphasic sleep pattern, data_sovereignty, heart rate variability

## ULW — execute without asking"""

# Write task to _sisyphus_task.txt
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/_sisyphus_task.txt"
with open(task_file, "w") as f:
    f.write(task)

# Escape backticks for tmux send-keys
escaped = task.replace("`", "\\`")

# Send to tmux session line by line
import subprocess
lines = escaped.split("\n")
for line in lines:
    line = line + "\n" if line else "\n"
    subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", line])
    subprocess.run(["sleep", "0.05"])

print("Task dispatched to Sisyphus")