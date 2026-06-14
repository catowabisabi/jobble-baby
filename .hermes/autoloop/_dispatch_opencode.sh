#!/bin/bash
# Proper dispatch to Sisyphus/OpenCode tmux session
# Usage: _dispatch_opencode.sh <task_text>
# Writes task to /tmp/sisyphus_task.txt via Python, then runs opencode run

TASK_FILE="/tmp/sisyphus_task.txt"
SESSION="jobble-baby"

# Escape task text for Python
escape_for_python() {
    python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 
}

# Write task to file using Python (handles all special chars correctly)
write_task_py() {
    python3 - "$1" << 'PYEOF'
import sys, json
task = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
# If argument is a file path, read from file
try:
    with open(task, 'r', encoding='utf-8') as f:
        content = f.read()
except:
    content = task
with open("/tmp/sisyphus_task.txt", "w", encoding="utf-8") as f:
    f.write(content)
print(f"Task written: {len(content)} chars")
PYEOF
}

# Interrupt any running process in tmux
tmux send-keys -t "$SESSION" C-c C-c
sleep 0.5

# Write task to file
if [ -f "$1" ]; then
    # First arg is a file - read from it
    python3 -c "
content = open('$1').read()
open('/tmp/sisyphus_task.txt','w').write(content)
print(f'Task written from file: {len(content)} chars')
"
else
    # Task text passed as argument
    python3 -c "
import sys
content = sys.stdin.read() if not '$1' else open('$1').read() if '$1'.startswith('/') else '$1'
open('/tmp/sisyphus_task.txt','w').write(content)
print(f'Task written: {len(content)} chars')
" << EOF
$1
EOF
fi

# Run opencode with the task content
tmux send-keys -t "$SESSION" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 0.5
tmux send-keys -t "$SESSION" "opencode run \"\$(cat /tmp/sisyphus_task.txt)\"" Enter
