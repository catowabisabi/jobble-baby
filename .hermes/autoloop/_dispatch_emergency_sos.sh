#!/bin/bash
# Cycle 402 dispatch — Emergency SOS / Panic Mode Tab
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_401.txt"
SESSION="jobble-baby"

# Cancel any running process in pane 0
tmux send-keys -t "$SESSION:0" C-c 2>/dev/null
sleep 1

# Clear any error state
tmux send-keys -t "$SESSION:0" "" Enter
sleep 0.5

# Change to project dir first
tmux send-keys -t "$SESSION:0" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5

# Run opencode with the task content directly
tmux send-keys -t "$SESSION:0" "opencode run \"\$(cat '$TASK_FILE')\"" Enter

echo "Cycle 402 Emergency SOS dispatched"
