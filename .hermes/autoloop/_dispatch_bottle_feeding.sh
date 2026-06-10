#!/bin/bash
SESSION="jobble-baby"
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"

# Send Ctrl-C to cancel any ongoing operation
tmux send-keys -t "$SESSION" C-c

# Give time for any pending operations
sleep 1

# Send newline to clear prompt
tmux send-keys -t "$SESSION" ""

# Read task file and send line by line
while IFS= read -r line; do
    if [[ -n "$line" ]]; then
        tmux send-keys -t "$SESSION" "$line"
    fi
    tmux send-keys -t "$SESSION" ""
    sleep 0.1
done < "$TASK_FILE"

# Send keywords
sleep 0.5
tmux send-keys -t "$SESSION" "Keywords: tc_bilirubin_reading,simplified_decision_framework,parental_cognitive_load"
tmux send-keys -t "$SESSION" ""

# Send ULW marker
sleep 0.3
tmux send-keys -t "$SESSION" "ULW"
tmux send-keys -t "$SESSION" ""

sleep 0.5
tmux send-keys -t "$SESSION" "Sisyphus task ready. Check sisyphus_task.txt"
tmux send-keys -t "$SESSION" ""