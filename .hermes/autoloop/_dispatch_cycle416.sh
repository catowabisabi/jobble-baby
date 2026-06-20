#!/bin/bash
# Cycle 416 dispatch — Build Pre-Submission QA Checklist Tab (todo #387)

tmux send-keys -t jobble-baby:1.0 C-c
sleep 1

cat << 'PROMPT' | tmux load-buffer -b task416 -
# Task 387 — Build Pre-Submission QA Checklist Tab

## Context

Create a new tab `pre-submission-qa.tsx` in `app/(tabs)/` that runs **automated** checks before App Store / Play Store submission. This is NOT a manual tick-off list — it runs real-time validation and shows a pass/fail matrix with file:line references.

The tab must check:
1. **i18n validation**: All `t('...')` keys used in `.tsx` files exist in BOTH `app/i18n/en.json` AND `app/i18n/zh.json`
2. **Hardcoded string detection**: Scan `.tsx` files for strings rendered directly (not via `t()`) that should be internationalized
3. **App Store metadata**: Verify `app.json` has required fields (bundleId, version, name)
4. **EAS build artifact confirmation**: Check that `android/app/build` and `ios/` directories exist (mark as SKIP if not built yet)

## Files to Create/Modify

1. `app/(tabs)/pre-submission-qa.tsx` — NEW file
2. `app/(tabs)/_layout.tsx` — add tab entry
3. `app/i18n/en.json` — add keys for the tab UI
4. `app/i18n/zh.json` — add Chinese translations

## Tab Implementation Requirements

- Import and use `useLanguage`, `useTheme` from existing contexts
- Use `COLORS` from `../theme`
- On component mount: run all 4 checks and store results in state
- Display each check as a section with:
  - Check name (e18n validation / hardcoded strings / metadata / build artifacts)
  - PASS ✅ or FAIL ❌ badge
  - List of issues with `file:line — description` for each FAIL
- "Re-run checks" button to re-execute validation on demand
- For i18n validation: parse all `.tsx` files in `app/` recursively, extract `t('key')` calls, verify each key exists in both i18n files
- For hardcoded strings: use a simple regex to find string literals in JSX that are NOT inside `t()` calls (rough heuristic is fine)
- For metadata: read `app.json` and check `expo.ios.bundleIdentifier`, `expo.android.package`, `expo.name` exist

## i18n Keys to Add

Add to `en.json` and `zh.json`:
- `tabs.preSubmissionQa` — "Pre-Submission QA"
- `preSubmissionQa.title` — "Pre-Submission QA"
- `preSubmissionQa.runChecks` — "Run Checks"
- `preSubmissionQa.i18nCheck` — "i18n Validation"
- `preSubmissionQa.hardcodedCheck` — "Hardcoded Strings"
- `preSubmissionQa.metadataCheck` — "Metadata Fields"
- `preSubmissionQa.buildCheck` — "Build Artifacts"
- `preSubmissionQa.pass` — "PASS"
- `preSubmissionQa.fail` — "FAIL"
- `preSubmissionQa.skip` — "SKIP"
- `preSubmissionQa.noIssues` — "No issues found"
- `preSubmissionQa.issuesFound` — "{{count}} issues found"

## Verification

1. `npx tsc --noEmit` → 0 errors
2. Tab appears in tab bar navigation
3. Checks run on mount and display results

## Output

Save work log to: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response_414.txt

ULW
PROMPT

tmux paste-buffer -t jobble-baby:1.0
echo "Dispatched cycle 416"
