#!/bin/bash
# Dispatch cycle 440 — RETRY Task 389: Behavioral Rehearsal Protocol Tab
TARGET="jobble-baby:1.0"
DONE_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_418.txt"
PROJECT_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"

# Check if already completed
if [ -f "$DONE_FILE" ]; then
    echo "Task 389 already completed (response file exists)"
    exit 0
fi

echo "[440] Retrying task 389..."
tmux send-keys -t "$TARGET" C-c
sleep 1
tmux send-keys -t "$TARGET" "cd $PROJECT_DIR" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat /tmp/task_389.txt | opencode run -m minimax/MiniMax-M2.7 --dir $PROJECT_DIR -- --prompt" Enter
echo "[440] Dispatched. Waiting..."
sleep 60
