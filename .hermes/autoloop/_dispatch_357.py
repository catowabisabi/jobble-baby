#!/usr/bin/env python3
"""Dispatch cycle 357: Todo #354 AsyncStorage SafeStorage Wrapper"""
import subprocess, time, shlex

SESSION = "jobble-baby"
REPO = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB = f"{REPO}/JobbleBaby"
AUTOLOOP = f"{REPO}/.hermes/autoloop"

TASK = """# Todo #354: AsyncStorage SafeStorage Wrapper
# Keywords: thermal_conduction_skin_contact, state_co_regulation, latch_asymmetry_heatmap

## Task for Sisyphus

Wrap ALL AsyncStorage calls across the app with proper error handling.

STEP 1 — Explore the codebase:
- Find ALL files that use AsyncStorage (grep "AsyncStorage" in JobbleBaby/)
- Check how useStorage or similar hooks are used
- Read app/theme.ts for COLORS usage pattern

STEP 2 — Create SafeStorage utility:
- File: JobbleBaby/utils/SafeStorage.ts
- Export async functions: safeGetItem(key), safeSetItem(key, value), safeRemoveItem(key)
- Each wraps try-catch around AsyncStorage calls
- On error: log warning, return null (get) or false (set/remove)
- No silent crashes — errors always handled

STEP 3 — Replace all AsyncStorage usage:
- For every file using AsyncStorage.getItem/setItem/removeItem:
  - Replace with SafeStorage equivalents
  - Handle null/false returns gracefully
- Do NOT modify package.json or install new deps

STEP 4 — Verify:
- TSC: npx tsc --noEmit (0 errors)
- No "AsyncStorage" direct calls remain (grep check)

Report how many files were updated and any edge cases you found.

ULW"""

# Write task to both autoloop and /tmp (sisyphus reads from /tmp)
task_file = f"{AUTOLOOP}/sisyphus_task_357.txt"
with open(task_file, "w") as f:
    f.write(TASK)

# Also copy to /tmp/sisyphus_task.txt for the tmux command
with open("/tmp/sisyphus_task.txt", "w") as f:
    f.write(TASK)

print(f"Task written to {task_file} and /tmp/sisyphus_task.txt")

# Interrupt current process
subprocess.run(["tmux", "send-keys", "-t", SESSION, "C-c"], capture_output=True)
time.sleep(2)

# Clear any error state
subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"], capture_output=True)
time.sleep(1)

# Escape task content for shell
task_content = TASK.replace("\\", "\\\\").replace('"', '\\"').replace('\n', '\\n')

# Send the opencode command - escape properly for tmux
cmd = f'cd {JB} && opencode run "$(cat /tmp/sisyphus_task.txt)" > {AUTOLOOP}/sisyphus_response_357.txt 2>&1'
subprocess.run(["tmux", "send-keys", "-t", SESSION, cmd, "Enter"], capture_output=True)
time.sleep(3)

# Update current_task.txt
with open(f"{AUTOLOOP}/current_task.txt", "w") as f:
    f.write(f"# Cycle 357 — IN PROGRESS\n# Date: 2026-06-15\n# Status: Dispatched todo #354 AsyncStorage wrapper\n# Commit: 298fcbb\n# Dispatched: #354 AsyncStorage SafeStorage wrapper\n")

print("Dispatched cycle 357 to jobble-baby")
