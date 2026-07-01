#!/usr/bin/env python3
"""Dispatch task to Sisyphus tmux session via PTY pipe — no bash expansion.

The old approach: opencode run "$(cat file)"
caused bash to interpret ## and 1. as history expansion / arithmetic.

This version uses a pseudo-terminal (PTY) to pipe task content to opencode
stdin, completely bypassing shell interpretation.
"""
import subprocess, sys, os, time, pty, select

SESSION   = "jobble-baby"
APP_DIR   = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TASK_FILE = "/tmp/sisyphus_task.txt"
LOG_FILE  = "/tmp/opencode_dispatch.log"


def write_task(task_content: str) -> int:
    with open(TASK_FILE, "w", encoding="utf-8") as f:
        f.write(task_content)
    return len(task_content)


def dispatch(task_content: str,
             model: str = "minimax-coding-plan/MiniMax-M2.7") -> None:
    """Dispatch task via PTY pipe — no shell expansion possible.

    Starts opencode run --prompt - in a PTY so --continue mode works,
    then writes task content directly to opencode's stdin.
    Leaves the process running so Sisyphus (the opencode --continue session
    in tmux) can take over interactively.
    """
    n = write_task(task_content)
    print(f"Task written: {n} chars -> {TASK_FILE}")

    # 1. Interrupt any running process in tmux
    for _ in range(3):
        subprocess.run(["tmux", "send-keys", "-t", SESSION, "C-c"],
                      capture_output=True)
    time.sleep(0.5)

    # 2. Navigate to project dir
    subprocess.run(["tmux", "send-keys", "-t", SESSION,
                   f"cd {APP_DIR}"], capture_output=True)
    time.sleep(0.3)

    # 3. Build the opencode run command that reads prompt from stdin
    cmd = [
        "opencode", "run",
        "--dir", APP_DIR,
        "-m", model,
        "--prompt", "-",
    ]

    # 4. Start opencode in a PTY so --continue mode works
    master_fd, slave_fd = pty.openpty()
    proc = subprocess.Popen(
        cmd,
        stdin=slave_fd, stdout=slave_fd, stderr=slave_fd,
        cwd=APP_DIR,
        preexec_fn=os.setsid,   # new process group so C-c is clean
    )
    os.close(slave_fd)

    try:
        # 5. Wait for opencode to initialise
        time.sleep(3)

        # 6. Send the full task content to opencode stdin
        os.write(master_fd, task_content.encode("utf-8"))
        os.write(master_fd, b"\n")
        print(f"Sent {n} chars to opencode via PTY")

        # 7. Collect a few seconds of output for the log
        output = b""
        deadline = time.time() + 12
        while time.time() < deadline:
            r, _, _ = select.select([master_fd], [], [], 1.0)
            if r:
                try:
                    output += os.read(master_fd, 8192)
                except OSError:
                    break
            elif output:
                # Got data, then silence — opencode is waiting for more input
                break

        if output:
            with open(LOG_FILE, "wb") as f:
                f.write(output)
            print(f"Output ({len(output)} bytes) -> {LOG_FILE}")

        print("Dispatched: opencode run --prompt - via PTY (proc alive for Sisyphus)")

    except Exception as e:
        print(f"Dispatch error: {e}")
        proc.kill()
        raise
    finally:
        os.close(master_fd)
        # Leave proc running — Sisyphus (opencode --continue in tmux) will use it


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: dispatch_task.py <task_file> [model]")
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        content = f.read()

    model = sys.argv[2] if len(sys.argv) > 2 else "minimax-coding-plan/MiniMax-M2.7"
    dispatch(content, model)
