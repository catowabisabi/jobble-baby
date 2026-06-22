#!/bin/bash
# Cycle 468 — Dispatch task #397: Fix Accessibility Labels in 3 Tab Files
TARGET="jobble-baby:1.0"
TASK_FILE="/tmp/task_397.txt"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
LOG_FILE="/tmp/opencode_468.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 2

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send opencode run command with stdin from task file
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax/MiniMax-M2.7 --prompt > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 468 — Task 397: Accessibility Labels"
echo "Log: $LOG_FILE"
