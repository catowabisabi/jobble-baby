#!/bin/bash
# Cycle 476 — Re-dispatch task #398: Cortisol Shadow + Skin Navigator + Tongue-Tie Reassessment
TARGET="jobble-baby:1.0"
APP_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TASK_FILE="/tmp/task_398.txt"
LOG_FILE="/tmp/opencode_398.log"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 3

# Navigate to project directory
tmux send-keys -t "$TARGET" "cd $APP_DIR" Enter
sleep 1

# Send task via stdin pipe - the -- after model name separates opencode args from stdin
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run --dir $APP_DIR -m minimax-coding-plan/MiniMax-M2.7 -- > $LOG_FILE 2>&1 &" Enter

echo "Dispatched cycle 476 — Task 398 (retry): Cortisol Shadow + Skin Navigator + Tongue-Tie Reassessment"
echo "Log: $LOG_FILE"
echo "Time: $(date)"