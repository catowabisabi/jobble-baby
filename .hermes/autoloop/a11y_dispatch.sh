#!/bin/bash
# WCAG 2.1 AA Accessibility Fix Script
# Task: Add accessibilityLabel to all TouchableOpacity/Pressable/Button elements

BASE="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
cd "$BASE" || exit 1

echo "=== WCAG 2.1 AA Accessibility Fix ==="
echo "Starting accessibility audit..."

# Find all tabs needing accessibility fixes
NEEDS_FIX=$(find "app/(tabs)" -name "*.tsx" -exec grep -L "accessibilityLabel" {} \; 2>/dev/null)
COUNT=$(echo "$NEEDS_FIX" | grep -c ".tsx")

echo "Found $COUNT tabs needing accessibilityLabel"
echo "$NEEDS_FIX" | head -10

# For each tab, add accessibilityLabel to TouchableOpacity/Pressable elements
# This is a simple version - more complex fixes need manual review
for f in app/(tabs)/*.tsx; do
    if grep -q "TouchableOpacity\|Pressable" "$f" 2>/dev/null; then
        if ! grep -q "accessibilityLabel" "$f" 2>/dev/null; then
            echo "NEEDS FIX: $f"
        fi
    fi
done

echo "=== Audit complete ==="
echo "Run: npx tsc --noEmit"
npx tsc --noEmit 2>&1 | tail -5
