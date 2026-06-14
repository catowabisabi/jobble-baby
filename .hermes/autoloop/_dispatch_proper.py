#!/usr/bin/env python3
"""Proper dispatch to Sisyphus via opencode run + Python task-file writer.

Fixes painpoint #22: old scripts used `bash $TASK_FILE` which tried to
execute TypeScript/markdown task content as a shell script.

This version:
1. Writes task content to /tmp/sisyphus_task.txt via Python (no shell interpretation)
2. Sends opencode run "$(cat /tmp/sisyphus_task.txt)" to tmux (proper quoting)
"""
import subprocess
import sys
import os

TASK_FILE = "/tmp/sisyphus_task.txt"
TMUX_SESSION = "jobble-baby"
REPO_DIR = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"

def write_task_file(task_content: str):
    """Write task to file using Python — avoids all shell interpretation issues."""
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(task_content)
    print(f"Task written: {len(task_content)} chars to {TASK_FILE}")

def dispatch(task_file_path: str = None, task_content: str = None):
    """Dispatch task to Sisyphus tmux session via opencode run."""
    if task_file_path:
        with open(task_file_path, "r", encoding="utf-8") as f:
            task_content = f.read()
    
    if not task_content:
        print("Error: no task content provided")
        return False
    
    write_task_file(task_content)
    
    # Interrupt any running process in tmux
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "C-c"], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "C-c"], capture_output=True)
    subprocess.run(["sleep", "0.5"], capture_output=True)
    
    # Change to repo directory
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, f"cd {REPO_DIR}"], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "Enter"], capture_output=True)
    subprocess.run(["sleep", "0.5"], capture_output=True)
    
    # Dispatch via opencode run with proper quoting
    cmd = f'opencode run "$(cat {TASK_FILE})"'
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, cmd], capture_output=True)
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "Enter"], capture_output=True)
    
    print(f"Dispatched to {TMUX_SESSION} via opencode run")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: _dispatch_proper.py <task_file>")
        sys.exit(1)
    dispatch(task_file_path=sys.argv[1])
