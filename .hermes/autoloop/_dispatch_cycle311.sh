#!/bin/bash
# Dispatch Cycle 311 — Fix jaundice.tsx risk chart hardcoded strings (todo #126)

set -e

REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
AUDIT_JS="$REPO/../scripts/pre-submission-audit.js"

echo "=== Cycle 311: Fix jaundice.tsx risk chart hardcoded strings ==="

# 1. Read jaundice.tsx lines 290-310 to understand the risk chart string array
echo "--- Reading jaundice.tsx risk chart section ---"
sed -n '290,310p' "$REPO/app/(tabs)/jaundice.tsx"

echo ""
echo "--- Adding i18n keys to en.json ---"
python3 -c "
import json

# Add keys to en.json
with open('$REPO/app/i18n/en.json', 'r') as f:
    en = json.load(f)
en['jaundice.riskChartWhoNice'] = 'Risk Chart (WHO/NICE)'
en['jaundice.medium'] = 'Medium'
en['jaundice.high'] = 'High'
with open('$REPO/app/i18n/en.json', 'w') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)

# Add keys to zh.json
with open('$REPO/app/i18n/zh.json', 'r') as f:
    zh = json.load(f)
zh['jaundice.riskChartWhoNice'] = '風險圖 (WHO/NICE)'
zh['jaundice.medium'] = '中等'
zh['jaundice.high'] = '高'
with open('$REPO/app/i18n/zh.json', 'w') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)

print('i18n keys added: jaundice.riskChartWhoNice, jaundice.medium, jaundice.high')
"

echo ""
echo "--- Patching jaundice.tsx risk chart strings ---"
# Replace hardcoded strings in the risk chart section
# Line 296: "Risk Chart (WHO/NICE)"
sed -i "s/\"Risk Chart (WHO\/NICE)\"/t('jaundice.riskChartWhoNice')/g" "$REPO/app/(tabs)/jaundice.tsx"
# Lines 302-303: "Medium" and "High" in risk threshold array
sed -i "s/\"Medium\"/t('jaundice.medium')/g" "$REPO/app/(tabs)/jaundice.tsx"
sed -i "s/\"High\"/t('jaundice.high')/g" "$REPO/app/(tabs)/jaundice.tsx"

echo "--- Verifying TSC ---"
cd "$REPO" && npx tsc --noEmit && echo "TSC: PASS" || echo "TSC: FAIL"

echo ""
echo "--- Running pre-submission audit ---"
cd "$REPO"
node "$AUDIT_JS" 2>/dev/null | grep -E "^\[|Audit|TSC|HardcodedStrings"

echo ""
echo "=== Cycle 311 Complete ==="