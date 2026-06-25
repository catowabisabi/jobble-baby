#!/bin/bash
# Cycle 509 — Dispatch task #408: Milk Thermal Safety Checker
TARGET="jobble-baby"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TASK_FILE="/tmp/task_408.txt"
LOG_FILE="/tmp/opencode_408.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 3

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 2>&1 | tee $LOG_FILE" Enter

echo "Dispatched cycle 509 — Task 408: Milk Thermal Safety Checker"
echo "Log: $LOG_FILE"
