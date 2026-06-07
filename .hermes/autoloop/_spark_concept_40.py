import sqlite3
from datetime import datetime
import os

DB = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/progress.db'
c = sqlite3.connect(DB)
now = datetime.utcnow().isoformat()

concept_desc = """## Concept: 4-Month Sleep Regression Breath Navigator

### Spark
From keywords: four_month_regression + breath + spectral_decomposition + light_dark_cue + blue_light_filter

### Problem
The 4-month sleep regression is the first major sleep reorganization (Wolke regression #1) — baby's sleep architecture changes from neonatal to mature, with shorter cycles (50-60 min vs 90 min), more frequent night wakings, and disrupted circadian building. Parents experience this as "baby forgot how to sleep" and often resort to sleep props (rocking, feeding, pacifier) that become hard habits to break. No app helps parents understand what's physiologically happening during this regression or guides them to support the sleep architecture change without creating new sleep associations.

### UX Flow
1. **Regression Status Dashboard** (new tab or Home card):
   - Show: "Baby is in the 4-month sleep regression window (Weeks 1-4)"
   - Explain what's happening: sleep cycle maturation, circadian building,REM占比变化
   - Progress tracker: which week of regression, trend direction
2. **Breath Pattern Analyzer**:
   - Input: parent's observation of baby's breathing pattern during sleep (deep regular, shallow irregular, pause, sigh)
   - Track: breathing pattern per sleep session (nap/night)
   - Spectral view: simple visualization of breath rhythm changes over time
   - Correlation: breathing pattern changes → sleep quality (night wakings, total sleep)
3. **Light Dark Cue Tracker**:
   - Log morning bright light exposure (duration + intensity)
   - Log evening dim light transition time
   - Log screen off time
   - Show: "Light exposure quality score" for today
   - Correlation: light tracking → regression duration (does consistent light = faster regression completion?)
4. **Sleep Architecture Support Guide**:
   - Educational: what healthy 4-month sleep looks like (cycle length, wake windows, total hours)
   - Age-appropriate schedule: wake windows by week of regression
   - What NOT to do: avoid new sleep props that become crutches
   - What TO do: consistent wind-down routine, day/night differentiation, circadian anchor
5. **Regression Duration Predictor**:
   - Input: baseline sleep quality, light exposure consistency, feeding method
   - Output: "Estimated regression end: Week N (based on similar babies in your community)"
   - Confidence level based on input quality
6. **Parent Breathing Exercise** (for stress during regression):
   - One-tap access to: double physiological sigh, 4-7-8 breathing, box breathing
   - Haptic rhythm option
   - Remind parent: "This is temporary, baby is building important neural architecture"

### Data Model
- @jobble/breath_pattern_log: { date, sleep_session, pattern_type, notes }
- @jobble/light_exposure: { date, morning_bright_min, outdoor_min, screen_off_time, evening_dim_time }
- @jobble/regression_status: { started_at, expected_end_week, actual_end_week, regression_type }
- @jobble/parent_calm_session: { date, technique, duration_sec }

### Integration
- Links to sleep-training tab (regression handling techniques)
- Links to circadian tab (light exposure tracking)
- Links to projection tab (regression duration prediction)
- Links to habit-reset tab (parent self-care during regression)
- Links to schedule tab (age-appropriate wake windows)
- Reuses: existing AsyncStorage patterns, i18n keys, theme context

### Badge
- "Regression Navigator": Completed 4-week regression with sleep efficiency maintained above 65%
- "Light Architect": Logged light exposure for 14 consecutive days during regression
- "Calm Breath": Used parent breathing exercise 7 times during regression

### Design
- Warm, reassuring aesthetic — not clinical
- Breathing visualization: simple wave animation (not overwhelming)
- Progress timeline: regression weeks 1-4 with milestone markers
- Educational content in accessible language (not medical jargon)
- No alarming language — "regression is a developmental milestone, not a problem"

### Keywords
four_month_regression, breath_spectral_analysis, light_dark_cue_tracking, blue_light_filter, sleep_architecture_maturation, circadian_building, wolfe_regression_1, breathing_pattern_correlation, regression_duration_prediction, parent_calm_exercise, physiological_sigh, sleep_cycle_maturation, rem占比变化, wake_window_progression, regression_weeks_1234, light_exposure_score, sleep_quality_tracking, sleep_props_prevention, wind_down_routine, age_appropriate_schedule
"""

cur = c.cursor()
cur.execute("""INSERT INTO concepts(title, description, keywords, status, created_at) VALUES (?, ?, ?, ?, ?)""",
    ("4-Month Sleep Regression Breath Navigator",
     concept_desc,
     "four_month_regression,breath_spectral_analysis,light_dark_cue_tracking,blue_light_filter,sleep_architecture_maturation,circadian_building,wolfe_regression_1,breathing_pattern_correlation,regression_duration_prediction,parent_calm_exercise",
     "draft",
     now))
concept_id = cur.lastrowid

# Create todo for this concept
cur.execute("""INSERT INTO todos(title, description, status, priority, created_at) VALUES (?, ?, ?, ?, ?)""",
    (f"Implement 4-Month Sleep Regression Breath Navigator tab (concept #{concept_id})",
     f"New tab: 4-month regression tracking with breath pattern analyzer, light dark cue tracker, regression duration predictor, parent breathing exercises. TSC 0 errors, i18n, AsyncStorage.",
     "new",
     2,
     now))

c.commit()
print(f"Created concept #{concept_id}: 4-Month Sleep Regression Breath Navigator")
print(f"Created todo for concept #{concept_id}")
print(c.execute("SELECT COUNT(*) FROM concepts").fetchone()[0], "total concepts")