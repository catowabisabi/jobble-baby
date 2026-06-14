#!/bin/bash
# Fixed dispatch: write task via Python, then paste to Sisyphus tmux session
# Usage: _dispatch_sisyphus_v2.sh <task_file>
set -e

TASK_FILE="${1:-/tmp/sisyphus_task.txt}"
SESSION="jobble-baby"

# Interrupt any running process
tmux send-keys -t "$SESSION" C-c C-c
sleep 0.5

# Write task content to file using Python (avoids shell interpretation issues)
python3 - << 'PYEOF'
import sys
task_file = open("/tmp/sisyphus_task.txt", "w", encoding="utf-8")
task_file.write(sys.stdin.read())
task_file.close()
print(f"Task written: {len(sys.stdin.read())} chars" if False else "")
PYEOF

# Now paste the task content to Sisyphus via tmux
# Use a temp script that sends the content line by line
tmux send-keys -t "$SESSION" "clear" Enter
sleep 0.3
tmux send-keys -t "$SESSION" "cat $TASK_FILE" Enter
sleep 0.3
# Send OpenCode execution command if needed
tmux send-keys -t "$SESSION" "opencode --task-file $TASK_FILE" Enter
