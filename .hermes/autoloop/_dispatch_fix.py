#!/usr/bin/env python3
"""Fixed dispatch mechanism — writes task via Python, not shell heredoc."""
import subprocess, sys, os

TASK_FILE = "/tmp/sisyphus_task.txt"
TMUX_SESSION = "jobble-baby"

def write_task(task_content: str):
    """Write task to file, avoiding shell interpretation issues."""
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(task_content)
    print(f"Task written to {TASK_FILE} ({len(task_content)} chars)")

def dispatch_via_tmux(task_content: str):
    """Dispatch task to Sisyphus tmux session."""
    write_task(task_content)
    
    # Escape special chars for tmux send-keys
    # Use a Python approach: write to file first, then source it
    cmds = [
        "C-c",  # Interrupt any running process
        "C-c",
        f"cat {TASK_FILE}",
        "Enter",
    ]
    
    # Send cat command to display task
    result = subprocess.run(
        ["tmux", "send-keys", "-t", TMUX_SESSION] + cmds[:2],
        capture_output=True
    )
    subprocess.run(["sleep", "0.5"])
    subprocess.run(
        ["tmux", "send-keys", "-t", TMUX_SESSION, "cat", "Enter"],
        capture_output=True
    )
    subprocess.run(["sleep", "0.3"])
    print("Task dispatched via tmux")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 _dispatch_fix.py <task_file>")
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        content = f.read()
    dispatch_via_tmux(content)
