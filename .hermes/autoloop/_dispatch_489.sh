#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
opencode run "$(cat /tmp/sisyphus_task.txt)" --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -m minimax-coding-plan/MiniMax-M2.7 --continue > /tmp/opencode_489.log 2>&1 &
echo "Task #489 dispatched, PID: $!"
