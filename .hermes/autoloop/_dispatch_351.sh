#!/bin/bash
# Dispatch cycle 351 — Todo #351: Fix eight-month-storm.tsx i18n
set -e
PROJECT="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby"
JB="$PROJECT/JobbleBaby"
AUTOLOOP="$PROJECT/.hermes/autoloop"

# Write task content to task file
cat > "$AUTOLOOP/sisyphus_task_351.txt" << 'TASK_END'
# Todo #351: Fix eight-month-storm.tsx i18n — convert language===zh conditionals to t() keys
# Keywords: eight_month_storm, i18n, language_conditional, zh_hardcoded, t_function

## Task for Sisyphus

eight-month-storm.tsx uses 20+ language === zh hardcoded string conditionals instead of i18n t() keys.

STEP 1 — Identify all hardcoded strings
Find ALL occurrences of language === 'zh' ? '...' : '...' in the file. Each ternary has two strings — English and Chinese.

STEP 2 — Create i18n key names
For each hardcoded string, derive a t('eightMonthStorm.xxx') key. Example:
- language === 'zh' ? '發育時間線' : 'Convergence Timeline' → t('eightMonthStorm.convergenceTimeline')
- language === 'zh' ? '風暴區 (7-9個月)' : 'Storm Zone (7-9mo)' → t('eightMonthStorm.stormZone')

STEP 3 — Replace all hardcoded strings
Replace every language === 'zh' ? 'zh_string' : 'en_string' with t('eightMonthStorm.xxx').

STEP 4 — Add keys to en.json and zh.json
In JobbleBaby/app/i18n/en.json and JobbleBaby/app/i18n/zh.json, add all new keys under "eightMonthStorm": { ... }.

STEP 5 — Verify
cd JobbleBaby && npx tsc --noEmit — must pass 0 errors.

STEP 6 — Commit
git add + commit: "fix(i18n): convert eight-month-storm.tsx language conditionals to t() keys"
DONE
ULW
TASK_END

echo "Task written"
