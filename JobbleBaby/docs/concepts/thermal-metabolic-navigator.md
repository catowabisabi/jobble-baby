# Concept: Infant Thermal-Metabolic Navigator

## Spark
From keywords: thermal_gradient + hunger_hormone_rhythm + thermoregulation_development + metabolic_imprint + brown_fat_thermogenesis

## Problem
Parents know temperature and feeding are related — a cold baby feeds poorly, a hot baby is lethargic — but there's no tool that models the underlying biology. Ghrelin (hunger hormone) and leptin (satiety hormone) follow circadian rhythms that interact with brown fat thermogenesis and thermal comfort. When these systems are misaligned, infants show poor growth, disrupted sleep, and feeding difficulties. The link between temperature regulation and metabolic programming in the first year is well-documented in developmental biology but absent from consumer apps.

## UX Flow
1. **Thermal-Metabolic Dashboard**: Home view showing today's thermal zone (cold/optimal/warm) + metabolic state (fasting/appetite峰值/satiated) + their interaction
2. **Brown Fat Activity Tracker**: Log brown fat activation events (cold exposure, kangaroo care, bath). Track correlation with subsequent feeding quality (amount taken, feeding duration, wind-down to sleep)
3. **Ghrelin/Leptin Curve Visualization**: Simple circadian curve showing predicted hunger/satiety peaks based on time of day + last feed. Annotated with actual feeding events to show alignment/misalignment
4. **Thermal Comfort Zone Monitor**: Based on room temperature + clothing togs + baby temp, show whether baby is in optimal thermal comfort zone. Alert when approaching cold stress (shivering threshold) or heat stress (vasodilation, sweating)
5. **Feeding–Temperature Correlation Log**: After each feed, prompt: "How was baby's temperature during this feed?" Options: Cold hands/feet (poor perfusion), Optimal, Flushed/warm. Track feeding quality score per thermal state
6. **Metabolic Meal Timing Optimizer**: Based on thermal rhythm + growth velocity, suggest optimal feeding windows to align with metabolic peaks. Show when to offer feeds vs. when baby is in thermal recovery mode
7. **Kangaroo Care + Brown Fat Session Logger**: Dedicated logger for skin-to-skin sessions with temperature delta before/after. Link to feeding outcome (did baby feed better after KC session?)
8. **Growth Velocity + Thermal Expenditure**: Model how much energy baby expends maintaining temperature vs. going toward growth. Show this trade-off visually — cold-stressed babies divert calories to thermogenesis

## Data Model
- @jobble/thermal_readings: { date, location, temperature_c, togs_worn, thermal_zone }
- @jobble/brown_fat_sessions: { date, duration_min, pre_temp, post_temp, feeding_after }
- @jobble/metabolic_meal_log: { date, time, food_type, amount_ml, hunger_level_pre, satiety_level_post, thermal_state_during }
- @jobble/thermal_feeding_correlation: { date, thermal_zone, feeding_quality_score, notes }

## Tab Location
JobbleBaby/app/(tabs)/thermal-metabolic.tsx

## i18n
Add keys to app/i18n/en.json + zh.json

## TSC
Run npx tsc --noEmit — must pass 0 errors
