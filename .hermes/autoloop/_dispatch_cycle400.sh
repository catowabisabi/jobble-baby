#!/bin/bash
# Cycle 400 dispatch — Pincer Grasp Self-Feeding Readiness Tracker Tab
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_400.txt"
CONTENT_FILE="/tmp/sisyphus_task_content_400.txt"
SESSION="jobble-baby"
WINDOW="2"

# Copy task content to temp file
cp "$TASK_FILE" "$CONTENT_FILE"

# Cancel any running process
tmux send-keys -t "$SESSION:$WINDOW" C-c
sleep 1

# Clear any error state
tmux send-keys -t "$SESSION:$WINDOW" "" Enter
sleep 0.5

# Start heredoc
tmux send-keys -t "$SESSION:$WINDOW" "cat > /tmp/sisyphus_task_400.txt << 'INNER_EOF'" Enter
sleep 0.5

# Load content into tmux buffer and paste
cat "$CONTENT_FILE" | tmux load-buffer -
tmux paste-buffer -t "$SESSION:$WINDOW"
sleep 1

# Close heredoc
tmux send-keys -t "$SESSION:$WINDOW" "INNER_EOF" Enter
sleep 0.5

# Change to project dir
tmux send-keys -t "$SESSION:$WINDOW" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.3

# Run opencode with the task
tmux send-keys -t "$SESSION:$WINDOW" 'opencode run "$(cat /tmp/sisyphus_task_400.txt)"' Enter

echo "Cycle 400 dispatched"