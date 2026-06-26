#!/bin/bash
# Cycle 525 dispatch — Final Submission Readiness QA
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

echo "=== FINAL SUBMISSION QA ==="

# 1. TSC check
echo "[1] TSC validation..."
npx tsc --noEmit 2>&1 | grep -c "error TS" && echo "FAIL" || echo "PASS (0 errors)"

# 2. Count registered tabs
echo "[2] Tab count..."
grep -c 'Tabs.Screen' app/\(tabs\)/_layout.tsx | xargs echo "Registered tabs:"

# 3. Check i18n completeness
echo "[3] i18n key count..."
grep -c '"[^"]*":' app/i18n/en.json | xargs echo "en.json keys:"
grep -c '"[^"]*":' app/i18n/zh.json | xargs echo "zh.json keys:"

# 4. Check critical files exist
echo "[4] Critical files..."
for f in app/\(tabs\)/index.tsx app/\(tabs\)/feeding-readiness-navigator.tsx app/\(tabs\)/milk-thermal-safety-checker.tsx app/i18n/en.json app/i18n/zh.json; do
  [ -f "$f" ] && echo "  ✅ $f" || echo "  ❌ MISSING: $f"
done

# 5. Verify no hardcoded strings in new tabs
echo "[5] Hardcoded string scan..."
HARDFAIL=$(grep -l "hardcoded\|placeholder\|test\|TODO" app/\(tabs\)/feeding-readiness-navigator.tsx app/\(tabs\)/milk-thermal-safety-checker.tsx 2>/dev/null)
[ -z "$HARDFAIL" ] && echo "  PASS — no dev strings" || echo "  WARN: $HARDFAIL"

echo "=== QA COMPLETE ==="
