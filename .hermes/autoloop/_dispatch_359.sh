#!/bin/bash
# Dispatch cycle 359 — Complete AsyncStorage→SafeStorage migration

TASK="# Todo #356: Complete AsyncStorage→SafeStorage migration
Keywords: thermal_conduction_skin_contact, state_co_regulation, latch_asymmetry_heatmap

## Task for Sisyphus

Complete the migration of all AsyncStorage calls to SafeStorage equivalents.

STEP 1 — Check SafeStorage utility:
- Read JobbleBaby/app/utils/SafeStorage.ts (already exists)

STEP 2 — Find all files still using direct AsyncStorage:
- grep -r "AsyncStorage" JobbleBaby/app/ --include="*.ts" --include="*.tsx" -l
- There are ~82 files still with direct AsyncStorage calls

STEP 3 — Migrate files in batches:
For each file using AsyncStorage:
- Replace: import AsyncStorage from '@react-native-async-storage/async-storage'
- With: import { safeGetItem, safeSetItem, safeRemoveItem } from '@/app/utils/SafeStorage'
- Replace AsyncStorage.getItem(key) → await safeGetItem(key)
- Replace AsyncStorage.setItem(key, value) → await safeSetItem(key, value)
- Replace AsyncStorage.removeItem(key) → await safeRemoveItem(key)
- Handle null/false returns gracefully (check for null on get, check for false on set/remove)

STEP 4 — Process these key files first:
- JobbleBaby/app/utils/context/*.tsx
- JobbleBaby/app/utils/*.ts (excluding SafeStorage.ts)
- JobbleBaby/app/(tabs)/*.tsx (do 10 files per cycle if many)

STEP 5 — Verify each batch:
- TSC: npx tsc --noEmit (0 errors)
- After each batch: grep "AsyncStorage" JobbleBaby/app/ --include="*.ts" --include="*.tsx" -l | wc -l
- Target: reduce count from 82 to below 50

Report: how many files updated, remaining count, any edge cases.

DONE
ULW