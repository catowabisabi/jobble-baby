#!/bin/bash
# Cycle 411 dispatch — Task 383: Fix accessibilityLabel gaps in 5 tab files
TASK_FILE="/tmp/sisyphus_task_411.txt"
SESSION="jobble-baby"
TARGET="jobble-baby:2.0"

# Interrupt any running process in the dispatch pane
tmux send-keys -t "$TARGET" C-c
sleep 1

# Clear to a fresh prompt
tmux send-keys -t "$TARGET" "clear" Enter
sleep 0.3

# Change to project dir
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.3

# Run opencode with task directly
tmux send-keys -t "$TARGET" "opencode run \"\$(cat '$TASK_FILE')\"" Enter

echo "Cycle 411 Task 383 dispatched to $TARGET"
