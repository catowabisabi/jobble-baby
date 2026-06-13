Fix AsyncStorage key naming convention across all tab files.

GOAL: Ensure all AsyncStorage keys use @jobble/ prefix consistently. Create store/storage-keys.ts central constants file.

STEP 1 — Audit current keys
Run in JobbleBaby/:
grep -rn "AsyncStorage" app/\(tabs\)/ --include="*.tsx" | grep "getItem\|setItem\|removeItem" | grep "@jobble/" | head -60

STEP 2 — Create store/storage-keys.ts
mkdir -p /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/store/
File: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby/store/storage-keys.ts
export const STORAGE_KEYS = {
  // Add all discovered keys here
} as const;

STEP 3 — Update all tab files to use STORAGE_KEYS constants
Replace hardcoded '@jobble/...' strings with STORAGE_KEYS.X values.

STEP 4 — Verify TSC
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby && npx tsc --noEmit
Must pass 0 errors.

Write DONE to stdout when complete.
