#!/usr/bin/env python3
import subprocess
import time

session = "jobble-baby"
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"

with open(task_file) as f:
    lines = f.readlines()

# Send Ctrl-C first
subprocess.run('tmux send-keys -t jobble-baby C-c', shell=True)
time.sleep(0.5)

# Send each line
for line in lines:
    line = line.rstrip()
    # Use shell=True to properly handle the command
    if line:
        subprocess.run(f'tmux send-keys -t {session} "{line}"', shell=True)
    subprocess.run(f'tmux send-keys -t {session} ""', shell=True)
    time.sleep(0.05)

time.sleep(0.3)
subprocess.run(f'tmux send-keys -t {session} "Keywords: tc_bilirubin_reading,simplified_decision_framework,parental_cognitive_load"', shell=True)
subprocess.run(f'tmux send-keys -t {session} ""', shell=True)
time.sleep(0.2)
subprocess.run(f'tmux send-keys -t {session} "ULW"', shell=True)
subprocess.run(f'tmux send-keys -t {session} ""', shell=True)
time.sleep(0.2)
subprocess.run(f'tmux send-keys -t {session} "Sisyphus task ready. Check sisyphus_task.txt"', shell=True)
subprocess.run(f'tmux send-keys -t {session} ""', shell=True)