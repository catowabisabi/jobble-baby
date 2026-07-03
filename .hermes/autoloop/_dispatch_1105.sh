#!/bin/bash
# Cycle 1105 — Dispatch to Sisyphus
# Todo #413: Social-Emotional Sentinel Navigator

cat > /dev/null << 'TASK_END'
# Task #413 — Social-Emotional Sentinel Navigator (idea #96)

## Context
New feature: Social-Emotional Sentinel Navigator — tracks jealousy episodes, social referencing, joint attention, empathy emergence, and frustration tolerance for infants 6-24 months. Sparked from brainstorm cycle 1105 keywords.

## Keywords
social_reference_12mo, empathy_concern_18mo, joint_attention_9mo

## Your Job

### STEP 1 — Create app/(tabs)/social-emotional-sentinel.tsx
Build a full-featured tab screen with these 5 sections:

**SECTION A — Jealousy Episode Logger**
- Title: "Jealousy Tracker" (i18n: socialEmotional.jealousyTitle)
- Context selector: "Sibling arrives" / "Parent attention diverted" / "Toy taken" / "Other" (i18n keys: socialEmotional.contextSibling / contextDiverted / contextToy / contextOther)
- Intensity slider: 1-5 (i18n: socialEmotional.intensity)
- Notes text input (optional)
- Save button → stores to @jobble/social_emotional_log

**SECTION B — Social Referencing Tracker**
- Title: "Social Referencing" (i18n: socialEmotional.socialRefTitle)
- Trigger selector: "New food" / "New person" / "New object" / "Stranger" / "Unfamiliar place"
- Baby's response: "Approached" / "Hesitated" / "Rejected" (i18n: socialEmotional.approached / hesitated / rejected)
- "Did baby look at caregiver's face?" toggle: Yes/No
- Log button

**SECTION C — Joint Attention & Empathy Logger**
- Title: "Joint Attention & Empathy" (i18n: socialEmotional.jointTitle)
- Type toggle: "Joint Attention" / "Empathy Expression" / "Triadic Engagement"
- Joint Attention: "Point to object" / "Eye gaze to same object" / "Show object to caregiver"
- Empathy: "Comforted distressed person" / "Showed concern facial expression" / "Attempted to help"
- Triadic: "Reached for object caregiver reached for" / "Shared object with caregiver"
- Age appropriateness note displayed if baby < 9mo (show i18n: socialEmotional.under9moNote)

**SECTION D — Frustration Tolerance Gauge**
- Title: "Frustration Tolerance" (i18n: socialEmotional.frustrationTitle)
- Weekly slider 0-5 with labels: 0=Instant meltdown / 1=Needs immediate soothe / 2=Cries but calms <2min / 3=Calms 2-5min / 4=Self-soothes <2min / 5=High tolerance
- Text input for context (optional)
- Log button

**SECTION E — Social-Emotional Timeline & Alerts**
- Title: "Social-Emotional Timeline" (i18n: socialEmotional.timelineTitle)
- 14-day horizontal bar chart: jealousy episodes, social referencing taps, joint attention logs per day
- Color coding: orange=jealousy, blue=social referencing, green=joint attention/empathy
- Alert card: if baby >= 12mo and 0 social referencing logs → "Social referencing milestone may be delayed — discuss with pediatrician" (i18n: socialEmotional.alertSocialRefDelay)
- Alert card: if baby >= 14mo and 0 joint attention logs → "Joint attention milestone may be delayed — discuss with pediatrician" (i18n: socialEmotional.alertJointDelay)

### STEP 2 — i18n Keys
Add to en.json and zh.json under socialEmotional.*:
- jealousyTitle, socialRefTitle, jointTitle, frustrationTitle, timelineTitle
- contextSibling, contextDiverted, contextToy, contextOther
- intensity, approached, hesitated, rejected
- under9moNote
- alertSocialRefDelay, alertJointDelay
- For zh.json use traditional Chinese equivalents

### STEP 3 — Register Tab
Add to app/(tabs)/_layout.tsx:
```
<Tabs.Screen
  name="social-emotional-sentinel"
  options={{
    title: t('socialEmotional.title'),
    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="emoticon-happy-outline" size={24} color={color} />,
  }}
/>
```

### STEP 4 — Storage
Use @jobble/social_emotional_log (key: 'SOCIAL_EMOTIONAL_LOG')
Each entry: { id, timestamp, type: 'jealousy'|'socialRef'|'jointEmpathy'|'frustration', data: {...}, babyAgeAtEntry: {years, months, days} }

### STEP 5 — Verify
- npx tsc --noEmit → 0 errors
- Pre-submission audit: 9/9 PASS
- 31 tests pass (reuse LipSealNavigator test patterns)

ULW
TASK_END

echo "Dispatch script written"