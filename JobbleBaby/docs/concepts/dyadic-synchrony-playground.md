# Dyadic Synchrony Playground — Concept Spec

## Concept ID: 51
**Status:** Draft
**Keywords:** gaze_synchronization, heartbeat_synchrony, breath_coupling, mirror_neuron_bridge, emotional_pacing, entraining_rhythms, mutual_regulation, attunement_marker, synchronous_flourishing, co-regulation_loop
**Created:** Cycle 323

---

## 1. Problem Statement

Parent and baby exist in a shared biological synchrony. Their heartbeats, breath rates, and cortisol rhythms naturally entrain during calm co-regulation. But when the baby has colic, teething pain, or overtiredness, synchrony breaks down — and both parties escalate. A stressed parent cannot soothe; a dysregulated baby cannot self-soothe. No existing app helps families intentionally practice and measure dyadic synchrony.

The gap: existing baby apps track the baby's physiology in isolation. None track the parent's state alongside, nor provide structured co-regulation exercises with measurable synchrony feedback.

---

## 2. Solution Overview

**Dyadic Synchrony Playground** is a new tab that guides parent-baby co-regulation sessions with timed activities, dual state tracking (parent + baby), and a synchrony score derived from the correlation of their physiological signals over the session.

- **Synchrony activities:** Eye-gaze game, synchronized breathing, face mirroring, co-regulated rocking, shared哼唱
- **Dual tracking:** Parent HRV + baby HRV (manual entry or camera PPG when available)
- **Synchrony score:** 0–100 computed from the correlation coefficient of parent and baby HRV/HR over the session
- **Session timer:** 3 / 5 / 10 minute guided sessions with gentle audio/visual cues
- **Progress tracking:** Daily and weekly synchrony score history with trend line
- **Tips library:** Evidence-based co-regulation tips for high-stress situations

---

## 3. Feature Specification

### 3.1 Synchrony Activities
Six structured activities, each with:
- Name (en + zh)
- Duration (default 3 min)
- Step-by-step instructions
- Physiological target (HRV elevation, heart rate deceleration, parasympathetic activation)
- Optimal conditions (when to use: before sleep, after medical procedure, during teething pain)

Activities:
1. **Eye-Gaze Game** — Face-to-face, hold gaze for 30s intervals, smile when baby smiles. Target: mutual attention, oxytocin.
2. **Synchronized Breathing** — Parent breathes in for 4s, out for 6s, baby watches parent's chest rise/fall. Target: cardiorespiratory entrainment.
3. **Face Mirroring** — Parent makes slow exaggerated expressions, baby imitates. Target: mirror neuron activation.
4. **Co-Regulated Rocking** — Parent rocks in chair while holding baby, 20 rocks/min (slow). Target: vestibular-vagal co-activation.
5. **Shared Humming / 哼唱** — Parent hums a simple melody at ~60bpm. Target: vagal tone via vocalization.
6. **Skin-to-Skin Heartbeat** — Baby on chest, parent tracks own HR and baby's HR. Target: thermoregulation + HR co-regulation.

### 3.2 Dual State Tracking
- **Manual entry:** Parent enters own HR + HRV (1–100 score) before and after session
- **Baby entry:** Parent enters baby's HR + HRV before and after session
- **Camera PPG (future):** Phone camera pulse detection (not in v1)
- **Storage:** AsyncStorage key `@jobble/synchrony_entries`

### 3.3 Synchrony Score
Formula: synchronyScore = correlation(parentHRV_series, babyHRV_series) × 100

- 80–100: Excellent synchrony — both trending together
- 60–79: Good co-regulation
- 40–59: Moderate — some divergence
- 0–39: Low synchrony — consider shorter sessions or calmer environment

### 3.4 Session Timer
- Select duration: 3 / 5 / 10 minutes
- Animated circle progress
- Gentle audio cue at start/end (optional)
- Pre-session: prompt for baseline HR/HRV entry for both
- Post-session: prompt for end HR/HRV entry, compute synchrony score

### 3.5 Progress Tracking
- 7-day rolling synchrony score chart
- Activity type breakdown (which activity correlates with highest scores)
- Best synchrony time-of-day analysis
- Trend arrow (improving / declining / stable)

### 3.6 Tips Library
Evidence-based tips for maintaining synchrony:
- "When baby is crying, your calm voice lowers their cortisol first"
- "Skin-to-skin for 20+ minutes significantly improves HRV correlation"
- "Synchronized breathing is most effective before sleep transition"
- "Face mirroring during teething pain reduces baby heart rate by 10–15%"

---

## 4. Technical Specification

### 4.1 File Structure
```
app/(tabs)/dyadic-synchrony.tsx     — Main tab screen
app/components/SynchronyCard.tsx     — Session result card
app/components/SessionTimer.tsx     — Circular timer component
app/components/SynchronyChart.tsx    — 7-day trend chart
app/data/synchronyActivities.ts     — Activities library data
app/hooks/useSynchronyStorage.ts    — AsyncStorage hook
app/i18n/en.json                    — Add dyadicSynchrony.* keys
app/i18n/zh.json                    — Add dyadicSynchrony.* keys
```

### 4.2 AsyncStorage Schema
```json
{
  "@jobble/synchrony_entries": [
    {
      "id": "uuid",
      "date": "2026-06-12T10:00:00Z",
      "activityType": "eyeGaze",
      "duration": 300,
      "parentHR_start": 72, "parentHRV_start": 45,
      "babyHR_start": 108, "babyHRV_start": 38,
      "parentHR_end": 68, "parentHRV_end": 52,
      "babyHR_end": 105, "babyHRV_end": 44,
      "synchronyScore": 78,
      "notes": "good eye contact"
    }
  ]
}
```

### 4.3 i18n Keys Required
```
dyadicSynchrony.title
dyadicSynchrony.activityLibrary
dyadicSynchrony.startSession
dyadicSynchrony.sessionTimer
dyadicSynchrony.synchronyScore
dyadicSynchrony.dualTracking
dyadicSynchrony.progressChart
dyadicSynchrony.tipsLibrary
dyadicSynchrony.parentBaseline
dyadicSynchrony.babyBaseline
dyadicSynchrony.excellentSynchrony
dyadicSynchrony.goodCoRegulation
dyadicSynchrony.moderateDivergence
dyadicSynchrony.lowSynchrony
dyadicSynchrony.eyeGaze
dyadicSynchrony.synchronizedBreathing
dyadicSynchrony.faceMirroring
dyadicSynchrony.coRegulatedRocking
dyadicSynchrony.sharedHumming
dyadicSynchrony.skinToSkin
dyadicSynchrony.minutes3
dyadicSynchrony.minutes5
dyadicSynchrony.minutes10
```

### 4.4 Mock Seed Data (7 days)
```json
[
  { "date": "2026-06-05T09:00:00Z", "activityType": "eyeGaze", "parentHRV_start": 48, "babyHRV_start": 35, "parentHRV_end": 55, "babyHRV_end": 42, "synchronyScore": 72 },
  { "date": "2026-06-06T20:00:00Z", "activityType": "synchronizedBreathing", "parentHRV_start": 44, "babyHRV_start": 30, "parentHRV_end": 58, "babyHRV_end": 48, "synchronyScore": 85 },
  { "date": "2026-06-07T08:30:00Z", "activityType": "skinToSkin", "parentHRV_start": 52, "babyHRV_start": 40, "parentHRV_end": 62, "babyHRV_end": 55, "synchronyScore": 91 },
  { "date": "2026-06-08T19:00:00Z", "activityType": "faceMirroring", "parentHRV_start": 38, "babyHRV_start": 25, "parentHRV_end": 42, "babyHRV_end": 30, "synchronyScore": 55 },
  { "date": "2026-06-09T09:00:00Z", "activityType": "coRegulatedRocking", "parentHRV_start": 45, "babyHRV_start": 32, "parentHRV_end": 50, "babyHRV_end": 40, "synchronyScore": 68 },
  { "date": "2026-06-10T20:00:00Z", "activityType": "sharedHumming", "parentHRV_start": 40, "babyHRV_start": 28, "parentHRV_end": 55, "babyHRV_end": 45, "synchronyScore": 80 },
  { "date": "2026-06-11T08:00:00Z", "activityType": "eyeGaze", "parentHRV_start": 50, "babyHRV_start": 38, "parentHRV_end": 58, "babyHRV_end": 50, "synchronyScore": 88 }
]
```

---

## 5. Connections to Existing Tabs

| Existing Tab | Connection |
|---|---|
| HRV Monitor | Shares HRV tracking; HRV data can feed synchrony sessions |
| Bonding Journal | Co-regulation activities logged as bonding entries |
| Stress Cascade | Polyvagal framework shared; co-regulation as stress intervention |
| Circadian Rhythm | Synchrony may vary by time of day; correlate with circadian phase |
| Sleep Training | Pre-sleep synchrony sessions may improve sleep onset |

---

## 6. Out of Scope

- Apple Watch / wearable HRV integration (Cycle 2+)
- Multi-caregiver sessions (both parents + baby)
- Backend sync / cloud storage
- Automatic PPG heart rate detection (v1 = manual entry only)
- Social sharing of synchrony scores

---

## 7. Priority & Effort

**Priority:** Medium (post-launch feature)  
**Effort:** ~2–3 days for Sisyphus (tab + timer + chart + storage + i18n)  
**Depends on:** App Store submission first; HRV Monitor tab is a prerequisite
