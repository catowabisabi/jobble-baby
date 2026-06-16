#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

TASK="# Todo #360: Implement Autonomic Readiness Index Tab

## Keywords
autonomic_stability_score, vagal_tone_proxy, stress_response_tracking, brainstem_maturation_index, phase_transition_readiness

## Task
Create app/(tabs)/autonomic-readiness.tsx — tracks baby autonomic nervous system maturation via OBSERVABLE BEHAVIORS only.

## Files to create/modify
1. JobbleBaby/app/(tabs)/autonomic-readiness.tsx — NEW TAB
2. i18n/en.json — add autonomicReadiness.* keys
3. i18n/zh.json — add autonomicReadiness.* keys
4. app/(tabs)/_layout.tsx — add Tabs.Screen for autonomic-readiness
5. store/storage-keys.ts — add 5 AUTONOMIC_* keys

## Tab Spec (autonomic-readiness.tsx)

Design: SafeAreaView + ScrollView, themed (COLORS from theme, useLanguage hook, useTheme hook). Single-column.

### Section A — Autonomic Readiness Score (Hero)
- Composite 0-100 score, color-coded: red <40, yellow 40-70, green >70
- Label: 'Autonomic Readiness for [solid foods / sleep training / teething]'

### Section B — Stress Response Tracker
- Log stress events: date, trigger (picker: startle/overstimulation/teething/vaccination), intensity 1-5, recovery time (seconds), recovery quality (picker: spontaneous/soothed/prolonged)
- Recovery Speed Score: avg recovery time normalized to age-expected
- Weekly trend line chart of recovery speed

### Section C — Feeding Autonomic Stability
- Log each feed: swallow-breathe coordination 1-5, desaturation events (YN + count), feeding efficiency (good/slow/poor), post-feed state (calm/active/fussy/unsettled)
- Running coordination score + alert if score <3 for 3+ consecutive feeds

### Section D — Sleep Autonomic Quality
- Track: WASO minutes, number of autonomic arousals, woke upset vs woke calm
- Autonomic Sleep Quality Score

### Section E — Self-Soothing Emergence Timeline
- Track: hand-to-mouth (0-3mo), transitional objects (6-12mo), self-initiated sleep onset (12mo+)
- Self-Soothing Index: 0-25

### Section F — Composite Algorithm
Overall = (Stress_Recovery×0.25) + (Feeding×0.30) + (Sleep×0.25) + (Self_Soothing×0.20)

### Section G — Readiness Summary
3 cards: Solid Foods / Sleep Training / Teething — each YES/NO/NOT_YET + recommendation

## Storage Keys to add to store/storage-keys.ts
AUTONOMIC_STRESS_LOG, AUTONOMIC_FEEDING_LOG, AUTONOMIC_SLEEP_LOG, AUTONOMIC_SELF_SOOTHING, AUTONOMIC_READINESS_SCORE

## i18n keys needed
autonomicReadiness.title, subtitle, overallScore, readinessFor, stress, stressRecoveryTime, startleResponse, intensity, recoveryQuality, spontaneous, soothed, prolonged, feeding, swallowBreathe, desaturationEvents, feedingEfficiency, postFeedState, calm, active, fussy, unsettled, sleep, waso, arousals, wokeUpset, wokeCalm, selfSoothing, handToMouth, transitionalObject, selfInitiatedSleep, solidFoodsReady, sleepTrainingReady, teethingReady, notYet, alertCoordinationDrop

## Patterns
- Use SafeStorage (safeGetItem/safeSetItem) — NOT raw AsyncStorage
- useLanguage() hook for i18n, useTheme() for colors
- All TouchableOpacity need accessibilityLabel
- Follow existing tabs like reflex-visual-motor.tsx, thermal-metabolic.tsx
- Save data with timestamps as ISO strings

## Verify
- npx tsc --noEmit → 0 errors
- File exists: app/(tabs)/autonomic-readiness.tsx
- Tab registered in _layout.tsx
- Storage keys in storage-keys.ts
- i18n keys in both en.json and zh.json

DONE ULW"

echo "$TASK" > /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task_370.txt

opencode run --agent "Sisyphus - Ultraworker" "$TASK" 2>&1 | tee /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_370.txt
