# HRV Co-Regulation Monitor — Concept Spec

## Concept ID: 77
**Status:** Draft  
**Keywords:** hrv_synchronization, polyvagal_state, thermoregulation_development, motor_milestone_prerequisite, information_overload  
**Created:** Cycle 322

---

## 1. Problem Statement

Parent and baby exist in a shared autonomic ecosystem. When one dysregulates, the other follows — a phenomenon called **co-regulation failure**. A stressed parent triggers sympathetic overflow in the baby; an overstimulated baby keeps the parent awake and anxious. Standard baby monitors track the baby's heart rate but ignore the parent's, missing the bidirectional signal entirely.

Existing solutions treat the baby as an isolated system. No app helps a parent understand: *"Is my stress making my baby more dysregulated?"*

---

## 2. Solution Overview

**HRV Co-Regulation Monitor** is a new tab that tracks heart rate variability (HRV) for both parent and baby over time, visualizes their correlation, and suggests co-regulation activities when both HRV scores drop simultaneously.

- **HRV measurement:** Phone camera photoplethysmography (PPG) pulse reading OR manual entry (heart rate + HRV score)
- **Dual tracking:** Parent HRV + baby HRV displayed side by side
- **Correlation graph:** 7-day rolling trend lines showing both HRV traces
- **Co-regulation prompts:** Alert when both HRV scores drop together — suggest evidence-based co-regulation activities
- **Activities library:** Skin-to-skin, 4-7-8 breathing, singing, rocking, mirroring, ventral vagal activation
- **Polyvagal state inference:** Classify autonomic state (ventral vagal / sympathetic / dorsal vagal) from HRV pattern

---

## 3. Feature Specification

### 3.1 HRV Measurement
- **Camera PPG:** Use phone rear camera to detect pulse via fingertip pless pless (PPG method). Display real-time HR + HRV (RMSSD).
- **Manual entry:** User enters heart rate (bpm) and an HRV score (1–100 scale or RMSSD value)
- **Session recording:** Each measurement tagged with timestamp, who (parent/baby), and optional notes
- **Storage:** AsyncStorage key `@jobble/hrv_entries` — array of `{ date, subject, hr, hrv, notes }`

### 3.2 Dual Tracking Dashboard
- **Split view:** Parent HRV panel | Baby HRV panel
- **Today's reading:** Latest HR + HRV for each
- **7-day sparklines:** Mini trend chart for each subject
- **Correlation indicator:** Visual cue when parent + baby HRV trend lines move together

### 3.3 Correlation Graph
- **Line chart:** Dual Y-axis (parent HRV left, baby HRV right) over 7-day rolling window
- **Highlight zones:** Shaded bands when both HRV < personal threshold simultaneously
- **Insomnia correlation:** Optional overlay of sleep quality scores if user logs sleep

### 3.4 Co-Regulation Prompts
- **Trigger:** Both HRV scores below 30th percentile of personal baseline for > 20 minutes
- **Notification:** In-app banner + optional push notification
- **Prompt content:** "Both of you are in a low-HRV state. Try a co-regulation activity."
- **Activity card:** One recommended activity from the library, with instructions

### 3.5 Activities Library
Pre-loaded list of co-regulation activities, each with:
- Name (en + zh)
- Autonomic target (ventral vagal activation / sympathetic downregulation)
- Duration
- Step-by-step instructions
- Evidence note (brief)

Activities:
1. **Skin-to-skin contact** — ventral vagal activation, 20+ min
2. **4-7-8 Breathing** — parasympathetic reset, 5 min
3. **Synchronized rocking** — vestibulary/proprioceptive co-regulation, 10 min
4. **Eye-gaze mirroring** — social engagement system activation, 5 min
5. **轻声哼唱 (Soft humming)** — vagal tone enhancement via vocalization, 10 min
6. **共同伸展 (Co-regulated stretching)** — proprioceptive grounding, 5 min

### 3.6 Polyvagal State Inference
Based on HRV pattern over last 3 readings:
- **Ventral Vagal (social engagement):** HRV RMSSD > 50ms or score > 70 — green state
- **Sympathetic (fight/flight):** HRV RMSSD < 20ms or score < 30 — red state
- **Dorsal Vagal (shutdown/freeeze):** Very low HRV + low heart rate — blue state (alert)

Display state badge on each subject's panel.

### 3.7 Alert Thresholds
- User-configurable HRV threshold (default: 30th percentile of personal baseline)
- Configurable time window before alert fires (default: 20 minutes)
- Alert history log

---

## 4. Technical Specification

### 4.1 File Structure
```
app/(tabs)/hrv-monitor.tsx       — Main tab screen
app/components/HrvCard.tsx        — Single HRV entry card
app/components/CorrelationChart.tsx — Dual-line chart
app/components/ActivityCard.tsx  — Co-regulation activity card
app/data/hrvActivities.ts        — Activities library data
app/hooks/useHrvStorage.ts       — AsyncStorage hook for HRV entries
app/i18n/en.json                 — Add hrvMonitor.* keys
app/i18n/zh.json                 — Add hrvMonitor.* keys
```

### 4.2 AsyncStorage Schema
```json
{
  "@jobble/hrv_entries": [
    {
      "id": "uuid",
      "date": "2026-06-12T10:00:00Z",
      "subject": "parent" | "baby",
      "hr": 72,
      "hrv": 45,
      "hrvUnit": "rmssd" | "score",
      "notes": "after nap"
    }
  ],
  "@jobble/hrv_settings": {
    "parentThreshold": 30,
    "babyThreshold": 30,
    "alertWindowMinutes": 20
  }
}
```

### 4.3 i18n Keys Required
```
hrvMonitor.title
hrvMonitor.parentPanel
hrvMonitor.babyPanel
hrvMonitor.recordReading
hrvMonitor.cameraPpg
hrvMonitor.manualEntry
hrvMonitor.hrvScore
hrvMonitor.heartRate
hrvMonitor.correlationGraph
hrvMonitor.coRegulationAlert
hrvMonitor.activityLibrary
hrvMonitor.polyvagalState
hrvMonitor.ventralVagal
hrvMonitor.sympathetic
hrvMonitor.dorsalVagal
hrvMonitor.alertThreshold
hrvMonitor.alertWindow
hrvMonitor.noDataYet
hrvMonitor.days7
```

### 4.4 Mock Seed Data (7 days)
```json
[
  { "date": "2026-06-05T08:00:00Z", "subject": "parent", "hr": 68, "hrv": 52, "notes": "morning baseline" },
  { "date": "2026-06-05T08:00:00Z", "subject": "baby", "hr": 110, "hrv": 38, "notes": "post feeding" },
  { "date": "2026-06-06T09:30:00Z", "subject": "parent", "hr": 72, "hrv": 44, "notes": "after meditation" },
  { "date": "2026-06-06T09:30:00Z", "subject": "baby", "hr": 108, "hrv": 41, "notes": "playtime" },
  { "date": "2026-06-07T20:00:00Z", "subject": "parent", "hr": 78, "hrv": 28, "notes": "work stress day" },
  { "date": "2026-06-07T20:00:00Z", "subject": "baby", "hr": 115, "hrv": 25, "notes": "fussy evening" },
  { "date": "2026-06-08T07:30:00Z", "subject": "parent", "hr": 65, "hrv": 55, "notes": "good sleep" },
  { "date": "2026-06-08T07:30:00Z", "subject": "baby", "hr": 105, "hrv": 48, "notes": "slept through" },
  { "date": "2026-06-09T21:00:00Z", "subject": "parent", "hr": 80, "hrv": 22, "notes": "poor sleep" },
  { "date": "2026-06-09T21:00:00Z", "subject": "baby", "hr": 118, "hrv": 20, "notes": "teething night" },
  { "date": "2026-06-10T08:00:00Z", "subject": "parent", "hr": 70, "hrv": 48, "notes": "recovered" },
  { "date": "2026-06-10T08:00:00Z", "subject": "baby", "hr": 108, "hrv": 42, "notes": "better day" },
  { "date": "2026-06-11T19:00:00Z", "subject": "parent", "hr": 75, "hrv": 35, "notes": "co-regulation session" },
  { "date": "2026-06-11T19:00:00Z", "subject": "baby", "hr": 112, "hrv": 33, "notes": "一起做呼吸练习" },
  { "date": "2026-06-12T08:00:00Z", "subject": "parent", "hr": 67, "hrv": 50, "notes": "morning" },
  { "date": "2026-06-12T08:00:00Z", "subject": "baby", "hr": 106, "hrv": 44, "notes": "post skin-to-skin" }
]
```

---

## 5. Connections to Existing Tabs

| Existing Tab | Connection |
|---|---|
| Stress Cascade | Shares autonomic nervous system theme; HRV data complements stress scoring |
| Circadian Rhythm | Circadian patterns affect HRV; overlay possible |
| Sleep Training | Sleep quality correlates with HRV recovery |
| Bonding Journal | Co-regulation activities logged as bonding entries |
| Monitor Correlation | HRV correlation could be a new correlation type |

---

## 6. Out of Scope

- Apple Watch / WearOS integration (Cycle 2+)
- Backend sync / cloud storage
- Multi-caregiver sharing
- Medical-grade PPG accuracy claims
- ECG / detailed heart rate variability analysis (RMSSD only)

---

## 7. Priority & Effort

**Priority:** Medium (non-launch-blocking)  
**Effort:** ~3 days for Sisyphus (tab + chart + storage + i18n)  
**Depends on:** App Store submission (can be developed post-launch)
