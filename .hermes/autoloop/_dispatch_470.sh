#!/bin/bash
# Cycle 492 — Dispatch task #470: Fix Pre-Submission Warnings
TARGET="jobble-baby:1.0"
TASK_FILE="/tmp/task_470.txt"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
LOG_FILE="/tmp/opencode_470.log"

# Interrupt any running process
tmux send-keys -t "$TARGET" C-c
sleep 2

# Navigate to app directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe to opencode
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax/MiniMax-M2.7 --prompt > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 492 — Task #470: Pre-Submission Warning Fix"
echo "Log: $LOG_FILE"
