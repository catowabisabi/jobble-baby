#!/bin/bash
# Cycle 514 — Dispatch #408 Milk Thermal Safety Checker
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

opencode --input << 'EOF'
# Task #408 — Implement Milk Thermal Safety Checker

## Context
Painpoint #38: Milk temperature safety gap — no tracking of milk warming temperature and post-warming safe duration.
Concept #64: Milk Thermal Safety Checker — track breast milk warming sessions with temperature targets (37°C body-temperature equivalent), max safe duration timers, and warming method guide.

## Your Job

### STEP 1 — Create new tab: milk-thermal-safety-checker.tsx
Path: `JobbleBaby/app/(tabs)/milk-thermal-safety-checker.tsx`

This tab monitors breast milk warming sessions. It should:

1. **Warming Method Selector** — Choose from: Bottle Warmer, Warm Water Bath, Ambient Warming
2. **Temperature Target Display** — Show 37°C as the body-temperature equivalent target
3. **Duration Timer** — Countdown from max safe duration (depends on method):
   - Bottle Warmer: 5 min max
   - Warm Water Bath: 10 min max  
   - Ambient: 20 min max
4. **Temperature Input** — Manual entry or simulated sensor input for current milk temp
5. **Safety Alerts** — Visual alert when:
   - Milk exceeds 40°C (nutrients at risk)
   - Milk below 36°C (too cold)
   - Post-warming countdown expired (milk should be used within 2 hours of warming start)
6. **Expiry Tracking** — Thawed milk: use within 24 hours of thaw. Track thaw time separately.
7. **Mastitis Prevention Guidance** — Warning: "Never reheat milk more than once"

### STEP 2 — Add i18n keys
Read `en.json` and `zh.json` first. Add all UI strings under `"milkThermalSafety"` key.
Include: method names, timer labels, alert messages, guidance text.

### STEP 3 — Register tab
Read `_layout.tsx` to find the tab registration pattern.
Add `milk-thermal-safety-checker` to the tabs array. Use `Zap` icon (like other utility tabs).

### STEP 4 — Storage keys
Read `store/storage-keys.ts`. Add `MILK_WARMING_SESSION: "@jobble/milk_warming_session"` if not present.

### STEP 5 — Verify
- `npx tsc --noEmit` → 0 errors
- Git: `git add -A && git commit -m "feat: add Milk Thermal Safety Checker tab (#408)"` → push

## Important
- Do NOT use ultraworker mode — just implement directly
- Mock data is fine for temperature sensors
- Keep the UI clean and readable (parent-facing app)
- Do NOT run npm install

ULW
EOF
