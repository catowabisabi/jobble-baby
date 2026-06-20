#!/bin/bash
# Dispatch cycle 438 — Task 385: Vestibular-Motor Integration Navigator
TARGET="jobble-baby:1.0"

tmux send-keys -t "$TARGET" C-c
sleep 1
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat > /tmp/task_385.txt << 'TASK_EOF'
# Task 385 — Implement Vestibular-Motor Integration Navigator tab

## Context
Jobble Baby app — React Native / Expo. This is a NEW tab.

## Keywords
motor_planning_emergence, sensory_body_scan, primitive_reflex_integration_stages

## Goal
Create app/(tabs)/vestibular-motor.tsx — a Vestibular-Motor Integration Navigator tab.

## Spec

### 1. Vestibular Activity Logger
Log rocking sessions (duration, axis: vertical/horizontal/side-to-side), bouncing, swinging, or active tummy-time. Score each by loading intensity (low/medium/high). Persist to SafeStorage with key STORAGE_KEYS.VESTIBULAR_SESSIONS.

### 2. Motor Milestone Correlation
Link vestibular activity frequency to motor milestones (head control, rolling, sitting, crawling). Show a simple correlation timeline — days since last vestibular activity vs. milestone achievement.

### 3. Sleep-Vestibular Correlation
After logging vestibular activity, prompt for sleep quality rating (1-5). Track the relationship with a simple scatter or bar view.

### 4. Gut Motility Connection
Link vestibular activity to feeding outcomes: spitting up, constipation, gas. Use simple icons to show outcomes post-activity.

### 5. Growth Velocity Overlay
Show growth velocity trajectory (from existing growth data if available) alongside vestibular activity frequency as a dual-line chart area.

### 6. Optimal Vestibular Window Alerts
Show alert banner when baby is in peak vestibular integration window (typically 4-8 months for rolling/sitting correlation).

### 7. Loading Curve Visualization
A simple line/area chart showing vestibular loading intensity over the past 14 days. Baseline reference line.

### Data Model
- @jobble/vestibular_sessions: { date, duration_min, activity_type, intensity, post_sleep_quality?, post_feeding_outcome? }
- @jobble/vestibular_motor_correlation: { date, motor_milestone, vestibular_activity_min }

### Tab Location
app/(tabs)/vestibular-motor.tsx

### i18n
Keys: vestibularMotor.* in en.json + zh.json
tabs.vestibularMotor in both files

### TSC
npx tsc --noEmit must pass 0 errors

## Implementation Pattern
Follow existing tab patterns (e.g., landau-reflex.tsx or reflex-tracker.tsx):
- useState for activity log entries
- safeGetItem/safeSetItem for SafeStorage
- useLanguage + useTheme contexts
- COLORS from ../theme
- MaterialCommunityIcons for activity type icons
- ScrollView for content

## Files to Modify
1. app/(tabs)/vestibular-motor.tsx — NEW
2. app/(tabs)/_layout.tsx — add Tabs.Screen entry
3. app/i18n/en.json — add vestibularMotor.* keys
4. app/i18n/zh.json — add vestibularMotor.* Chinese translations

## Output
Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_417.txt
TASK_EOF
" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat /tmp/task_385.txt | opencode run -m minimax/MiniMax-M2.7 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 2
tmux send-keys -t "$TARGET" "ULW"
