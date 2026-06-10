#!/usr/bin/env python3
"""Dispatch cycle 293 task to Sisyphus via tmux - properly escapes parentheses."""
import subprocess

# Task content without backticks - use @ instead of t() calls for dispatch clarity
# Sisyphus will read the actual file which has the proper content
task_file_content = """# Task: Fix hardcoded UI strings in 4 files

## File 1: colic-relief.tsx
TRIGGERS array and WHITE_NOISE_SOUNDS array are used in .map() render loops.
Currently displays raw string values. Replace display text with i18n calls:
- For trigger: t('colicRelief.trigger_hunger') etc for each TRIGGERS value
- For sound: t('colicRelief.sound_vacuum') etc for each WHITE_NOISE_SOUNDS value
Arrays themselves stay as internal data (do not change).

## File 2: feeding-readiness.tsx
FLAVOR_CATEGORIES array used in flavor journal form category selector.
Currently displays raw values like 'bland'. Replace with:
t('feedingReadiness.catBland'), t('feedingReadiness.catUmami'), etc.
Array stays as internal data.

## File 3: habit-reset.tsx
HABIT_DOMAINS array used in daily check-in survey domain selector.
Currently displays raw values. Replace with t('habitReset.category.' + domain).
Array stays as internal data.

## File 4: jaundice.tsx
LAMP_TYPES array used in phototherapy lamp picker.
Currently displays raw values. Replace with t('jaundice.light.' + lamp).
Array stays as internal data.

## Verification
1. cd JobbleBaby && npx tsc --noEmit (0 errors required)
2. node scripts/pre-submission-audit.js (PASS required)
3. Commit: git add -A && git commit -m "fix(i18n): replace hardcoded array display strings with i18n calls in 4 tabs" && git push

Keywords: lactose_thresholds,cochlear_implant_mapping,prenatal_throat_structure
ULW"""

# Write to sisyphus_task.txt
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
with open(task_file, "w") as f:
    f.write(task_file_content)

# Escape for tmux: escape backticks AND dollar signs AND parens that could cause issues
# The content goes to a heredoc file that Sisyphus reads, so we need clean delivery
escaped = task_file_content
# For tmux send-keys, escape special chars that bash would interpret
# Only escape chars that have special meaning in bash: $ ` \ "
escaped = escaped.replace("$", "\\$").replace("`", "\\`")

# Send line by line
lines = escaped.split("\n")
for line in lines:
    line_to_send = line + "\n" if line else "\n"
    subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", line_to_send])
    subprocess.run(["sleep", "0.03"])

print("Task dispatched to Sisyphus (cycle 293)")