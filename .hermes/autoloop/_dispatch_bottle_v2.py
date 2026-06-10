#!/usr/bin/env python3
import subprocess
import time
import os

session = "jobble-baby"
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
temp_script = "/tmp/tmux_dispatch.sh"

# Read the task
with open(task_file) as f:
    task_content = f.read()

# Create a tmux script that will be sourced
# Use printf to safely send content
lines = task_content.split('\n')

commands = []
for line in lines:
    # Escape special characters for tmux send-keys
    escaped = line.replace('\\', '\\\\').replace('"', '\\"').replace('$', '\\$').replace('`', '\\`')
    commands.append(f'send-keys -t {session} "{escaped}"')
    commands.append(f'send-keys -t {session} ""')

# Add keywords and ULW
commands.append(f'send-keys -t {session} "Keywords: tc_bilirubin_reading,simplified_decision_framework,parental_cognitive_load"')
commands.append('send-keys -t jobble-baby ""')
commands.append('send-keys -t jobble-baby "ULW"')
commands.append('send-keys -t jobble-baby ""')
commands.append('send-keys -t jobble-baby "Sisyphus task ready. Check sisyphus_task.txt"')
commands.append('send-keys -t jobble-baby ""')

# Write script
with open(temp_script, 'w') as f:
    f.write('#!/bin/bash\n')
    for cmd in commands:
        f.write(f'tmux {cmd}\n')
        f.write('sleep 0.05\n')

os.chmod(temp_script, 0o755)
print(f"Script written to {temp_script}")