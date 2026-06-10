#!/bin/bash
# Read task from file (not from stdin/paste — avoids shell interpretation)
TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
echo "=== Sisyphus Task ==="
cat "$TASK_FILE"
echo ""
echo "=== Execute Now ==="
# Keywords for cycle 293
export KEYWORDS="lactose_thresholds,cochlear_implant_mapping,prenatal_throat_structure"
echo "Keywords: $KEYWORDS"
echo "ULW"
