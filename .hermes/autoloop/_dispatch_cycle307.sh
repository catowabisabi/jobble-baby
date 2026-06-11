#!/bin/bash
# Dispatch for Cycle 307
# Task: i18n String Audit — procedure-recovery.tsx

echo "=== Dispatch Cycle 307 ==="
echo "Task: i18n string audit on procedure-recovery.tsx"
echo "Keywords: pica_behavior,bone_age_xray,berry_phase"
echo "Date: $(date)"
echo ""

# Navigate to project
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

# Check TSC
echo "=== TSC Check ==="
npx tsc --noEmit 2>&1 | tail -3

echo ""
echo "=== Dispatch Complete ==="