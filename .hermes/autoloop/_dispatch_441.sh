#!/bin/bash
# Dispatch cycle 441 — Task 389: Behavioral Rehearsal Protocol Tab
TARGET="jobble-baby:1.0"
PROJECT_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
DONE_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_418.txt"
RESPONSE_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_441.txt"
TASK_FILE="/tmp/task_389.txt"

# Check if already completed
if [ -f "$DONE_FILE" ]; then
    echo "Task 389 already completed (response file exists)"
    exit 0
fi

echo "[441] Dispatching task 389 to Sisyphus..."
tmux send-keys -t "$TARGET" C-c
sleep 2
tmux send-keys -t "$TARGET" "cd $PROJECT_DIR" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat $TASK_FILE | opencode run -m minimax/MiniMax-M2.7 --dir $PROJECT_DIR -- --prompt 2>&1 | tee $RESPONSE_FILE" Enter
echo "[441] Dispatched. Waiting 90s..."
sleep 90
echo "[441] Done waiting."