#!/usr/bin/env python3
"""Dispatch task to Sisyphus via tmux - with debugging"""
import subprocess
import time

session = "jobble-baby"
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"

with open(task_file) as f:
    lines = f.readlines()

# Cancel any pending input
r = subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
print(f"C-c: {r.returncode}")
time.sleep(0.3)

# Send Enter to clear
r = subprocess.run(["tmux", "send-keys", "-t", session, ""])
print(f"Enter: {r.returncode}")
time.sleep(0.2)

# Read task file and send content
for i, line in enumerate(lines):
    line = line.rstrip('\n')
    # Send the line
    r = subprocess.run(["tmux", "send-keys", "-t", session, line])
    if r.returncode != 0:
        print(f"ERROR line {i+1}: {repr(line)}")
    # Send Enter
    r = subprocess.run(["tmux", "send-keys", "-t", session, ""])
    if r.returncode != 0:
        print(f"ERROR enter {i+1}")
    time.sleep(0.02)

time.sleep(0.2)
# Send keywords
r = subprocess.run(["tmux", "send-keys", "-t", session, "Keywords: tc_bilirubin_reading,simplified_decision_framework,parental_cognitive_load"])
print(f"Keywords: {r.returncode}")
r = subprocess.run(["tmux", "send-keys", "-t", session, ""])
print(f"Enter: {r.returncode}")
time.sleep(0.2)
# Send ULW
r = subprocess.run(["tmux", "send-keys", "-t", session, "ULW"])
print(f"ULW: {r.returncode}")
r = subprocess.run(["tmux", "send-keys", "-t", session, ""])
r = subprocess.run(["tmux", "send-keys", "-t", session, "Sisyphus task ready. Check sisyphus_task.txt"])
r = subprocess.run(["tmux", "send-keys", "-t", session, ""])
print("Done")