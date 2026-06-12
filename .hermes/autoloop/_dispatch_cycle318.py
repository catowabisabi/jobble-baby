#!/usr/bin/env python3
"""Dispatch Cycle 318 — Window of Tolerance Monitor"""
import subprocess, sys

task = """cat << 'TASK' > /tmp/wot_dispatch.txt
Implement the Window of Tolerance Monitor tab for Jobble Baby.

## Feature Spec
Create `app/(tabs)/window-of-tolerance.tsx` — a polyvagal theory-based stress/arousal tracking screen for caregiver + infant.

### Core UI
1. **Dual Gauge Display** — Two semi-circular gauges side by side:
   - Left: Infant arousal state (calm → hyperaroused → disorganized)
   - Right: Caregiver arousal state (calm → hyperaroused → dissociated)
   - Colors: Green (window) → Yellow (hyper) → Red (outside window)
   - Tap to log current state

2. **Zone Labels** (i18n):
   - "Window of Tolerance" (green zone)
   - "Hyperarousal" (yellow zone — fight/flight)
   - "Hypoarousal" (blue zone — freeze/collapse)
   - "Dissociation" (grey zone — caregiver only)

3. **Co-Regulation Prompts** — When either gauge is outside window:
   - Show contextual prompt: "Try skin-to-skin contact" / "Take 3 deep breaths"
   - Track co-regulation events over time

4. **Session Log** — List of logged states with timestamps

### Technical
- Use `expo-linear-gradient` for gauge color zones
- Use `useState` for gauge values (no external state management needed)
- i18n keys: windowOfTolerance.* for all text
- Add to TabNavigator: `Window of Tolerance` with icon 🔄
- Register in _layout.tsx
- TSC 0 errors

### Keywords (for implementation)
polyvagal, window-of-tolerance, autonomic-regulation
ULW
TASK

cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
cat /tmp/wot_dispatch.txt"""

# Execute directly
result = subprocess.run(task, shell=True, capture_output=True, text=True)
print(result.stdout)
print(result.stderr)
