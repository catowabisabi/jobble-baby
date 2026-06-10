#!/usr/bin/env python3
"""Dispatch task to Sisyphus via tmux - careful escaping"""
import subprocess
import time
import os

session = "jobble-baby"
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"

with open(task_file) as f:
    lines = f.readlines()

# Cancel any pending input
subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
time.sleep(0.5)

# Send Ctrl-C and Enter to clear
subprocess.run(["tmux", "send-keys", "-t", session, "C-c"])
time.sleep(0.3)
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)

# Read task file and send content
for line in lines:
    line = line.rstrip('\n')
    # Use subprocess with list form to avoid shell interpretation
    cmd = ["tmux", "send-keys", "-t", session, line]
    subprocess.run(cmd)
    subprocess.run(["tmux", "send-keys", "-t", session, ""])
    time.sleep(0.03)

time.sleep(0.3)
# Send keywords
subprocess.run(["tmux", "send-keys", "-t", session, "Keywords: tc_bilirubin_reading,simplified_decision_framework,parental_cognitive_load"])
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)
# Send ULW
subprocess.run(["tmux", "send-keys", "-t", session, "ULW"])
subprocess.run(["tmux", "send-keys", "-t", session, ""])
time.sleep(0.2)
subprocess.run(["tmux", "send-keys", "-t", session, "Sisyphus task ready. Check sisyphus_task.txt"])
subprocess.run(["tmux", "send-keys", "-t", session, ""])