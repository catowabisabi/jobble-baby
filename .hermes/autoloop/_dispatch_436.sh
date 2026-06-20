#!/bin/bash
# Dispatch cycle 436 — Task 388: Feeding Progression Navigator
tmux send-keys -t jobble-baby:0.0 C-c
sleep 1
tmux send-keys -t jobble-baby:0.0 "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1
tmux send-keys -t jobble-baby:0.0 "cat > /tmp/task_388.txt << 'TASK_EOF'
# Task 388 — Implement Feeding Progression Navigator tab

## Context
Jobble Baby app — React Native / Expo. Keywords: food_protein_tolerance_window, feeding_progression_navigator, weaning_stages, FPIES_correlation, allergen_introduction_timeline, growth_velocity_overlay

## Goal
Create app/(tabs)/feeding-progression.tsx with a 5-stage feeding progression navigator.

## Spec

### 1. Feeding Stage Timeline
5 stages displayed as a vertical or horizontal timeline:
- Stage 1 (Milk Only): 0-6 months — head control developing
- Stage 2 (Purées): 4-6 months — tongue lateralization emerging
- Stage 3 (Textured): 6-8 months — accepts spoon, no gagging
- Stage 4 (Family Foods): 8-10 months — pincer grasp, chewing rhythm
- Stage 5 (Self-Feeding): 10-12 months+ — fork/spoon, cup drinking

Each stage card shows: stage name, expected age range, motor readiness signals, food examples. Active/current stage highlighted. Tap stage → view details + mark as current.

### 2. Allergen Introduction Timeline
Horizontal overlay/timeline showing AAP recommended windows:
- Peanut: 4-6 months
- Egg: 4-6 months  
- Dairy: 6-12 months
- Soy: 6-12 months
- Wheat: 6-12 months
- Tree nuts: 6-12 months

Each allergen shows status: introduced (date), tolerated, reacted (type + severity), or pending. Alert banner when a top allergen window is open but not yet introduced.

### 3. Reaction Correlation
When user logs a reaction in Allergens tab, the Feeding Progression tab shows a Recent Reactions card linking to feeding entries from the same day.

### 4. Data Storage
@jobble/feeding_stage: { stage: 1|2|3|4|5, date: string, notes?: string, photo?: string }
@jobble/allergen_intro_log: { food: string, date: string, result: 'introduced'|'tolerated'|'reacted', reaction_type?: 'FPIES'|'IgE'|'non-IgE', severity?: 1|2|3 }
@jobble/feeding_readiness_{stage}: { items: string[], completed: string[] }

### 5. Integration
- Add Tabs.Screen in app/(tabs)/_layout.tsx: name='feeding-progression', icon=clipboard-food-outline
- Add i18n keys in app/i18n/en.json + zh.json for all UI strings
- Link from Allergens tab (add a navigation link/button to open Feeding Progression)
- Use existing theme/colors/context patterns (SleepArchitectureScreen as structural reference)
- TSC must pass: npx tsc --noEmit → 0 errors

### 6. i18n keys needed
feedingProgression.title, feedingProgression.subtitle
feedingProgression.stage{1..5}.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.allergenTimeline, feedingProgression.allergenWindow
feedingProgression.introduced, feedingProgression.tolerated, feedingProgression.reacted
feedingProgression.pending, feedingProgression.reactionAlert, feedingProgression.recentReactions

## Verification
1. npx tsc --noEmit → 0 errors
2. Tab visible in tab bar navigation
3. Stage timeline renders with all 5 stages
4. Allergen timeline shows 6 allergens with status
5. i18n keys present in en.json and zh.json
ULW
TASK_EOF" Enter
sleep 1
tmux send-keys -t jobble-baby:0.0 "cat /tmp/task_388.txt | opencode --prompt" Enter
