#!/bin/bash
# Dispatch cycle 461 — Task 394: GitHub Actions CI/CD Pipeline
TARGET="jobble-baby:1.0"
RESPONSE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_461.txt"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 1

# Navigate to project root
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1

# Write the task to a temp file
tmux send-keys -t "$TARGET" "cat > /tmp/task_461.txt << 'TASK_EOF'" Enter
sleep 0.5

# Send task content line by line
while IFS= read -r line; do
    tmux send-keys -t "$TARGET" "$line"
    sleep 0.05
done << 'EOF'
# Task 394 — GitHub Actions CI/CD Pipeline for Jobble Baby

## Context
Jobble Baby: Expo/React Native app. 16 tabs, bilingual en/zh, TypeScript, TSC 0 errors.
EAS credentials NOT configured yet (user action required). App Store submission pending.
Project root: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby

## Goal
Add GitHub Actions workflow that runs lint + type-check on every push/PR.
EAS build step included but COMMENTED OUT until credentials are available.

## Files to Create

### 1. .github/workflows/expo-ci.yml
```yaml
name: Expo CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        working-directory: ./JobbleBaby
        run: npx tsc --noEmit

      - name: Expo lint
        working-directory: ./JobbleBaby
        run: npx expo lint --fix || true

      # EAS Build (uncomment when EAS credentials are configured)
      # - name: Setup EAS
      #   uses: expo/expo-github-action@v8
      #   with:
      #     eas-version: latest
      #     token: ${{ secrets.EXPO_TOKEN }}
      # - name: Install EAS CLI
      #   run: npm install -g eas-cli
      # - name: Build iOS ( Simulator)
      #   run: eas build --platform ios --profile preview --non-interactive
      #   env:
      #     EAS_APPLE_TEAM_ID: ${{ secrets.EAS_APPLE_TEAM_ID }}
      #     EAS_APP_ID: ${{ secrets.EAS_APP_ID }}
```

### 2. .github/workflows/.gitkeep
(Ensure .github/workflows directory is tracked)

### 3. .env.example (in project root /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/)
```
# EAS Build Credentials (configure before uncommenting EAS build step)
EXPO_TOKEN=your-expo-token-here
EAS_APP_ID=your-eas-app-id-here
EAS_APPLE_TEAM_ID=your-apple-team-id-here
EAS_APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password-here

# GitHub Secrets to configure:
# EXPO_TOKEN — from expo.dev account
# EAS_APP_ID — from EAS project settings  
# EAS_APPLE_TEAM_ID — from Apple Developer Portal
# EAS_APPLE_APP_SPECIFIC_PASSWORD — from Apple ID account
```

## Important Rules
1. Create .github/workflows/expo-ci.yml in the PROJECT ROOT (one level above JobbleBaby)
2. .env.example goes in the project root (/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.env.example)
3. After creating files, run: cd JobbleBaby && npx tsc --noEmit
4. TSC MUST be 0 errors
5. .env.example must contain NO real secrets — only placeholder strings

## Verification Checklist
- [ ] .github/workflows/expo-ci.yml created
- [ ] .env.example created  
- [ ] TSC 0 errors (cd JobbleBaby && npx tsc --noEmit)
- [ ] YAML syntax valid
- [ ] No real secrets in any file

## Response
Write your work log to:
/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_461.txt
Include: files created/modified, TSC result, any issues.
TASK_EOF
Enter
sleep 1

# Run opencode with the task
tmux send-keys -t "$TARGET" "cat /tmp/task_461.txt | opencode run -m minimax/MiniMax-M2.7 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 3

echo "Dispatched cycle 461 — GitHub Actions CI/CD"
