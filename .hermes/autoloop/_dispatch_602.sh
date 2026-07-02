#!/bin/bash
# Cycle 602 — Dispatch task #410: Fix missing i18n keys in autonomic-resonance.tsx
TARGET="jobble-baby:1.0"
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_602.txt"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
LOG_FILE="/tmp/opencode_602.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 3

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 -- > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 602 — Task 410: Fix missing i18n keys"
echo "Log: $LOG_FILE"
