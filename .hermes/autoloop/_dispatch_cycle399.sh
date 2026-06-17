#!/bin/bash
# Cycle 399 dispatch — Landau Reflex Tracker (concept #45)

TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_399.txt"
SESSION="jobble-baby"
WINDOW="2"

tmux send-keys -t "$SESSION:$WINDOW" C-c
sleep 1

python3 << 'PYEOF'
with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_399.txt') as f:
    content = f.read()
with open('/tmp/sisyphus_task_399_content.txt', 'w') as f:
    f.write(content)
print(f"Wrote {len(content)} bytes")
PYEOF

sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "cat > /tmp/sisyphus_task.txt << 'INNER_EOF'" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "cat /tmp/sisyphus_task_399_content.txt | tmux load-buffer -" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "tmux paste-buffer -t $SESSION:$WINDOW" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "INNER_EOF" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5
tmux send-keys -t "$SESSION:$WINDOW" 'opencode run "$(cat /tmp/sisyphus_task.txt)"' Enter
echo "Dispatch 399 sent"
