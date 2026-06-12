#!/bin/bash
# Cycle 325 dispatch — Regulatory Fitness Dashboard implementation

REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_cycle325.txt"

tmux send-keys -t sisyphus C-c C-c
sleep 1

# Build the dispatch using tmux set-buffer
tmux set-buffer "$(cat "$TASK_FILE")"
tmux paste-buffer -t sisyphus
sleep 1
tmux send-keys -t sisyphus Enter

echo "Dispatched cycle 325 to sisyphus"