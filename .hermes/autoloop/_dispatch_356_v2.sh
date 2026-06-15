#!/bin/bash
# Cycle 356 dispatch — Development Radar tab (todo #353 retry)
SESSION="jobble-baby"
REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB="$REPO/JobbleBaby"
AUTOLOOP="$REPO/.hermes/autoloop"
TASK_FILE="$AUTOLOOP/sisyphus_task_356.txt"

# Interrupt any running process
tmux send-keys -t "$SESSION" C-c 2>/dev/null || true
sleep 2

# Run opencode with task content
tmux send-keys -t "$SESSION" "cd $JB" Enter
sleep 1
tmux send-keys -t "$SESSION" "opencode run \"\$(cat $TASK_FILE)\" 2>&1 | tee $AUTOLOOP/sisyphus_response_356.txt" Enter
sleep 3

echo "Dispatched cycle 356 to $SESSION"
