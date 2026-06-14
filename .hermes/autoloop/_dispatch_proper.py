#!/usr/bin/env python3
"""
Proper dispatch to Sisyphus/OpenCode tmux session.
Uses tmux send-keys with properly escaped task content to avoid shell expansion issues.
"""
import subprocess, sys, os, shlex

SESSION = "jobble-baby"
TASK_FILE = "/tmp/sisyphus_task.txt"
PROJECT_DIR = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"

def escape_for_remote_shell(s: str) -> str:
    """Escape special chars so content is safe inside double-quoted string for remote bash."""
    # For double-quoted string: escape \ " $ ` 
    # \ -> \\  " -> \"  $ -> \$  ` -> \`
    s = s.replace('\\', '\\\\')
    s = s.replace('"', '\\"')
    s = s.replace('$', '\\$')
    s = s.replace('`', '\\`')
    return s

def write_task_to_file(task_content: str) -> int:
    """Write task to file."""
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(task_content)
    return len(task_content)

def dispatch(task_content: str) -> bool:
    """Dispatch task to Sisyphus tmux session via opencode run."""
    n = write_task_to_file(task_content)
    print(f"Task written: {n} chars → {TASK_FILE}", file=sys.stderr)
    
    # Interrupt any running process in tmux
    for _ in range(3):
        subprocess.run(["tmux", "send-keys", "-t", SESSION, "C-c"], capture_output=True)
    subprocess.run(["sleep", "0.5"], capture_output=True)
    
    # Navigate to project dir
    subprocess.run(["tmux", "send-keys", "-t", SESSION, f"cd {PROJECT_DIR}"], capture_output=True)
    subprocess.run(["sleep", "0.3"], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"], capture_output=True)
    subprocess.run(["sleep", "0.5"], capture_output=True)
    
    # Escape task content for remote shell double-quoted string
    escaped = escape_for_remote_shell(task_content)
    
    # Build the opencode run command
    # Use double-quoted string with escaped content
    cmd = f'opencode run "{escaped}"'
    
    # Send the command to tmux
    subprocess.run(["tmux", "send-keys", "-t", SESSION, cmd], capture_output=True)
    subprocess.run(["sleep", "0.3"], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"], capture_output=True)
    print(f"Dispatched via tmux send-keys: opencode run with {n} chars", file=sys.stderr)
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: _dispatch_proper.py <task_file>")
        sys.exit(1)
    
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        content = f.read()
    
    dispatch(content)
