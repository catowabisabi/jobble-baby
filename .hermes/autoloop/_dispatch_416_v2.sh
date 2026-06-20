#!/bin/bash
# Dispatch task 387 to Sisyphus via opencode run command

TASK_FILE="/tmp/task_387_opencode.sh"

cat > "$TASK_FILE" << 'TASKEOF'
opencode run "# Task 387 — Build Pre-Submission QA Checklist Tab

## Context

Create a new tab pre-submission-qa.tsx in app/(tabs)/ that runs automated checks before App Store / Play Store submission. This is NOT a manual tick-off list — it runs real-time validation and shows a pass/fail matrix with file:line references.

The tab must check:
1. i18n validation: All t() keys used in .tsx files exist in BOTH app/i18n/en.json AND app/i18n/zh.json
2. Hardcoded string detection: Scan .tsx files for strings rendered directly (not via t()) that should be internationalized
3. App Store metadata: Verify app.json has required fields (bundleId, version, name)
4. EAS build artifact confirmation: Check that android/app/build and ios/ directories exist (SKIP if not built yet)

## Files to Create/Modify

1. app/(tabs)/pre-submission-qa.tsx — NEW file
2. app/(tabs)/_layout.tsx — add tab entry
3. app/i18n/en.json — add keys for the tab UI
4. app/i18n/zh.json — add Chinese translations

## Tab Implementation

- Import and use useLanguage, useTheme from existing contexts
- Use COLORS from ../theme
- On mount: run all 4 checks and store results in state
- Display each check as a section with PASS or FAIL badge and issue list
- Re-run checks button to re-execute validation
- For i18n: parse all .tsx files, extract t() calls, verify keys exist in both i18n files
- For hardcoded strings: use simple regex to find string literals NOT inside t() calls
- For metadata: read app.json and check required fields exist
- For build artifacts: check android/app/build and ios/ exist, SKIP if not found

## i18n Keys to Add

Add to en.json and zh.json:
- tabs.preSubmissionQa — Pre-Submission QA
- preSubmissionQa.title — Pre-Submission QA
- preSubmissionQa.runChecks — Run Checks
- preSubmissionQa.i18nCheck — i18n Validation
- preSubmissionQa.hardcodedCheck — Hardcoded Strings
- preSubmissionQa.metadataCheck — Metadata Fields
- preSubmissionQa.buildCheck — Build Artifacts
- preSubmissionQa.pass — PASS
- preSubmissionQa.fail — FAIL
- preSubmissionQa.skip — SKIP
- preSubmissionQa.noIssues — No issues found
- preSubmissionQa.issuesFound — {{count}} issues found

## Verification

1. npx tsc --noEmit → 0 errors
2. Tab appears in tab bar navigation
3. Checks run on mount and display results

## Output

Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_414.txt
"
TASKEOF

chmod +x "$TASK_FILE"
echo "Task written to $TASK_FILE"
