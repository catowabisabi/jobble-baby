#!/bin/bash
# Cycle 584 — Dispatch task #475: Sentry crash reporting + GitHub Actions CI/CD
TARGET="jobble-baby:1.0"
TASK_FILE="/tmp/task_475.txt"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
LOG_FILE="/tmp/opencode_475.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 3

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe — the -- separates opencode args from stdin prompt
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 -- > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 584 — Task 475: Sentry + GitHub Actions CI/CD"
echo "Log: $LOG_FILE"
