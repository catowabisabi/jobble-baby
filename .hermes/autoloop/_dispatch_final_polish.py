#!/usr/bin/env python3
"""
Dispatch for Sisyphus — Final Pre-Submission Polish
Cycle 305 dispatch
"""

task = """# Final Pre-Submission Polish — Sisyphus Task

## Context
Jobble Baby app is feature-complete (69 tabs, TSC 0 errors, pre-submission audit PASS).
Only pending item is #108: deploy privacy policy to jobblebaby.com/privacy (user action required).
Your job: ensure the privacy policy HTML is complete and ready, and do a final i18n sanity check.

## Tasks

### 1. Privacy Policy HTML Audit
Check that the privacy policy HTML at `privacy-policy/` (or wherever it lives) includes ALL required sections:
- Data collection (tracking, analytics)
- Camera/photo access usage
- Data storage and retention
- Third-party sharing (Expo, Sentry, etc.)
- Children's data (COPPA compliance)
- Parent rights (access, deletion, correction)
- Contact info placeholder (email/URL to fill in)
- Effective date placeholder

If any section is missing or placeholder text remains, add proper content using the app's i18n keys where appropriate.

### 2. i18n Key Consistency Check
Run a quick sanity check on the i18n files:
- Count total keys in en.json and zh.json — they should match
- Check for any orphan keys (keys in zh.json not in en.json or vice versa)
- Verify key naming consistency (no typos in key names)
- Report findings in sisyphus_response.txt

### 3. Verify All 69 Tabs in _layout.tsx
Run this check:
```bash
cd JobbleBaby
grep -c "name=" app/(tabs)/_layout.tsx
```
Should return 69 tab entries.

### 4. Check for console.log / debug statements
```bash
grep -r "console.log" app/ --include="*.tsx" | wc -l
```
Should return 0.

## Rules
- Do NOT modify any tab components (all 69 are complete and working)
- Only audit/fix privacy-policy HTML and i18n files
- TSC must still pass 0 errors after any changes
- Report findings in .hermes/autoloop/sisyphus_response.txt

## Keywords
privacyPolicyHTML, i18nConsistency, preSubmissionCheck, privacyPolicyReady, COPPACompliance

ULW
"""

with open('/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt', 'w') as f:
    f.write(task)

print("Dispatch written to sisyphus_task.txt")