#!/usr/bin/env python3
"""Dispatch cycle 356: Development Radar tab (todo #353 retry)"""
import subprocess, time

SESSION = "jobble-baby"
REPO = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB = f"{REPO}/JobbleBaby"
AUTOLOOP = f"{REPO}/.hermes/autoloop"

TASK = f"""# Idea #77: Development Radar — Holistic Growth Visualization
# Keywords: thermal_conduction_skin_contact, state_co_regulation, latch_asymmetry_heatmap

## Task for Sisyphus

Create a new tab `development-radar.tsx` showing a radar chart of baby development across 4 axes.

STEP 1 — Read these files first:
- JobbleBaby/app/(tabs)/_layout.tsx (for tab registration pattern)
- JobbleBaby/app/(tabs)/village-network.tsx (for card-based layout style reference)
- JobbleBaby/i18n/en.json and zh.json (for i18n key structure)

STEP 2 — Create JobbleBaby/app/(tabs)/development-radar.tsx
Design:
- SafeAreaView + ScrollView, themed (COLORS, useLanguage, useTheme)
- Header: label + title + subtitle (all i18n)

SECTION A — Radar Chart
- Simulate a 4-axis radar/spider chart using React Native Views
- 4 axes: Motor, Language/Social, Feeding, Sleep
- Each axis has a value 0-100 driven by mock data
- Semi-transparent colored fill, axis lines in C.accent
- Axis labels using t() keys

SECTION B — Axis Detail Cards
- 4 cards below the radar, one per axis
- Each card: axis name, current score (0-100), trend indicator, brief description
- Use t() keys: developmentRadar.axis.{motor,language,feeding,sleep}.title + desc

SECTION C — Recent Milestones Feed
- List 3 mock recent milestones with emoji, title, date
- Style: card per milestone, most recent first

DATA: Use mock data arrays at top of file. No AsyncStorage needed for MVP.

STEP 3 — Add i18n keys
Add to en.json and zh.json:
- developmentRadar.label, title, subtitle
- developmentRadar.axis.{motor,language,feeding,sleep}.title, desc, score
- developmentRadar.milestone.* (for recent milestones)
- developmentRadar.trend.{up,down,stable}

STEP 4 — Register in _layout.tsx
Add Tabs.Screen entry for development-radar after village-network tab.
Icon: chart-radar or chart icon from MaterialCommunityIcons.

STEP 5 — Verify
- TSC: npx tsc --noEmit (0 errors)
- Do NOT run npm install or modify package.json

Report what you created.

ULW"""

# Write task to tmp file
task_file = f"{AUTOLOOP}/sisyphus_task_356.txt"
with open(task_file, "w") as f:
    f.write(TASK)

print(f"Task written to {task_file}")

# Interrupt current process
subprocess.run(["tmux", "send-keys", "-t", SESSION, "C-c"], capture_output=True)
time.sleep(2)

# Clear any error state
subprocess.run(["tmux", "send-keys", "-t", SESSION, "Enter"], capture_output=True)
time.sleep(1)

# Send the opencode command
cmd = f"cd {JB} && opencode run --task {task_file} 2>&1 | tee {AUTOLOOP}/sisyphus_response_356.txt"
subprocess.run(["tmux", "send-keys", "-t", SESSION, cmd, "Enter"], capture_output=True)
time.sleep(3)

# Update current_task.txt
with open(f"{AUTOLOOP}/current_task.txt", "w") as f:
    f.write(f"# Cycle 356 — IN PROGRESS\n# Date: 2026-06-15\n# Status: Dispatched development-radar.tsx task (retry #353)\n# Commit: 23fbb5f\n# Dispatched: #353 Development Radar tab (idea #77)\n")

print("Dispatched cycle 356 to jobble-baby")
