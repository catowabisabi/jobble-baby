#!/bin/bash
# Dispatch cycle 444 — Idea #84: Co-regulation Resonance Tracker
tmux send-keys -t jobble-baby:0.0 C-c
sleep 2
tmux send-keys -t jobble-baby:0.0 "cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby" Enter
sleep 1
tmux send-keys -t jobble-baby:0.0 "cat > /tmp/task_391.txt << 'TASK_EOF'
# Idea #84: Co-regulation Resonance Tracker
# Keywords: co-regulation_resonance, hrv_sync_pattern, autonomic_coupling, cortisol_diary_correlation, vagal_breakpoint

## Task for Sisyphus

Create a new tab \`coregulation-resonance.tsx\` implementing a co-regulation resonance tracker.

STEP 1 — Read these files first:
- JobbleBaby/app/(tabs)/_layout.tsx (for tab registration pattern)
- JobbleBaby/app/(tabs)/autonomic-readiness.tsx (for similar physiological metric style)
- JobbleBaby/app/(tabs)/window-of-tolerance.tsx (for stress/cortisol tracking UX)
- JobbleBaby/i18n/en.json and zh.json (for i18n key structure)

STEP 2 — Create \`JobbleBaby/app/(tabs)/coregulation-resonance.tsx\`
Design:
- SafeAreaView + ScrollView, themed (COLORS, useLanguage, useTheme)
- Header: \"Co-Regulation\" (i18n key: coregulationResonance.title)

SECTION A — Session Logger
- Quick-log a co-regulation session:
  - Duration picker (5/10/15/20/30 min)
  - Parent HR input (manual entry: resting HR in BPM)
  - Baby HR input (manual entry)
  - Activity type: { holding, feeding, play, soothing, nappy-change }
  - Quality rating: 1-5 stars
  - Notes field
- Save to AsyncStorage @jobble/coregulation_session_log

SECTION B — Co-Regulation Index
- Calculate composite \"Co-Regulation Resonance Score\" (0-100):
  - Base: HR proximity (parent HR / baby HR ratio closer to 1 = better)
  - Bonus: longer sessions, consistent logging
  - Display as large number with trend arrow (up/down/stable)
- 7-day rolling average chart (bar or line)

SECTION C — Stress Correlation Panel
- Show \"Cortisol Spillover Risk\" indicator:
  - If parent logs HR > 100 BPM in 3+ sessions in a week → amber alert
  - If parent logs HR > 110 BPM in 5+ sessions → red alert
- Alert message (i18n): \"Parent stress chronically elevated — consider self-care break\"

SECTION D — HRV Sync Log
- List of recent sessions with:
  - Date/time, duration, activity, parent HR, baby HR, rating
  - HR ratio displayed (e.g., \"HR ratio: 0.87\" meaning baby's HR is 87% of parent's)
- Tap to expand → full notes

SECTION E — Vagal Tone Benchmark
- Simple benchmark card showing:
  - Baby's age-appropriate vagal tone indicators (based on concept: vagal_breakpoint)
  - \"Signs of strong vagal tone\": calm breathing, quick soothe recovery, eye contact duration > 30s
  - Display as a checklist with 3 items

DATA: Use AsyncStorage for all session data. Mock data array for demo if storage is empty.

STEP 3 — Add i18n keys
Add to en.json and zh.json:
- coregulationResonance.title, subtitle
- coregulationResonance.sectionA.* (session logger labels)
- coregulationResonance.sectionB.* (index labels, trend)
- coregulationResonance.sectionC.* (stress alert messages)
- coregulationResonance.sectionD.* (session log labels)
- coregulationResonance.sectionE.* (vagal benchmark)
- coregulationResonance.activity.*, quality.*

STEP 4 — Register in _layout.tsx
Add Tabs.Screen entry for coregulation-resonance after autonomic-readiness.
Icon: heart-pulse (MaterialCommunityIcons)

STEP 5 — Verify
- TSC: npx tsc --noEmit → 0 errors

Do NOT run npm install or modify package.json.

ULW
TASK_EOF" Enter
sleep 1
tmux send-keys -t jobble-baby:0.0 "cat /tmp/task_391.txt | head -5" Enter
echo "Dispatch script written"