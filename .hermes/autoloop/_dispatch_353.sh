#!/bin/bash
# Cycle 353 dispatch — Village Network tab (idea #106 deferred)
set -e

SESSION="jobble-baby"
REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB="$REPO/JobbleBaby"
AUTOLOOP="$REPO/.hermes/autoloop"
TASK_FILE="$AUTOLOOP/sisyphus_task_353.txt"

# Write task to numbered file
cat > "$TASK_FILE" << 'TASK_END'
# Idea #106: Village Network — Peer Parenting Support Matcher
# Keywords: mealtime_negotiation_tactics, sleep-onset_association_fragmentation, state_fluidity

## Task for Sisyphus

Create a new tab `village-network.tsx` implementing a peer parenting support matcher.

STEP 1 — Read these files first:
- JobbleBaby/app/(tabs)/_layout.tsx (for tab registration pattern)
- JobbleBaby/app/(tabs)/index.tsx (for home tab layout style)
- JobbleBaby/i18n/en.json and zh.json (for i18n key structure)

STEP 2 — Create `JobbleBaby/app/(tabs)/village-network.tsx`
Design:
- SafeAreaView + ScrollView, themed (COLORS, useLanguage, useTheme)
- Header: "Village Network" (i18n key: villageNetwork.title)
- Use a card-based layout matching the app's visual style

SECTION A — Support Circle
- List 3 support types with icons:
  - "Feeding Peers" (mealtime negotiation)
  - "Sleep Partners" (sleep regression survival)
  - "Growth Buddies" (developmental milestones)
- Each card shows: icon, title, brief description, "Connect" button

SECTION B — Community Matching Card
- Simulate matching with mock data (3-5 peer parent profiles):
  - Each profile: avatar placeholder, name, baby's age, location (HK/Taiwan/Singapore), common interests
  - Display as horizontal scrollable cards or vertical list

SECTION C — Resource Hub
- 4 quick links:
  - "Find Local Parent Groups" → opens a placeholder deep link
  - "Parenting Hotlines" → shows a list of 3 HK/Taiwan/Singapore helplines with phone numbers (use i18n keys)
  - "La Leche League" → placeholder link
  - "Postpartum Support" → placeholder link

SECTION D — Emergency Contacts
- Quick-dial buttons: 999 (HK Emergency), 119 (Taiwan), 995 (Singapore)
- Styled as emergency banner at bottom

DATA: Use mock data arrays defined at top of file. No AsyncStorage needed for MVP.

STEP 3 — Add i18n keys
Add to en.json and zh.json:
- villageNetwork.title
- villageNetwork.supportCircle.feedingPeers, sleepPartners, growthBuddies (title + description)
- villageNetwork.community.title, connectButton
- villageNetwork.resourceHub.*
- villageNetwork.emergency.*
- Each profile name field: villageNetwork.profile.name, age, location, interests

STEP 4 — Register in _layout.tsx
Add Tabs.Screen entry for village-network after profile tab.

STEP 5 — Verify
- TSC: npx tsc --noEmit → 0 errors
- Audit: run pre-submission-audit.js

Do NOT run npm install or modify package.json. Just create the tab file, add i18n keys, register the tab.

ULW
TASK_END

# Send interrupt to any running process in tmux
tmux send-keys -t "$SESSION" C-c 2>/dev/null || true
sleep 1

# Copy task to /tmp for execution
cp "$TASK_FILE" /tmp/sisyphus_task.txt

# Send to tmux session - write task content
tmux send-keys -t "$SESSION" "cat > /tmp/sisyphus_task_353.sh << 'EOF'" Enter
sleep 1
tmux send-keys -t "$SESSION" "$(cat "$TASK_FILE" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/^/"/' | sed 's/$/"/')" Enter
tmux send-keys -t "$SESSION" "EOF" Enter
sleep 2

# Send the opencode command
tmux send-keys -t "$SESSION" "cd $JB && opencode run --task /tmp/sisyphus_task.txt 2>&1 | tee $AUTOLOOP/sisyphus_response_353.txt" Enter
sleep 2

echo "Dispatched cycle 353 to $SESSION"