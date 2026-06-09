#!/usr/bin/env python3
"""Dispatch cup-feeding task to Sisyphus via tmux."""
import subprocess, time

task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"

# Cancel any running command
subprocess.run(['tmux', 'send-keys', '-t', 'jobble-baby', 'C-c'])
time.sleep(1)

# Read task
with open(task_file) as f:
    task = f.read()

# Send line by line using tmux send-keys
lines = task.split('\n')
for line in lines:
    # Use -- to prevent flag interpretation for lines starting with -
    if line.startswith('-'):
        subprocess.run(['tmux', 'send-keys', '-t', 'jobble-baby', '--', line])
    else:
        subprocess.run(['tmux', 'send-keys', '-t', 'jobble-baby', line])
    time.sleep(0.03)

# Send Enter to submit
time.sleep(0.5)
subprocess.run(['tmux', 'send-keys', '-t', 'jobble-baby', 'Enter'])

print(f'Dispatched {len(lines)} lines')
