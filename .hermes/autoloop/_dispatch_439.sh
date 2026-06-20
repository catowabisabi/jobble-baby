#!/bin/bash
# Dispatch cycle 439 — Task 389: Behavioral Rehearsal Protocol Tab
TARGET="jobble-baby:1.0"

tmux send-keys -t "$TARGET" C-c
sleep 1
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat > /tmp/task_389.txt << 'TASK_EOF'
# Task 389 — Implement Behavioral Rehearsal Protocol Tab

## Context
Jobble Baby app — React Native / Expo. This is a NEW tab.

## Keywords
strehl_ratio_resolution, aperture_synthesis_long_exposure, who_standard_deviation

## Goal
Create app/(tabs)/behavioral-rehearsal.tsx — a guided mental rehearsal and exposure hierarchy tab for parenting scenarios.

## Spec

### Concept
Mental rehearsal for upcoming parenting scenarios (first pediatrician visit, first group outing, first vaccination, returning to work). Guided visualization + exposure hierarchy builder + real-world outcome logger.

### 1. Scenario Library
Pre-loaded parenting scenarios:
- First pediatrician visit
- First group social outing (baby groups, family gatherings)
- First vaccination appointment
- Returning to work / daycare drop-off
- First airplane trip
- First stranger care episode
- Sleep training night 1
- Introduction to solid foods

Each scenario has: title, description, anxietyprovoking elements, suggested preparation steps.

### 2. Rehearsal Session Logger
Log rehearsal sessions:
- Scenario selected
- Rehearsal type: visualization | verbal_run-through | role_play | physical_practice
- Duration (minutes)
- Anxiety before (1-5) and after (1-5)
- Notes
- Date/time

### 3. Exposure Hierarchy Builder
For each scenario, parents build a step-by-step exposure ladder:
- 5-10 steps from least to most anxiety-provoking
- Each step: description, target date, completed boolean, actual_outcome, anxiety_rating (1-5)
- Progress visualization (X of N steps complete)

### 4. Real-World Outcome Logger
After attempting a scenario in real life:
- Which step was attempted
- Outcome: success | partial |退缩 (backed out)
- Child response: calm | fussy | meltdown | N/A
- Parent feeling post-event (1-5)
- What worked / what to change

### 5. Confidence Trajectory Chart
Line chart showing parent confidence (1-10) over time per scenario.
Overlay: number of rehearsal sessions per week.

### 6. Partner Sharing
Link to Shift Handoff — share completed rehearsals + outcomes with partner.
Show partner engagement score.

### Data Model
- @jobble/rehearsal_sessions: { id, scenario_id, rehearsal_type, duration_min, anxiety_before, anxiety_after, notes, timestamp }
- @jobble/exposure_ladders: { scenario_id, steps: [{description, target_date, completed, outcome, anxiety_rating}] }
- @jobble/real_outcomes: { id, scenario_id, step_attempted, outcome, child_response, parent_feeling_post, notes, timestamp }
- @jobble/rehearsal_confidence: { scenario_id, date, confidence_score }

### Tab Location
app/(tabs)/behavioral-rehearsal.tsx

### i18n
Keys: behavioralRehearsal.* in en.json + zh.json
tabs.behavioralRehearsal in both files

### TSC
npx tsc --noEmit must pass 0 errors

### Pattern
Follow existing tab patterns (e.g., stress-cascade.tsx or shift-handoff.tsx):
- useState for entries and form state
- safeGetItem/safeSetItem for SafeStorage
- useLanguage + useTheme contexts
- COLORS from ../theme
- MaterialCommunityIcons
- ScrollView

### Files to Create/Modify
1. app/(tabs)/behavioral-rehearsal.tsx — NEW
2. app/(tabs)/_layout.tsx — add Tabs.Screen entry
3. app/i18n/en.json — add behavioralRehearsal.* keys
4. app/i18n/zh.json — add behavioralRehearsal.* Chinese translations

### Output
Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_418.txt
TASK_EOF
" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat /tmp/task_389.txt | opencode run -m minimax/MiniMax-M2.7 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 2
tmux send-keys -t "$TARGET" "ULW"
