#!/bin/bash
# Cycle 361 — Remove 80 dead AsyncStorage imports
# SafeStorage migration done; 80 files still import AsyncStorage but never use it directly

REPO="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
TARGET_DIR="$REPO/app"

echo "=== Finding files with dead AsyncStorage imports ==="
echo "These files import AsyncStorage but all storage calls go through SafeStorage wrapper."
echo ""

# Find all files that import AsyncStorage but don't use AsyncStorage.getItem/setItem/removeItem
cd "$TARGET_DIR" || exit 1

DEAD_FILES=$(grep -rl "from '@react-native-async-storage/async-storage'" --include="*.tsx" --include="*.ts" . | grep -v "utils/SafeStorage.ts")

echo "Files with dead AsyncStorage imports: $(echo "$DEAD_FILES" | wc -l)"
echo "$DEAD_FILES"
echo ""

# For each file, check if AsyncStorage is actually used (not just imported)
# and remove the import line if it's dead
for file in $DEAD_FILES; do
    # Check if file uses AsyncStorage.getItem, AsyncStorage.setItem, AsyncStorage.removeItem
    if grep -q "AsyncStorage\.getItem\|AsyncStorage\.setItem\|AsyncStorage\.removeItem" "$file"; then
        echo "SKIP (still using): $file"
    else
        echo "REMOVE import from: $file"
        # Remove the AsyncStorage import line (the line that contains only the import)
        # This handles: import AsyncStorage from '@react-native-async-storage/async-storage';
        python3 -c "
import re, sys
with open('$file', 'r') as f:
    content = f.read()
# Remove import AsyncStorage from '@react-native-async-storage/async-storage';
new_content = re.sub(r\"import\s+AsyncStorage\s+from\s+'@react-native-async-storage/async-storage';\s*\n\", '', content)
if new_content != content:
    with open('$file', 'w') as f:
        f.write(new_content)
    print('  -> Removed dead import from $file')
else:
    print('  -> No change needed in $file')
"
    fi
done

echo ""
echo "=== Verification ==="
REMAINING=$(grep -rl "from '@react-native-async-storage/async-storage'" --include="*.tsx" --include="*.ts" . | grep -v "utils/SafeStorage.ts" | wc -l)
echo "Remaining dead imports: $REMAINING"

# Final verification: no file should have both SafeStorage import AND AsyncStorage import
BOTH=$(grep -rl "safeGetItem\|safeSetItem" --include="*.tsx" --include="*.ts" . | while read f; do grep -q "from '@react-native-async-storage/async-storage'" "$f" && echo "$f"; done | wc -l)
echo "Files with BOTH SafeStorage and AsyncStorage: $BOTH"

echo ""
echo "=== TSC check (syntax only) ==="
cd "$REPO" || exit 1
npx tsc --noEmit 2>&1 | head -20

echo ""
echo "=== Done ==="
