#!/usr/bin/env python3
"""Dispatch cycle 345 — Fix hardcoded i18n strings in procedure-recovery.tsx"""
import subprocess, sys

prompt = r"""# Todo #345: Fix Hardcoded i18n Strings in procedure-recovery.tsx
# Status: DISPATCHED
# Keywords: sympathetic_activation_threshold, feeding_posture_fluid_mechanics, glucose_curve

## Task for Sisyphus

Fix hardcoded string arrays in `JobbleBaby/app/(tabs)/procedure-recovery.tsx`.

---

### STEP 1 — Identify Hardcoded Strings

Lines 28-30 contain hardcoded string arrays used as picker/selector options:

```tsx
const PROCEDURE_TYPES = ['frenotomy', 'frenulectomy', 'ear_tubes', 'hernia_repair', 'other'];
const HEALING_STATUSES = ['normal', 'mild_swelling', 'infection_signs', 'bleeding', 'other'];
const BOTTLE_OPTIONS = ['accept', 'partial', 'refuse'];
```

Also check if these arrays are used in any Picker, Select, or TouchableOpacity components.

---

### STEP 2 — Add i18n Keys

Add to `JobbleBaby/app/i18n/en.json` AND `JobbleBaby/app/i18n/zh.json`:

```json
"procedureRecovery": {
  "procedureTypes": { "frenotomy": "Frenotomy/Tongue-tie release", "frenulectomy": "Frnulectomy", "ear_tubes": "Ear tubes", "hernia_repair": "Hernia repair", "other": "Other" },
  "healingStatuses": { "normal": "Normal healing", "mild_swelling": "Mild swelling", "infection_signs": "Signs of infection", "bleeding": "Bleeding", "other": "Other" },
  "bottleOptions": { "accept": "Accepts fully", "partial": "Partial acceptance", "refuse": "Refuses" }
}
```

(Add Chinese translations in zh.json — use appropriate Chinese medical terms)

---

### STEP 3 — Update procedure-recovery.tsx

Replace the hardcoded arrays with i18n lookups:

```tsx
const PROCEDURE_TYPES = [
  { value: 'frenotomy', label: t('procedureRecovery.procedureTypes.frenotomy') },
  { value: 'frenulectomy', label: t('procedureRecovery.procedureTypes.frenulectomy') },
  { value: 'ear_tubes', label: t('procedureRecovery.procedureTypes.ear_tubes') },
  { value: 'hernia_repair', label: t('procedureRecovery.procedureTypes.hernia_repair') },
  { value: 'other', label: t('procedureRecovery.procedureTypes.other') },
];
```

Similarly for HEALING_STATUSES and BOTTLE_OPTIONS.

Update any Picker/Select components to use the label field from these arrays.

---

### STEP 4 — Verify

- `npx tsc --noEmit` — must be 0 errors
- Run audit: `node scripts/pre-submission-audit.js`

---

DONE
ULW"""
with open("/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/_dispatch_cycle345.py", "w") as f:
    f.write(prompt)

# Write shell dispatch
shell = r"""#!/bin/bash
cat > /tmp/sisyphus_task.txt << "EOF"
# Todo #345: Fix Hardcoded i18n Strings in procedure-recovery.tsx
# Keywords: sympathetic_activation_threshold, feeding_posture_fluid_mechanics, glucose_curve
# Status: DISPATCHED

Fix hardcoded string arrays in procedure-recovery.tsx lines 28-30:
- PROCEDURE_TYPES: frenotomy, frenulectomy, ear_tubes, hernia_repair, other
- HEALING_STATUSES: normal, mild_swelling, infection_signs, bleeding, other
- BOTTLE_OPTIONS: accept, partial, refuse

Add i18n keys procedureRecovery.procedureTypes.*, procedureRecovery.healingStatuses.*, procedureRecovery.bottleOptions.* to en.json + zh.json.
Replace hardcoded arrays with i18n-aware objects with value/label pairs.
Verify: tsc --noEmit + audit.

DONE
ULW
EOF
tmux send-keys -t jobble-baby C-c C-c
tmux send-keys -t jobble-baby "cat > /tmp/sisyphus_task.txt << 'EOF'" Enter
# Will be sent via paste-buffer approach
"""
with open("/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/_dispatch_cycle345.sh", "w") as f:
    f.write(shell)

# Create todo in DB
import sqlite3
db = "/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/progress.db"
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("""
  INSERT OR IGNORE INTO todos (id, title, description, status, priority, created_at)
  VALUES (345, 'Fix hardcoded i18n strings in procedure-recovery.tsx',
    'i18n PROCEDURE_TYPES, HEALING_STATUSES, BOTTLE_OPTIONS arrays in procedure-recovery.tsx lines 28-30. Add keys to en.json + zh.json.',
    'pending', 1, '2026-06-14 00:01:00')
""")
conn.commit()
conn.close()
print("Dispatch cycle 345 prepared")
