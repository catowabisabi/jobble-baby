#!/bin/bash
# Cycle 390 dispatch — #377 Fix hardcoded label arrays → i18n in 5 tab files

SESSION="jobble-baby"
WINDOW="2"
TASK_SRC="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_377.txt"
TASK_TMP="/tmp/sisyphus_task_content_377.txt"

# Interrupt any running process
tmux send-keys -t "$SESSION:$WINDOW" C-c
sleep 1

# Send heredoc start
tmux send-keys -t "$SESSION:$WINDOW" "cat > /tmp/sisyphus_task.txt << 'INNER_EOF'" Enter
sleep 0.5

# Write task content safely via Python
python3 << 'PYEOF'
with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_377.txt') as f:
    content = f.read()
with open('/tmp/sisyphus_task_content_377.txt', 'w') as f:
    f.write(content)
print(f"Wrote {len(content)} bytes")
PYEOF
sleep 0.5

# Load and paste the task content
tmux send-keys -t "$SESSION:$WINDOW" "cat /tmp/sisyphus_task_content_377.txt | tmux load-buffer -" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "tmux paste-buffer -t $SESSION:$WINDOW" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "INNER_EOF" Enter
sleep 0.5

# Navigate to project
tmux send-keys -t "$SESSION:$WINDOW" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5

# Dispatch via opencode run
tmux send-keys -t "$SESSION:$WINDOW" 'opencode run "$(cat /tmp/sisyphus_task.txt)"' Enter
echo "Dispatch 377 v2 sent to $SESSION:$WINDOW"
