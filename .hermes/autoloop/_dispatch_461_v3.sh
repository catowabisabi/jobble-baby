#!/bin/bash
# Dispatch cycle 461 — Task 394: GitHub Actions CI/CD Pipeline
TARGET="jobble-baby:1.0"

# Interrupt any running process
tmux send-keys -t "$TARGET" C-c
sleep 1

# Navigate to project root
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby" Enter
sleep 0.5

# Send the task via cat pipe to opencode
tmux send-keys -t "$TARGET" "cat /tmp/task_461.txt | opencode run -m minimax-coding-plan/MiniMax-M2.7 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 3

echo "Dispatched cycle 461 — using correct model name"
