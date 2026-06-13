# Task: Fix Hardcoded i18n Strings in interoceptive.tsx + reflex-visual-motor.tsx
# Todo #132
# Keywords: interoceptive_body_scan, diary_consistency, hrv_reaction_notes, reflex_status_picker, visual_motor_score

GOAL: Replace all hardcoded English strings with i18n t() calls in two files.

STEP 1 — Fix interoceptive.tsx hardcoded strings
File: JobbleBaby/app/(tabs)/interoceptive.tsx
Hardcoded strings to replace with i18n:
- Line 352: "Duration:" → t('interoceptive.duration')
- Line 369: "Recent Sessions" → t('interoceptive.recentSessions')
- Line 413: "Diary consistency" → t('interoceptive.diaryConsistency')
- Line 421: "Body scan engagement" → t('interoceptive.bodyScanEngagement')
- Line 459: "Baby age (months):" → t('interoceptive.babyAgeMonths')
- Line 483: "Reaction:" → t('interoceptive.reaction')
- Line 494: "Notes:" → t('interoceptive.notes')
- Line 556: "Complete HRV Entry" → t('interoceptive.completeHrvEntry')
- Line 580: "Save Session" → t('interoceptive.saveSession')
- Line 585: "Cancel" → t('common.cancel')
- Line 668: "Save Entry" → t('common.save')
- Line 671: "Cancel" → t('common.cancel')
- Line 695: "What actually resolved it?" → t('interoceptive.whatResolvedIt')
- Line 709: "Submit" → t('common.submit')
- Line 712: "Cancel" → t('common.cancel')

STEP 2 — Fix reflex-visual-motor.tsx hardcoded strings
File: JobbleBaby/app/(tabs)/reflex-visual-motor.tsx
Hardcoded strings to replace with i18n:
- Line 202: "Reflex Status" → t('reflex.reflexStatus')
- Line 215: "Cancel" → t('common.cancel')
- Line 216: "Save" → t('common.save')
- Line 228: "Visual-Motor Score" → t('visual.visualMotorScore')
- Line 231: "Quality Score (1-5)" → t('visual.qualityScore')

STEP 3 — Add missing i18n keys
If keys don't exist in i18n/en.json and i18n/zh.json, add them:
- interoceptive.duration, interoceptive.recentSessions, interoceptive.diaryConsistency
- interoceptive.bodyScanEngagement, interoceptive.babyAgeMonths, interoceptive.reaction
- interoceptive.notes, interoceptive.completeHrvEntry, interoceptive.saveSession
- interoceptive.whatResolvedIt
- reflex.reflexStatus
- visual.visualMotorScore, visual.qualityScore

STEP 4 — Verify
- npx tsc --noEmit (0 errors)
- node scripts/pre-submission-audit.js (HardcodedStrings check PASS)

DONE
ULW