#!/bin/bash
# Cycle 505 — Dispatch task #404: JSON Data Export + Backup Feature
TARGET="jobble-baby:1.0"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TASK_FILE="/tmp/task_404.txt"
LOG_FILE="/tmp/opencode_404.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 3

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 -- > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 505 — Task 404: JSON Data Export + Backup"
echo "Log: $LOG_FILE"