#!/bin/bash
# Cycle 342 dispatch via OpenCode CLI
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby

OPENCODE_TASK="Implement the Galant Reflex + Latch Asymmetry Correlation Navigator per the spec at /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_342.txt. Read the spec first, then create app/(tabs)/galant-latch-navigator.tsx with all features. Use bonding-journal.tsx as UI reference. All user-facing strings must use i18n t() — galantLatch.* keys already exist in en.json/zh.json. accessibilityLabel on all Pressable/TouchableOpacity. No TextInput for data entry. Add Tabs.Screen to _layout.tsx. npx tsc --noEmit must pass 0 errors. ULW"

opencode --model gpt-4.1-mini "$OPENCODE_TASK"
echo "DONE: task 342 dispatched"
