#!/bin/bash
# Dispatch cycle 443 — Task 390: Protoconversation Navigator Tab
TARGET="jobble-baby:1.0"

tmux send-keys -t "$TARGET" C-c
sleep 1
tmux send-keys -t "$TARGET" "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat > /tmp/task_390.txt << 'TASK_EOF'
# Task 390 — Implement Protoconversation Navigator Tab

## Context
Jobble Baby app — React Native / Expo. This is a NEW tab.

## Keywords
mirror_neuron_activity, social_learning_bandura, bayley_scale_items

## Goal
Create app/(tabs)/protoconversation.tsx — a tab tracking prelinguistic communication development in infants (proto-conversational exchanges, gaze alternation, joint attention, imitative repertoire).

## Spec

### Concept
Tracks prelinguistic communication development — the invisible conversations babies have before words emerge. Helps parents recognize and nurture proto-conversational exchanges, gaze alternation (triadic attention: baby-object-caregiver), joint attention, and imitative milestones.

### Sources (use these for i18n keys, descriptions, benchmarks)
protoconversation, gaze_alternation_pattern, affective_sharing, deferred_imitation, motherese_intonation

### 1. Proto-Conversation Turn Counter
Daily counter of proto-conversational exchanges:
- Definition: one complete exchange = parent speaks/acts → baby vocalizes/gestures → parent responds
- Quick-add buttons: +1, +5, +10
- Show running 7-day streak
- History list with date + count
- Simple bar chart: last 14 days

### 2. Gaze Alternation Event Logger
Log triadic gaze alternation events (baby looks at object → looks at caregiver → looks back at object):
- Quick log button: \"Saw it!\"
- Optional: tag the object of interest
- Daily count + weekly trend
- Milestone tracker: how many gaze alternations per day at this age is typical?

### 3. Joint Attention Duration Tracker
Track how long baby sustains shared focus with caregiver on an object/event:
- Timer: tap to start, tap to stop
- Session list with duration + date
- Average duration per day/week
- Age-based benchmarks (from developmental literature)

### 4. Affective Sharing Score
Log emotional matching moments:
- Checklist items: baby smiled when I smiled, baby frowned when I frowned, baby showed excitement when I showed excitement
- Daily mood match score (0-3 indicators present)
- Weekly summary

### 5. Motherese Response Tracker
Track baby's response to infant-directed speech:
- Toggle: Does baby seem more engaged when you use motherese?
- Log instances: date + brief note
- Running tally of positive responses vs neutral

### 6. Imitative Repertoire Checklist
Log actions baby has successfully imitated:
- Pre-loaded checklist: clap hands, wave bye-bye, peek-a-boo, blow kiss, shake head no, nod, pointing, touching nose/ears/eyes
- Add custom actions
- Date learned + video/photo note (optional)
- Shows developmental age expectations per action

### 7. Developmental Benchmarks Panel
Age-based benchmarks (9-18 months):
- 9mo:proto-conversation begins, joint attention emerges
- 12mo: gaze alternation frequent, first word imitated
- 15mo: 10+ words imitated, complex gestures
- 18mo: 50+ vocabulary, protoconversation fluid

### Data Model (AsyncStorage)
- @jobble/proto_conversation: { date, count }[]
- @jobble/gaze_alternation: { date, count, objects?: string[] }[]
- @jobble/joint_attention: { id, date, duration_seconds, notes }[]
- @jobble/affective_sharing: { date, score: 0-3, indicators: string[] }[]
- @jobble/motherese_response: { date, engaged: boolean, note }[]
- @jobble/imitative_repertoire: { action, date_learned, notes, has_media }[]

### Tab Registration
- app/(tabs)/protoconversation.tsx — NEW
- app/(tabs)/_layout.tsx — add Tabs.Screen (import ProtoconversationScreen from './protoconversation')
- Icon: MaterialCommunityIcons 'chat-processing-outline'
- Title key: tabs.protoconversation

### i18n
All strings in en.json + zh.json under keys:
- protoconversation.* (all UI labels, section titles, descriptions)
- tabs.protoconversation

### TSC
npx tsc --noEmit must pass 0 errors

### Pattern
Follow existing tab patterns (e.g., gesture-milestone.tsx or autonomic-readiness.tsx):
- useState for all entry state and form inputs
- safeGetItem/safeSetItem for AsyncStorage persistence
- useLanguage + useTheme contexts
- COLORS from ../theme
- MaterialCommunityIcons from @expo/vector-icons
- ScrollView (not FlatList unless >50 items)
- Accessibility: all TouchableOpacity have accessibilityLabel

### Files to Create/Modify
1. app/(tabs)/protoconversation.tsx — NEW (main implementation)
2. app/(tabs)/_layout.tsx — add Tabs.Screen entry (follow existing pattern)
3. app/i18n/en.json — add protoconversation.* keys
4. app/i18n/zh.json — add protoconversation.* Chinese translations

### Output
Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_419.txt
TASK_EOF
" Enter
sleep 1
tmux send-keys -t "$TARGET" "cat /tmp/task_390.txt | opencode run -m minimax-coding-plan/MiniMax-M2 --dir /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby -- --prompt" Enter
sleep 2
tmux send-keys -t "$TARGET" "ULW"