#!/bin/bash
# Cycle 326 dispatch — Infant Thermal-Metabolic Navigator (concept #43)

TASK="Implement the Infant Thermal-Metabolic Navigator tab (concept #43 in DB).

SPEC: JobbleBaby/docs/concepts/thermal-metabolic-navigator.md — tracks brown fat activation, ghrelin/leptin circadian curves, thermal comfort zone, feeding-temperature correlation.

KEYWORDS: thermal_gradient, hunger_hormone_rhythm, thermoregulation_development, metabolic_imprint, brown_fat_thermogenesis

FEATURES TO BUILD:
1. Thermal-Metabolic Dashboard — today's thermal zone + metabolic state + interaction
2. Brown Fat Activity Tracker — cold exposure, kangaroo care, bath sessions with feeding correlation
3. Ghrelin/Leptin Curve — circadian hunger/satiety peaks with feeding event annotations
4. Thermal Comfort Zone Monitor — room temp + togs + baby temp → zone alert
5. Feeding–Temperature Correlation Log — feeding quality score per thermal state
6. Metabolic Meal Timing Optimizer — optimal feeding windows based on thermal rhythm
7. Kangaroo Care + Brown Fat Session Logger — temp delta before/after, feeding outcome link
8. Growth Velocity + Thermal Expenditure — energy trade-off visualization

DATA MODEL (AsyncStorage):
- @jobble/thermal_readings: { date, location, temperature_c, togs_worn, thermal_zone }
- @jobble/brown_fat_sessions: { date, duration_min, pre_temp, post_temp, feeding_after }
- @jobble/metabolic_meal_log: { date, time, food_type, amount_ml, hunger_level_pre, satiety_level_post, thermal_state_during }
- @jobble/thermal_feeding_correlation: { date, thermal_zone, feeding_quality_score, notes }

TAB LOCATION: JobbleBaby/app/(tabs)/thermal-metabolic.tsx
REGISTER IN: app/(tabs)/_layout.tsx — add to TabNavigator
STORAGE REGISTRY: Add new keys to store/storage-keys.ts

i18n: Use existing keys where possible. Add new keys to app/i18n/en.json + zh.json if needed.
TSC: Run npx tsc --noEmit — must pass 0 errors before marking done.

After implementing:
1. Run: cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby && npx tsc --noEmit
2. If TSC passes, mark concept #43 as 'implemented' in DB
3. Write DONE to stdout

ULW"
