#!/bin/bash
# Dispatch cycle 462 — Task 395: GitHub Pages Privacy Policy Deployment
TARGET="jobble-baby:1.0"
RESPONSE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_462.txt"

# Interrupt any running process first
tmux send-keys -t "$TARGET" C-c
sleep 1

# Navigate to project root
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby" Enter
sleep 1

# Write the task to a temp file
tmux send-keys -t "$TARGET" "cat > /tmp/task_462.txt << 'TASK_EOF'" Enter
sleep 0.5

# Send task content line by line
while IFS= read -r line; do
    tmux send-keys -t "$TARGET" "$line"
    sleep 0.05
done << 'EOF'
Task 395: GitHub Pages Privacy Policy Deployment

## Objective
Set up GitHub Pages deployment for the Jobble Baby privacy policy.

## Steps
1. Create docs/privacy.md — copy from store/privacy-policy.md
2. Create .github/workflows/deploy-pages.yml — GitHub Actions to deploy docs/ to GitHub Pages (upload-pages-artifact + deploy-pages)
3. Update JobbleBaby/app.json — add privacyPolicyUrl to ios and android sections: https://catowabisabi.github.io/jobble-baby/privacy
4. Verify: TSC 0 errors + pre-submission-audit.js all PASS

NOTE: User must enable GitHub Pages in repo Settings > Pages > Source: GitHub Actions after merging.

Files: docs/privacy.md, .github/workflows/deploy-pages.yml, JobbleBaby/app.json

Keywords: github_pages, privacy_policy, deploy_pages_artifact, expo_privacy_url

ULW
TASK_EOF
Enter
sleep 1

# Run opencode with the task
tmux send-keys -t "$TARGET" "cat /tmp/task_462.txt | opencode run -m minimax/MiniMax-M2.7 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 3

echo "Dispatched cycle 462 — GitHub Pages Privacy Policy Deployment"
