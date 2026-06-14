#!/bin/bash
tmux send-keys -t jobble-baby C-c C-c
sleep 1
tmux send-keys -t jobble-baby "cat > /tmp/sisyphus_task.txt << 'EOF'" Enter
sleep 1
tmux send-keys -t jobble-baby '# Todo #345: Fix Hardcoded i18n Strings in procedure-recovery.tsx
# Keywords: sympathetic_activation_threshold, feeding_posture_fluid_mechanics, glucose_curve
# Status: DISPATCHED

Fix hardcoded string arrays in `JobbleBaby/app/(tabs)/procedure-recovery.tsx`.

Lines 28-30:
```tsx
const PROCEDURE_TYPES = ['\''frenotomy'\'', '\''frenulectomy'\'', '\''ear_tubes'\'', '\''hernia_repair'\'', '\''other'\''];
const HEALING_STATUSES = ['\''normal'\'', '\''mild_swelling'\'', '\''infection_signs'\'', '\''bleeding'\'', '\''other'\''];
const BOTTLE_OPTIONS = ['\''accept'\'', '\''partial'\'', '\''refuse'\''];
```

STEP 1 — Add i18n keys to en.json + zh.json:
```json
"procedureRecovery": {
  "procedureTypes": { "frenotomy": "Frenotomy/Tongue-tie release", "frenulectomy": "Frenulectomy", "ear_tubes": "Ear tubes", "hernia_repair": "Hernia repair", "other": "Other" },
  "healingStatuses": { "normal": "Normal healing", "mild_swelling": "Mild swelling", "infection_signs": "Signs of infection", "bleeding": "Bleeding", "other": "Other" },
  "bottleOptions": { "accept": "Accepts fully", "partial": "Partial acceptance", "refuse": "Refuses" }
}
```
(Add Chinese translations in zh.json)

STEP 2 — Update procedure-recovery.tsx:
Replace hardcoded arrays with i18n-aware objects:
```tsx
const PROCEDURE_TYPES = [
  { value: '\''frenotomy'\'', label: t('\''procedureRecovery.procedureTypes.frenotomy'\'') },
  { value: '\''frenulectomy'\'', label: t('\''procedureRecovery.procedureTypes.frenulectomy'\'') },
  { value: '\''ear_tubes'\'', label: t('\''procedureRecovery.procedureTypes.ear_tubes'\'') },
  { value: '\''hernia_repair'\'', label: t('\''procedureRecovery.procedureTypes.hernia_repair'\'') },
  { value: '\''other'\'', label: t('\''procedureRecovery.procedureTypes.other'\'') },
];
```
Similarly for HEALING_STATUSES and BOTTLE_OPTIONS.
Update any Picker/Select components to use the label field.

STEP 3 — Verify:
- npx tsc --noEmit → 0 errors
- node scripts/pre-submission-audit.js

DONE
ULW' Enter
sleep 1
tmux send-keys -t jobble-baby 'EOF' Enter
sleep 1
tmux send-keys -t jobble-baby 'bash /tmp/sisyphus_task.txt' Enter
