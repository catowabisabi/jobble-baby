# Behavioral Rehearsal Protocol — Concept Spec

## Concept ID: 53
**Status:** spec_done
**Keywords:** mental_rehearsal_protocol, cognitive_dress_rehearsal, scenario_simulation, role_play_exposure, exposure_hierarchy, behavioral_priming, progressive_rehearsal, mental_practice, anxiety_desensitization, rehearsal_frequency_optimization
**Created:** Cycle 327

---

## 1. Problem Statement

Parents face predictable but anxiety-inducing scenarios — first public outing, first fever, first separation, first group feeding — for which they have no mental rehearsal. Anxiety spikes in the moment because the brain hasn't pre-processed the scenario. Behavioral science (Bandura's social learning theory, exposure hierarchy, mental practice research) shows that imagining a feared scenario with structured detail significantly reduces physiological and behavioral reactivity when the real moment arrives.

The gap: No parenting app uses mental rehearsal techniques. Parents are thrown into high-anxiety moments unprepared, leading to dysregulated responses that feed baby distress. Proactive, rehearsed parents show lower cortisol reactivity and faster co-regulation recovery.

---

## 2. Solution Overview

**Behavioral Rehearsal Protocol** is a new tab that:
- Guides parents through structured mental rehearsal of upcoming scenarios
- Builds an exposure hierarchy from low-stakes to high-stakes situations
- Tracks rehearsal frequency and maps to real-world outcome confidence
- Provides scenario scripts for mental role-play with baby
- Measures preparedness self-efficacy before and after rehearsal sessions
- Links to the Stress Cascade tab for parental cortisol tracking

---

## 3. Feature Specification

### 3.1 Rehearsal Scenario Library
Pre-built scenarios across categories:
- **Medical:** First pediatrician visit, first vaccination, first fever episode, first medication dosing, first blood draw
- **Feeding:** First public breastfeeding, first bottle refusal, first solids attempt, first cup use
- **Sleep:** First sleep regression, first travel sleep, first daycare drop-off
- **Social:** First group gathering, first family event, first airplane trip, first stranger interaction
- **Developmental:** First crawl, first walk, first word — anticipatory coaching

Each scenario has: situation description, anticipated challenges, step-by-step mental rehearsal script, co-regulation cues, and " Scripts for Partner."

### 3.2 Mental Rehearsal Session (guided)
Timer-based guided session (3–7 min):
1. **Situation Presentation:** Read the scenario aloud (TTS optional)
2. **Sensory Visualization:** Close eyes, imagine environment in detail (sounds, smells, baby's face)
3. **Role Play (Internal):** Mentally walk through the interaction step by step
4. **Coping Visualization:** Imagine staying calm, using specific phrases, baby's response to calm parent
5. **Outcome Anchoring:** Visualize successful resolution, parent's confidence

Session logs: scenario_id, date, duration, pre_confidence (1-10), post_confidence (1-10), notes.

### 3.3 Exposure Hierarchy Builder
Parents can create custom hierarchies:
- Rank scenarios by anxiety level (1-10)
- Progressive exposure: start with lowest-anxiety scenarios
- Track completion of each tier
- Show progression over time

### 3.4 Rehearsal Frequency Tracker
- Weekly rehearsal goal (configurable: 1-7 per week)
- Calendar heatmap of rehearsal sessions
- Streak counter
- "Preparedness Score" = rolling average of post-confidence ratings

### 3.5 Real-World Outcome Logger
After a rehearsed scenario occurs:
- Prompt: "How did it go?" (Better than expected / As expected / Worse)
- Prompt: "My confidence during the real event:" (1-10)
- Prompt: "My co-regulation with baby:" (Poor / Fair / Good / Excellent)
- Link to Stress Cascade data if available

### 3.6 Partner Rehearsal Sharing
- Generate a one-page PDF/shareable text summary of a scenario's rehearsal script
- Send to partner via share sheet
- Both partners can log rehearsal separately, compare confidence scores

---

## 4. Data Model (AsyncStorage)

```
@jobble/rehearsal_sessions: Array<{
  id: string;
  date: string; // ISO
  scenario_id: string;
  duration_sec: number;
  pre_confidence: number; // 1-10
  post_confidence: number; // 1-10
  notes: string;
}>

@jobble/rehearsal_scenarios: Array<{
  id: string;
  category: 'medical' | 'feeding' | 'sleep' | 'social' | 'developmental' | 'custom';
  title_key: string; // i18n key
  anxiety_level: number; // 1-10
  is_custom: boolean;
  script: string;
}>

@jobble/outcome_logs: Array<{
  id: string;
  scenario_id: string;
  date: string;
  outcome: 'better' | 'expected' | 'worse';
  real_confidence: number; // 1-10
  co_regulation: 'poor' | 'fair' | 'good' | 'excellent';
  notes: string;
}>

@jobble/hierarchy: Array<{
  scenario_id: string;
  tier: number; // 1-10 exposure tier
  completed: boolean;
  last_rehearsed: string | null;
}>
```

---

## 5. Tab Location
`JobbleBaby/app/(tabs)/behavioral-rehearsal.tsx`

Register in: `app/(tabs)/_layout.tsx` — add to TabNavigator

Storage registry: Add keys to `store/storage-keys.ts`

i18n: Add keys to `app/i18n/en.json` + `zh.json`

---

## 6. Technical Constraints
- TSC must pass: `npx tsc --noEmit` → 0 errors
- All storage: AsyncStorage (no backend)
- i18n: full bilingual (en + zh)
- No user accounts / auth

---

## 7. Links to Other Tabs
- Stress Cascade tab: share parental anxiety/cortisol data
- Window of Tolerance tab: co-regulation concepts
- Clinician Portal tab: medical scenario scripts link to visit prep

---

## 8. Mock Data (seed on first launch)
5 pre-built scenarios across categories with full scripts.