#!/bin/bash
# Cycle 387 dispatch — constellation.tsx 19 hardcoded labels → i18n
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_387.txt"
SESSION="jobble-baby"
WINDOW="2"

tmux send-keys -t "$SESSION:$WINDOW" C-c
sleep 1
tmux send-keys -t "$SESSION:$WINDOW" "cat > /tmp/sisyphus_task.txt << 'INNER_EOF'" Enter
sleep 0.5
# Use a Python script to safely escape and send the task content
python3 << 'PYEOF'
with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_387.txt') as f:
    content = f.read()
# Write to a temp file that can be sourced
with open('/tmp/sisyphus_task_content.txt', 'w') as f:
    f.write(content)
print(f"Wrote {len(content)} bytes to /tmp/sisyphus_task_content.txt")
PYEOF
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "cat /tmp/sisyphus_task_content.txt | tmux load-buffer -" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "tmux paste-buffer -t $SESSION:$WINDOW" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "EOF" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "opencode run \"\$(cat /tmp/sisyphus_task.txt)\"" Enter
echo "Dispatch 387 sent"
