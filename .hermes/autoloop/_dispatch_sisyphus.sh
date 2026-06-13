#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
echo "=== SISYPHUS TASK 342 ==="
echo "Reading spec..."
cat /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_342.txt | head -20
echo "---"
echo "Dispatching to opencode..."
opencode --model gpt-4.1-mini "Implement the Galant Reflex + Latch Asymmetry Correlation Navigator per the spec at /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_342.txt. Read the spec first, then create app/(tabs)/galant-latch-navigator.tsx with all features. Use bonding-journal.tsx as UI reference. All user-facing strings must use i18n t() — add keys to app/i18n/en.json and app/i18n/zh.json. accessibilityLabel on all Pressable/TouchableOpacity. No TextInput for data entry. ULW"
echo "DONE: task 342 dispatched"
