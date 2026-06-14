#!/bin/bash
# Dispatch #352 — Fix 74 missing i18n tab keys
# Hermes → Sisyphus

set -e
REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JOBBLE="$REPO/JobbleBaby"
AUTOLOOP="$REPO/.hermes/autoloop"

TASK_FILE="$AUTOLOOP/sisyphus_task_352.txt"
DISPATCH_FILE="$AUTOLOOP/_dispatch_352.sh"
PROMPT3_FILE="$AUTOLOOP/_prompt3_352.txt"

# Keywords
KEYWORDS="i18n_missing_keys,tab_labels,en_json,zh_json,audit_fix"

# Generate prompt3
cd "$REPO" && python3 -c "
import subprocess
result = subprocess.run(['python3', '$AUTOLOOP/loop_routine.py', 'prompt3'], capture_output=True, text=True)
print(result.stdout.strip())
" > "$PROMPT3_FILE" 2>&1 || echo "prompt3_failed"

echo "Keywords: $KEYWORDS"
echo "prompt3: $(cat $PROMPT3_FILE 2>/dev/null || echo 'unavailable')"

cat > "$TASK_FILE" << 'TASK_END'
# Todo #352: Fix i18n audit — add 74 missing tab keys to en.json + zh.json
# Keywords: i18n_missing_keys, tab_labels, en_json, zh_json, audit_fix

## Context
Audit script (scripts/pre-submission-audit.js) found 74 i18n keys referenced in 
_layout.tsx that are MISSING from both en.json and zh.json.

## Your Goal
Add all missing i18n keys to both language files so the audit passes with 0 errors.

## STEP 1 — Generate the complete list of missing keys

Run this comparison in JobbleBaby/:
```bash
cd JobbleBaby
grep -oP "t\('[^']+'\)" app/\(tabs\)/_layout.tsx | sed "s/t('//;s/')$//" | sort -u > /tmp/layout_keys.txt
grep -oP "\"(\w+)\"" app/i18n/en.json | tr -d '"' | sort -u > /tmp/en_keys.txt
comm -23 /tmp/layout_keys.txt /tmp/en_keys.txt > /tmp/missing_keys.txt
cat /tmp/missing_keys.txt
```

The missing keys include:
- 69 tabs.xxx keys (e.g. tabs.home, tabs.growth, tabs.allergens, etc.)
- 5 non-tabs.* keys: galantLatch.title, interoceptive.tabTitle, regulatory_fitness.tab, thermalMetabolic.tab, windowOfTolerance.tab

## STEP 2 — Read the i18n structure

Look at the existing keys in app/i18n/en.json under "tabs": {}. 
Notice the pattern: tabs.home = "Home", tabs.allergens = "Allergens", etc.

For non-tabs.* keys, add them at the TOP LEVEL of the JSON (not under "tabs").
Example: "windowOfTolerance": { "tab": "Window of Tolerance" }

## STEP 3 — Add missing keys to en.json

For each missing tabs.xxx key → add under "tabs": {} with a readable English label.
For non-tabs.* keys → add at JSON root level with appropriate sub-keys.

Use Title Case for tab labels. Derive the label from the key name:
- tabs.home → "Home"
- tabs.growthMontage → "Growth Montage"
- tabs.eightMonthStorm → "Eight-Month Storm"
- galantLatch.title → under "galantLatch": { "title": "Galant + Latch" }
- windowOfTolerance.tab → under "windowOfTolerance": { "tab": "Window of Tolerance" }

## STEP 4 — Add missing keys to zh.json

Add the SAME keys to zh.json with Traditional Chinese translations.
Use the same structure as en.json. Ask yourself: what would a Cantonese-speaking
parent call this tab? (Use 粵語/Cantonese for common terms, 國語 for medical terms)

Example translations:
- tabs.home → "主頁"
- tabs.growth → "成長"
- tabs.sleepTraining → "睡眠訓練"
- windowOfTolerance.tab → "容忍窗口"

## STEP 5 — Also fix the console.error in procedure-recovery.tsx

Remove the console.error on line 84:
`} catch (e) { console.error('loadAll error', e); }`
Replace with: `} catch (_) { /* silent fail */ }`

## STEP 6 — Verify

```bash
cd JobbleBaby
npx tsc --noEmit
node scripts/pre-submission-audit.js
```

Audit should show: i18n Keys: PASS

## STEP 7 — Commit

```bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
git add -A
git commit -m "fix(i18n): add 74 missing tab labels to en.json and zh.json"
git push
```

DONE
ULW
TASK_END

echo "Task written to $TASK_FILE"
echo "---"
cat "$TASK_FILE" | head -20