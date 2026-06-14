#!/usr/bin/env python3
"""Dispatch cycle 347 — Register reflex-visual-motor tab"""
import subprocess

autoloop = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop"
task_file = f"{autoloop}/sisyphus_task_347.txt"

task_content = """# Todo #347: Register reflex-visual-motor tab in _layout.tsx
# Status: DISPATCHED
# Keywords: reflex_visual_motor_tab, tab_navigator_registration, reflexVisualMotor

## Task for Sisyphus

The file `app/(tabs)/reflex-visual-motor.tsx` exists (296 lines) but is NOT registered in the tab navigator `app/_layout.tsx`.

### STEP 1 — Audit reflex-visual-motor.tsx i18n completeness

Read `app/(tabs)/reflex-visual-motor.tsx` and `app/i18n/en.json`.
Check which i18n keys are used in the file vs which exist in en.json.
Fix any missing i18n keys by adding them to both `app/i18n/en.json` and `app/i18n/zh.json`.

### STEP 2 — Register tab in _layout.tsx

Read `app/_layout.tsx` TabNavigator function.
Add a Tabs.Screen entry for `reflex-visual-motor`:
- name="reflex-visual-motor"
- title: t('tabs.reflexVisualMotor')
- tabBarIcon: use MaterialIcons name="psychology" or similar reflex/neurology icon

Insert it in a logical position (after constellation or before profile).

### STEP 3 — Verify

Run: npx tsc --noEmit — must pass with 0 errors (or confirm types are valid)

### STEP 4 — Commit

Git add + commit with message: "feat(tab): register reflex-visual-motor in tab navigator"

DONE
ULW"""

with open(task_file, "w") as f:
    f.write(task_content)

# Send task content to tmux
cmd = f"tmux send-keys -t jobble-baby 'cat << \\'SisyphusEnd\\' > /tmp/sisyphus_task.txt\n{task_content}\nSisyphusEnd' Enter"
subprocess.run(cmd, shell=True)
