#!/usr/bin/env python3
"""Dispatch task to Sisyphus tmux session — writes task via Python, dispatches via tmux."""
import subprocess, sys, os, tempfile

SESSION = "jobble-baby"
TASK_FILE = "/tmp/sisyphus_task.txt"

def write_task(task_content: str) -> int:
    """Write task to file, avoiding shell interpretation."""
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(task_content)
    return len(task_content)

def dispatch(task_content: str):
    """Dispatch task to Sisyphus tmux session via opencode run."""
    n = write_task(task_content)
    print(f"Task written: {n} chars → {TASK_FILE}")
    
    # Interrupt any running process
    for _ in range(3):
        subprocess.run(["tmux", "send-keys", "-t", SESSION, "C-c"], capture_output=True)
    subprocess.run(["sleep", "0.5"], capture_output=True)
    
    # Navigate to project dir
    subprocess.run(["tmux", "send-keys", "-t", SESSION,
        "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"],
        capture_output=True)
    subprocess.run(["sleep", "0.3"], capture_output=True)
    
    # Build opencode run command — use Python to avoid shell issues
    # The command reads from the file directly
    cmd = f'opencode run "$(cat {TASK_FILE})"'
    
    # Send the command to tmux
    subprocess.run(["tmux", "send-keys", "-t", SESSION, cmd], capture_output=True)
    subprocess.run(["sleep", "0.3"], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"], capture_output=True)
    print("Dispatched: opencode run via tmux")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: dispatch_task.py <task_file>")
        sys.exit(1)
    
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        content = f.read()
    
    dispatch(content)
