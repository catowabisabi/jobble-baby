#!/bin/bash
# Cycle 402 dispatch — Pincer Grasp Self-Feeding Readiness Tracker Tab (retry)
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_402.txt"
SESSION="jobble-baby"
WINDOW="2"

# Cancel any running process
tmux send-keys -t "$SESSION:$WINDOW" C-c
sleep 1

# Clear any error state
tmux send-keys -t "$SESSION:$WINDOW" "" Enter
sleep 0.5

# Change to project dir first
tmux send-keys -t "$SESSION:$WINDOW" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5

# Write the task to a temp file using printf (avoids heredoc issues)
tmux send-keys -t "$SESSION:$WINDOW" "printf '%s\n' \"\$(cat '$TASK_FILE')\" > /tmp/sisyphus_task_402.txt" Enter
sleep 1

# Run opencode with the task content directly (not via file to avoid escaping issues)
tmux send-keys -t "$SESSION:$WINDOW" 'opencode run "$(cat /tmp/sisyphus_task_402.txt)"' Enter

echo "Cycle 402 dispatched"