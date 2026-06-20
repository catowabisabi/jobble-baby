#!/bin/bash
# Cycle 436 dispatch — Task 388: Feeding Progression Navigator Tab

tmux send-keys -t jobble-baby:1.0 C-c
sleep 1

cat << 'PROMPT' | tmux load-buffer -b task436 -
# Task 388 — Implement Feeding Progression Navigator tab

## Context

Jobble Baby app — React Native / Expo. This is a NEW tab.

Keywords: food_protein_tolerance_window, feeding_progression_navigator, weaning_stages, FPIES_correlation, allergen_introduction_timeline, growth_velocity_overlay

## Goal

Create app/(tabs)/feeding-progression.tsx — a Feeding Progression Navigator tab with 5 feeding stages + allergen introduction timeline.

## Spec

### 1. Feeding Stage Timeline
5 stages displayed as a vertical timeline:
- Stage 1 (Milk Only): 0-6 months
- Stage 2 (Purées): 4-6 months
- Stage 3 (Textured): 6-8 months
- Stage 4 (Family Foods): 8-10 months
- Stage 5 (Self-Feeding): 10-12 months+

Each stage card shows: stage name, expected age range, motor readiness signals, food examples. Active stage highlighted. Tap stage → mark as current.

### 2. Allergen Introduction Timeline
Show 6 allergens with AAP recommended windows:
- Peanut: 4-6 months
- Egg: 4-6 months
- Dairy: 6-12 months
- Soy: 6-12 months
- Wheat: 6-12 months
- Tree nuts: 6-12 months

Each allergen shows status: introduced (date), tolerated, reacted, or pending. Alert banner when window is open but not yet introduced.

### 3. Data Storage (AsyncStorage keys)
- @jobble/feeding_stage: { stage: 1|2|3|4|5, date: string, notes?: string }
- @jobble/allergen_intro_log: { food: string, date: string, result: 'introduced'|'tolerated'|'reacted', reaction_type?: 'FPIES'|'IgE'|'non-IgE', severity?: 1|2|3 }
- @jobble/feeding_readiness_{stage}: { items: string[], completed: string[] }

### 4. Files to Create/Modify
1. app/(tabs)/feeding-progression.tsx — NEW file
2. app/(tabs)/_layout.tsx — add Tabs.Screen entry: name='feeding-progression', icon=clipboard-food-outline (or appropriate icon)
3. app/i18n/en.json — add feedingProgression keys
4. app/i18n/zh.json — add feedingProgression Chinese translations
5. app/(tabs)/allergens.tsx — add "View Feeding Progression" navigation link

### 5. i18n Keys to Add
feedingProgression.title, feedingProgression.subtitle
feedingProgression.stage1.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.stage2.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.stage3.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.stage4.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.stage5.title, .ageRange, .motorSignals, .foodExamples
feedingProgression.allergenTimeline, feedingProgression.allergenWindow
feedingProgression.introduced, feedingProgression.tolerated, feedingProgression.reacted
feedingProgression.pending, feedingProgression.reactionAlert, feedingProgression.recentReactions
feedingProgression.currentStage, feedingProgression.markCurrent, feedingProgression.allergenAlert

### 6. Reference Patterns
- Use SleepArchitectureScreen or RegulatoryFitnessScreen as structural reference (multi-section tabs with data cards)
- Use Allergens tab as reference for allergen UI patterns
- Use existing useLanguage() and useTheme() hooks
- Use COLORS from ../theme
- All AsyncStorage patterns same as existing tabs

### 7. Verification
1. npx tsc --noEmit → 0 errors
2. Tab visible in tab bar navigation
3. Stage timeline renders with all 5 stages
4. Allergen timeline shows 6 allergens with status
5. i18n keys present in en.json and zh.json
6. Link from Allergens tab navigates to this tab

## Output
Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_416.txt

ULW
PROMPT

tmux paste-buffer -t jobble-baby:1.0
echo "Dispatched cycle 436 — task 388"
