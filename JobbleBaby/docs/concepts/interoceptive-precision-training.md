# Interoceptive Precision Training — Concept Spec

## Concept ID: 52
**Status:** Draft
**Keywords:** interoceptive_precision, baroreflex_calibration, cardiorespiratory_coupling, zone_of_regulation, window_of_tolerance_expansion, autonomic_setpoint, vagal_braking_latency, heart_rate_decoupling, neurocardiac_index, sympathetic_hair_trigger
**Created:** Cycle 323

---

## 1. Problem Statement

Interoception — the perception of internal bodily sensations — is the foundation of emotion regulation, hunger/satiety awareness, pain tolerance, and intuitive parenting. A parent with high interoceptive precision can detect baby distress cues before they escalate. A baby with developing interoceptive precision learns to self-regulate. Yet no baby app addresses the interoceptive ecosystem shared between parent and infant.

The gap: existing baby apps track external observables (crying, feeding amount, sleep duration). None train the parent's interoceptive awareness — the ability to feel and act on gut-level signals — alongside the baby's developing interoception. Stress degrades interoceptive accuracy (cortisol overload impairs the insular cortex). When interoceptive precision drops, parents miss early distress cues and rely on reactive, rather than proactive, caregiving.

---

## 2. Solution Overview

**Interoceptive Precision Training** is a new tab that:
- Trains the parent's interoceptive awareness through guided body-scan sessions
- Provides a dyadic interoceptive diary linking parent gut-feelings to baby state
- Computes an Interoceptive Precision Score from diary consistency and HRV correlation
- Offers Baby Signal Matching — parent guesses what baby needs; system compares to outcome
- Includes age-appropriate interoceptive games for older infants/toddlers

---

## 3. Feature Specification

### 3.1 Body Scan Sessions
**Purpose:** Train parent interoceptive awareness through progressive relaxation and body awareness.

- Guided body scan: head → throat → chest → abdomen → pelvis → limbs (standard clinical protocol)
- Duration options: 3 / 5 / 10 minutes
- Audio cues (gentle bell tones) at each body region transition
- HRV entry before and after (manual entry: 1–100 score)
- Session history with HRV delta (+ improved = parasympathetic activation)
- Reminder prompts: "Take a 3-min body scan" notification when stress-cascade shows high parent cortisol
- i18n keys: `interoceptive.bodyScanTitle`, `interoceptive.bodyScanStart`, `interoceptive.scanHead`, `interoceptive.scanChest`, `interoceptive.scanAbdomen`, `interoceptive.scanComplete`, `interoceptive.hrvBefore`, `interoceptive.hrvAfter`, `interoceptive.hrvDelta`

**Conditions:**
- Recommended time: after first morning wake, before feeding
- Contraindicated: never during active feeding or when baby needs immediate attention

### 3.2 Interoceptive Diary
**Purpose:** Log gut-level sensations alongside baby state to build pattern recognition.

- Dual-entry log: Parent gut-feeling + Baby actual state
- Parent entries: gut feeling text (freeform), gut intensity (1–5), body region (chest/abdomen/throat/head/limbs), emotional valence (calm/anxious/frustrated/neutral)
- Baby entries: needs assessment (feed/diaper/sleep/comfort/play/nothing identified)
- Outcome: what actually resolved the situation (dropdown)
- Correlation feedback: "Your gut matched outcome: 8/10 last 30 entries" (precision score)
- Linkage: each diary entry linked to a feeding, sleep, or diaper log entry
- i18n keys: `interoceptive.diaryTitle`, `interoceptive.gutFeeling`, `interoceptive.gutIntensity`, `interoceptive.bodyRegion`, `interoceptive.emotionalValence`, `interoceptive.babyState`, `interoceptive.outcome`, `interoceptive.precisionScore`, `interoceptive.diaryEntryAdded`

**Data Model:**
- `@jobble/interoceptive_diary`: `{ id, date, gut_feeling, gut_intensity, body_region, emotional_valence, parent_guess, actual_outcome, linked_log_type, linked_log_id }`
- `@jobble/body_scan_session`: `{ id, date, duration_min, hrv_before, hrv_after, hrv_delta }`

### 3.3 Interoceptive Precision Score
**Purpose:** Give parent a measurable score reflecting interoceptive accuracy over time.

- Composite score 0–100 derived from:
  - Diary consistency: % of gut guesses that matched actual outcome (50% weight)
  - HRV correlation: correlation between parent's HRV trend and baby's autonomic state trend over 7 days (25% weight)
  - Body scan engagement: frequency of body scan practice (25% weight)
- Weekly update on Sundays
- Trend line: 30-day rolling precision score
- Benchmark: "New parent average = 42, Experienced parent average = 67"
- Alert: If precision drops >15 points in a week, flag in home dashboard
- i18n keys: `interoceptive.precisionScoreTitle`, `interoceptive.precisionScoreDesc`, `interoceptive.scoreTrend`, `interoceptive.scoreAlert`, `interoceptive.weeklyUpdate`

### 3.4 Baby Signal Matching
**Purpose:** Gamify the parent's ability to read baby cues before they escalate.

- Daily challenge: 3 "what does baby need now?" prompts
- Parent selects from: feed, diaper, sleep, comfort, play, stimulation reduction, nothing/just contact
- After 15 min, parent logs actual outcome
- Match score: correct / incorrect
- Running streak counter (days with 3/3 correct)
- Badge: "Signal Master" — 7-day streak of 3/3 matches
- i18n keys: `interoceptive.signalMatchTitle`, `interoceptive.signalChallenge`, `interoceptive.signalOptions`, `interoceptive.signalResult`, `interoceptive.signalStreak`, `interoceptive.signalMaster`

### 3.5 Interoceptive Training Games (for older infants/toddlers)
**Purpose:** Build the baby's developing interoception through guided play.

- Age 6–12 months: "Hot/Cold Belly" game — parent touches belly with warm/cold object, baby reacts; builds interoceptive discrimination
- Age 9–12 months: "Belly Breathing Buddy" — parent places stuffed animal on baby's belly, watches it rise/fall; teaches breath awareness
- Age 12+ months: "Body Part Point" — parent says "where does it feel funny?" baby points; builds body awareness vocabulary
- Simple yes/no feedback: baby reacts consistently = interoceptive discrimination developing
- Log entry: game played, baby's reaction, parent's observation notes
- i18n keys: `interoceptive.gameTitle`, `interoceptive.hotColdBelly`, `interoceptive.bellyBreathingBuddy`, `interoceptive.bodyPartPoint`, `interoceptive.gameReaction`, `interoceptive.gameNotes`

---

## 4. UX / UI Notes

- **Visual language:** Soft, inward-focused aesthetic — muted blues and greens, gentle circular motifs (representing the body interior), no sharp angles
- **Entry point:** Home tab shows "Interoceptive Precision Score" card if user has done >=3 body scan sessions
- **Diary:** Single-screen dual-entry form (parent gut-feeling top, baby state bottom), minimal scrolling
- **Body scan:** Full-screen modal with gentle animations, audio bell cues, dark/quiet environment prompt
- **Games:** Playful, game-like UI for toddler games — large touch targets, celebratory feedback
- **Color coding:**
  - High precision (75+): calm teal
  - Medium precision (45–74): warm amber
  - Low precision (<45): soft red — non-alarming, just informative
- **One-handed:** All logging designed for one-handed use while holding baby

---

## 5. Technical Notes

### Data Model
```
@jobble/interoceptive_diary: {
  id: auto,
  date: ISO8601,
  gut_feeling: string,
  gut_intensity: 1|2|3|4|5,
  body_region: 'head'|'chest'|'abdomen'|'pelvis'|'limbs'|'throat',
  emotional_valence: 'calm'|'anxious'|'frustrated'|'neutral',
  parent_guess: NeedType,
  actual_outcome: NeedType,
  matched: boolean,
  linked_log_type: 'feed'|'sleep'|'diaper'|'none',
  linked_log_id: string
}

@jobble/body_scan_session: {
  id: auto,
  date: ISO8601,
  duration_sec: number,
  hrv_before: number,
  hrv_after: number,
  hrv_delta: number
}

@jobble/signal_match: {
  id: auto,
  date: ISO8601,
  challenge_index: 1|2|3,
  parent_guess: NeedType,
  actual_outcome: NeedType,
  matched: boolean
}

@jobble/interoceptive_games: {
  id: auto,
  date: ISO8601,
  game_type: 'hot_cold_belly'|'belly_breathing_buddy'|'body_part_point',
  baby_age_months: number,
  reaction: string,
  notes: string
}
```

### Dependencies
- Reuses `@jobble/stress_cascade` data for parent cortisol/HRV trends
- Reuses `@jobble/hrv_co_regulation` data if available
- Links to gut-brain-axis tab (interoceptive gut sensation data)
- Links to sleep-training tab (morning body scan recommendation trigger)
- Links to stress-cascade tab (stress-triggered body scan reminder)
- No new native modules required

### Badge
- **Interoceptive Precision: 85+**: Achieved 85+ precision score for 30 consecutive days
- **Body Scan Streak**: Completed body scan 7 days in a row
- **Signal Master**: 7-day streak of 3/3 baby signal matches

### i18n Keys to Add
```json
{
  "interoceptive": {
    "tabTitle": "Interoceptive Training",
    "bodyScanTitle": "Body Scan",
    "bodyScanStart": "Begin Scan",
    "bodyScanComplete": "Scan Complete",
    "hrvBefore": "HRV before",
    "hrvAfter": "HRV after",
    "hrvDelta": "HRV change",
    "diaryTitle": "Interoceptive Diary",
    "gutFeeling": "What is your gut feeling?",
    "gutIntensity": "Gut intensity",
    "bodyRegion": "Where in your body do you feel it?",
    "emotionalValence": "Current emotional state",
    "babyState": "What does baby seem to need?",
    "outcome": "What resolved it?",
    "precisionScore": "Precision Score",
    "precisionScoreTitle": "Your Interoceptive Precision",
    "precisionScoreDesc": "How accurately you read your baby's signals",
    "scoreTrend": "30-day trend",
    "scoreAlert": "Precision dropped this week",
    "signalMatchTitle": "Signal Match Challenge",
    "signalChallenge": "What does baby need right now?",
    "signalStreak": "Current streak",
    "signalMaster": "Signal Master badge earned!",
    "gameTitle": "Interoceptive Games",
    "gameReaction": "How did baby react?"
  }
}
```

---

*Concept spec author: Hermes (Cycle 325) · Keywords: interoceptive_precision, baroreflex_calibration, cardiorespiratory_coupling, zone_of_regulation, window_of_tolerance_expansion*