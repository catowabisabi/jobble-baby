#!/bin/bash
tmux kill-session -t jobble-baby 2>/dev/null; sleep 1
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
tmux new-session -d -s jobble-baby "echo 'Sisyphus ready' && sleep infinity"
sleep 2
tmux send-keys -t jobble-baby 'cat > /tmp/sisyphus_task.txt << "EOF"
# Todo #343: GitHub Actions CI/CD Pipeline
# Keywords: bottle_teat_flow_rate, sleepregression, developmental_trajectory
# Files: .github/workflows/eas-build.yml + testflight-release.yml (created by Hermes)

## Task for Sisyphus

Review the two new GitHub Actions workflow files created by Hermes:

1. `.github/workflows/eas-build.yml` — runs EAS build for iOS + Android on PR/push to master, uploads APK artifact
2. `.github/workflows/testflight-release.yml` — submits to TestFlight on merge to master

Your job:
- Read both workflow files
- Check if EAS credentials / secrets are properly configured in the repo (EAS_BUILD_CONTEXT should come from github.event, but secrets.EXPO_APPLE_TEAM_ID, EXPO_APPLE_ID, EXPO_APPLE_APP_PASSWORD are referenced in testflight-release.yml but NOT in eas-build.yml — fix this if needed)
- Verify the workflow syntax is correct (valid YAML, correct action versions)
- Check if `expo-github-actions` is listed as a devDependency in package.json (if not, flag it)
- Report any issues found. If everything looks correct, say so.
- Do NOT modify any files — just report.

ULW
EOF
echo "Task written"' \; wait
tmux send-keys -t jobble-baby Enter
sleep 1
