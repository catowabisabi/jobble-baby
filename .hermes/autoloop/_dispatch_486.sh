#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
cat /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/sisyphus_incoming_task.txt | opencode run --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -m minimax-coding-plan/MiniMax-M2.7 --continue --prompt > /tmp/opencode_486.log 2>&1 &
echo "Task dispatched, PID: $!"