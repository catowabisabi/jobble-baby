Fix AsyncStorage key naming convention across all tab files.

GOAL: Ensure all AsyncStorage keys use @jobble/ prefix consistently.

STEP 1 — Audit current keys
Run this in JobbleBaby/:
  grep -rn "AsyncStorage" app/\(tabs\)/ --include="*.tsx" | grep "getItem\|setItem\|removeItem"

STEP 2 — Create/update store/storage-keys.ts
If store/storage-keys.ts exists: add any missing keys
If it doesn't exist: create it with ALL @jobble/ keys used across the app

Format:
  export const STORAGE_KEYS = {
    // Tracking
    THERMAL_READINGS: '@jobble/thermal_readings',
    BROWN_FAT_SESSIONS: '@jobble/brown_fat_sessions',
    // ... all other keys
  } as const;

STEP 3 — Update all tab files to use STORAGE_KEYS constants
Replace hardcoded '@jobble/...' strings with STORAGE_KEYS.X values.

STEP 4 — Verify TSC
  cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby && npx tsc --noEmit
Must pass 0 errors.

Write DONE to stdout when complete.
ULW