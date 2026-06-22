#!/bin/bash
# Cycle 474 — Dispatch task #396: Stranger Anxiety + Ear Pressure Navigator
TARGET="jobble-baby:1.0"
TASK_FILE="/tmp/task_396.txt"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
LOG_FILE="/tmp/opencode_396.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 2

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send opencode run command with stdin from task file
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 --prompt > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 474 — Task 396: Stranger Anxiety + Ear Pressure Navigator"
echo "Log: $LOG_FILE"
