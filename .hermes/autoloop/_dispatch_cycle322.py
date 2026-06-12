cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

# Task: Write Concept Spec -- HRV Co-Regulation Monitor

## Background
We brainstormed a new feature: HRV Co-Regulation Monitor (concept #77).
Write a proper spec document at docs/concepts/hrv-co-regulation-monitor.md

## Your Task
Write a comprehensive concept spec including:
1. Problem: Parent-baby stress synchronization -- both can trigger each other's dysregulation
2. Solution: HRV (heart rate variability) correlation tracking using phone camera (photoplethysmography) or manual entry
3. Features:
   - HRV measurement: phone camera pulse reading OR manual entry (heart rate + HRV score)
   - Dual tracking: parent HRV + baby HRV side by side
   - Correlation graph: show HRV trend lines over time (7-day rolling)
   - Co-regulation prompts: when both HRV drops simultaneously, suggest co-regulation activities
   - Activities library: skin-to-skin, slow breathing (4-7-8), singing, rocking, mirroring
   - Polyvagal state inference: based on HRV patterns, infer autonomic state (ventral vagal, sympathetic, dorsal vagal)
   - Alert thresholds: configurable -- alert if HRV < threshold for > X minutes
4. Technical: new tab hrv-monitor.tsx, AsyncStorage key @jobble/hrv_entries, i18n keys hrvMonitor.*
5. Links: connects to window-of-tolerance tab (conceptual), stress-cascade tab
6. Mock data: provide realistic seed data for 7 days of entries

## Output
Write to: docs/concepts/hrv-co-regulation-monitor.md
Format: Markdown with proper heading hierarchy, feature list, technical spec section.

## Constraints
- Stay within the JobbleBaby subdirectory
- TSC must pass after any code changes (npx tsc --noEmit)
- i18n keys added to en.json + zh.json
- No user accounts / backend -- all local storage only

Start!
ULW
