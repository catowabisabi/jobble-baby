#!/bin/bash
# Cycle 355 dispatch — Development Radar tab (idea #77, todo #353)
set -e

SESSION="jobble-baby"
REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB="$REPO/JobbleBaby"
AUTOLOOP="$REPO/.hermes/autoloop"
TASK_FILE="$AUTOLOOP/sisyphus_task_355.txt"

# Send interrupt to any running process in tmux
tmux send-keys -t "$SESSION" C-c 2>/dev/null || true
sleep 2

# Copy task to /tmp for execution
cp "$TASK_FILE" /tmp/sisyphus_task.txt

# Escape task content for tmux heredoc
TASK_CONTENT=$(cat "$TASK_FILE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

# Write task script to tmux
tmux send-keys -t "$SESSION" "cat > /tmp/sisyphus_task_355.sh << 'EOF'" Enter
sleep 1
tmux send-keys -t "$SESSION" "\"$TASK_CONTENT\"" Enter
tmux send-keys -t "$SESSION" "EOF" Enter
sleep 2

# Send the opencode command
tmux send-keys -t "$SESSION" "cd $JB && opencode run --task /tmp/sisyphus_task.txt 2>&1 | tee $AUTOLOOP/sisyphus_response_355.txt" Enter
sleep 2

echo "Dispatched cycle 355 to $SESSION"
