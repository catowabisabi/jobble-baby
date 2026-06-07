#!/usr/bin/env python3
"""Dispatch launch-checklist task to Sisyphus via tmux."""
import subprocess

task = """# Sisyphus Task — Cycle 239

## Context
Jobble Baby: TSC 0 errors, 50+ tabs, accessibility fixed (341 labels). App is feature-complete. Remaining blockers are user-action items: EAS credentials, App Store Connect, Play Console, privacy policy URL. This task creates an interactive checklist tab to guide the user through all pre-submission requirements.

## Task: Implement App Store Launch Interactive Checklist tab

Create `app/(tabs)/launch-checklist.tsx` — a new tab that tracks every pre-submission requirement with progress saved to AsyncStorage.

### Features

1. **Checklist Items** — Track these items with checkbox UI:
   - App Store Connect App Created (bundle ID: com.jobblebaby.app)
   - Bundle ID Verified
   - Export Compliance Set (AES-256)
   - Content Rights Confirmed
   - Age Rating Set (4+)
   - App Store Screenshots Captured (iPhone 6.7 inch, 6.5 inch, iPad 12.9 inch)
   - App Store Metadata Reviewed (name, promo text, description, keywords)
   - EAS Build Completed (iOS + Android)
   - TestFlight Beta Testing Active
   - Privacy Policy URL Deployed (real URL, not placeholder)
   - Play Console App Created
   - Play Store Screenshots Captured
   - Play Store Metadata Reviewed
   - Play Store Privacy Policy URL Set
   - Google Play App Signing Configured
   - Submission Button Clicked

2. **Progress Tracking**
   - Show: X / 16 items complete
   - Visual progress bar (percentage)
   - Save checked state to AsyncStorage key: `@jobble/launch_checklist`
   - Persist across sessions

3. **Item Detail Cards**
   - Each checklist item: title, description, status (pending/done), optional link field
   - Tap to mark done/undone
   - Done items: green checkmark, slightly faded
   - Pending items: full opacity

4. **Launch Ready Badge**
   - When all 16 items checked: show banner
   - Badge awarded: Launch Commander
   - Storage key: `@jobble/launch_ready_badge`

5. **Quick Actions**
   - Reset Checklist button to clear all progress (with confirmation alert)
   - Export Status button - share current checklist state as text via Share API

6. **Contextual Hints**
   - Each item has a small hint text explaining what done means
   - EAS credentials hint: Run eas credentials --platform ios (needs Apple Team ID)
   - Privacy policy hint: Deploy to jobblebaby.com/privacy or Netlify

### Implementation Rules
- New tab: app/(tabs)/launch-checklist.tsx
- Follow existing tab patterns: Tab, ScrollView, Section cards
- Use existing theme context, language context, AsyncStorage patterns
- TSC must pass 0 errors after changes
- i18n: add keys to en.json + zh.json (use t() for all user-facing text)
- Register in app/(tabs)/_layout.tsx
- Icon: rocket-launch (MaterialCommunityIcons), label: t('tabs.launchChecklist')
- Badge: Launch Commander (all 16 items checked)

### After Implementation
Step 1: Run TypeScript check
  cd JobbleBaby
  npx tsc --noEmit
  (Must pass 0 errors before continuing)

Step 2: Verify tab appears in tab bar

Step 3: Commit
  git add -A
  git commit -m "feat(tab): add App Store Launch Interactive Checklist - 16-item pre-submission tracker, progress persistence, Launch Ready badge, i18n"

Step 4: git push

## Keywords for this task
export_compliance, content_rights, age_rating, eas_build, testflight_beta

ULW"""

# Write task to file
task_file = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
with open(task_file, "w") as f:
    f.write(task)

# Escape backticks for tmux send-keys
escaped = task.replace("`", "\\`")

# Send to tmux session line by line
lines = escaped.split("\n")
for line in lines:
    line = line + "\n" if line else "\n"
    subprocess.run(["tmux", "send-keys", "-t", "jobble-baby", line])
    subprocess.run(["sleep", "0.05"])

print("Task dispatched to Sisyphus")