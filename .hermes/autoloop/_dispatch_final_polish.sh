#!/bin/bash
# Sisyphus dispatch script - Final Pre-Submission Polish
# Reads task from sisyphus_task.txt and executes

TASK_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_task.txt"
RESPONSE_FILE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/sisyphus_response.txt"
PROJECT_DIR="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"

echo "=== Sisyphus Final Polish Dispatch ===" > "$RESPONSE_FILE"
date >> "$RESPONSE_FILE"
echo "" >> "$RESPONSE_FILE"

# Task 1: Privacy Policy HTML Audit
echo "=== Privacy Policy HTML Audit ===" >> "$RESPONSE_FILE"
privacy_dir="$PROJECT_DIR/privacy-policy"
if [ -d "$privacy_dir" ]; then
    echo "Privacy policy directory found" >> "$RESPONSE_FILE"
    # Count HTML files
    html_count=$(find "$privacy_dir" -name "*.html" | wc -l)
    echo "HTML files: $html_count" >> "$RESPONSE_FILE"
    # List files
    find "$privacy_dir" -name "*.html" >> "$RESPONSE_FILE"
else
    echo "No privacy-policy directory found" >> "$RESPONSE_FILE"
    # Check other locations
    find "$PROJECT_DIR" -name "privacy*" -o -name "Privacy*" 2>/dev/null | head -20 >> "$RESPONSE_FILE"
fi
echo "" >> "$RESPONSE_FILE"

# Task 2: i18n Key Consistency Check
echo "=== i18n Key Consistency Check ===" >> "$RESPONSE_FILE"
cd "$PROJECT_DIR"
en_count=$(grep -c '":' app/i18n/en.json 2>/dev/null || echo "0")
zh_count=$(grep -c '":' app/i18n/zh.json 2>/dev/null || echo "0")
echo "en.json key count: $en_count" >> "$RESPONSE_FILE"
echo "zh.json key count: $zh_count" >> "$RESPONSE_FILE"
if [ "$en_count" = "$zh_count" ]; then
    echo "i18n key count: MATCH ✓" >> "$RESPONSE_FILE"
else
    echo "i18n key count: MISMATCH ⚠️" >> "$RESPONSE_FILE"
fi
echo "" >> "$RESPONSE_FILE"

# Task 3: Verify 69 tabs in _layout.tsx
echo "=== Tab Registration Check ===" >> "$RESPONSE_FILE"
tab_count=$(grep -c 'name=' app/\(tabs\)/_layout.tsx 2>/dev/null || echo "0")
echo "Tabs in _layout.tsx: $tab_count" >> "$RESPONSE_FILE"
if [ "$tab_count" = "69" ]; then
    echo "Tab count: MATCH ✓" >> "$RESPONSE_FILE"
else
    echo "Tab count: EXPECTED 69, GOT $tab_count ⚠️" >> "$RESPONSE_FILE"
fi
echo "" >> "$RESPONSE_FILE"

# Task 4: Check for console.log
echo "=== Console.log Detection ===" >> "$RESPONSE_FILE"
console_count=$(grep -r "console.log" app/ --include="*.tsx" 2>/dev/null | wc -l)
echo "console.log occurrences: $console_count" >> "$RESPONSE_FILE"
if [ "$console_count" = "0" ]; then
    echo "Console.log check: PASS ✓" >> "$RESPONSE_FILE"
else
    echo "Console.log check: FOUND $console_count ⚠️" >> "$RESPONSE_FILE"
    grep -r "console.log" app/ --include="*.tsx" >> "$RESPONSE_FILE" 2>/dev/null
fi
echo "" >> "$RESPONSE_FILE"

# TSC check
echo "=== TSC Verification ===" >> "$RESPONSE_FILE"
tsc_result=$(npx tsc --noEmit 2>&1 | tail -3)
echo "$tsc_result" >> "$RESPONSE_FILE"
echo "" >> "$RESPONSE_FILE"

echo "=== Dispatch Complete ===" >> "$RESPONSE_FILE"
echo "Response written to $RESPONSE_FILE"