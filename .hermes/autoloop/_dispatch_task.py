#!/usr/bin/env python3
"""
Sisyphus Task Dispatch — Cycle 236
Infant Thermal Regulation Dashboard tab
"""
import os

task = """# Sisyphus Task — Cycle 236

## Context
Jobble Baby: TSC 0 errors, 50 tabs. DevOps CI/CD complete. Next priority: implement Infant Thermal Regulation Dashboard tab.

## Task: Implement Infant Thermal Regulation Dashboard tab

Create app/(tabs)/thermal-regulation.tsx — a new tab helping parents track and manage baby's thermal health.

### Features

1. **Temperature Log**
   - Input: body temp (axillary/ear/forehead), ambient room temp, clothing layers (1-5), sweat level (none/damp/wet)
   - Timestamp auto-generated
   - Storage key: @jobble/thermal_log

2. **Thermal Map Timeline**
   - Visual timeline: body temp vs ambient temp overlaid with sleep quality
   - Color-coded: blue (cold) to green (optimal) to red (hot)
   - Storage key: @jobble/thermal_log

3. **Overheating Risk Alert**
   - When ambient >24C + clothing >2 layers -> alert: Overheating risk — remove layer
   - Configurable threshold
   - Storage key: @jobble/thermal_alert_threshold

4. **Fever Tracker**
   - Log fever episodes: temp, duration, treatment given, feeding change
   - Alert thresholds: >38C (rectal/ear) or >37.5C (axillary)
   - Correlation: fever + feeding frequency drop = dehydration risk
   - Storage key: @jobble/fever_episode

5. **Evaporative Cooling Guide**
   - Tepid sponging timer (10 min)
   - Target pulse points: groin, axillae, neck
   - Step-by-step instructional card
   - Storage key: @jobble/fever_treatment

6. **Car Seat Temperature Alert**
   - Ambient >28C -> notification: Car seat can reach dangerous temps in direct sun
   - Storage key: @jobble/car_temp_alert_enabled

7. **Sleep Environment Score**
   - Composite: ambient temp + clothing + air circulation -> optimal/cooler/warmer
   - Recommendations for optimal sleep temperature (16-20C)
   - Storage key: @jobble/sleep_environment_score

8. **Thermal Correlation Dashboard**
   - Overlay thermal events with sleep quality and feeding
   - Does overheating correlate with night wakings? insight card

### Implementation Rules
- New tab: app/(tabs)/thermal-regulation.tsx
- Follow existing tab patterns: Tab -> ScrollView -> Section cards
- Use existing theme context, language context, AsyncStorage patterns
- TSC must pass 0 errors after changes
- i18n: add keys to en.json + zh.json (use t() for all user-facing text)
- Register in app/(tabs)/_layout.tsx
- Icon: thermometer (MaterialCommunityIcons), label: t('tabs.thermalRegulation')
- Badge: Thermal Guardian (logged temperature for 30 consecutive days)

### After Implementation
1. Run: npx tsc --noEmit (0 errors required)
2. Verify tab appears in tab bar
3. Commit: git add -A && git commit -m "feat(tab): add Infant Thermal Regulation Dashboard — temperature log, fever tracker, overheating alert, sleep environment score, i18n"
4. git push

ULW"""

# Write task to file
task_file = os.path.join(os.path.dirname(__file__), 'sisyphus_task.txt')
with open(task_file, 'w') as f:
    f.write(task)
print(f"Task written to {task_file}")