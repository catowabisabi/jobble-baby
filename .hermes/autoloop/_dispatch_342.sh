#!/bin/bash
# Cycle 342 dispatch — Galant Reflex + Latch Asymmetry Navigator
# i18n keys + storage keys already done — only tab file creation needed

cat > /tmp/sisyphus_task_342_v2.txt << 'TASK_END'
=== CYCLE 342 — SISYPHUS TASK (v2) ===

CONTEXT FROM PREVIOUS ATTEMPT:
- i18n keys (galantLatch.*) already added to: JobbleBaby/app/i18n/en.json + zh.json
- Storage keys already added to: JobbleBaby/store/storage-keys.ts
  - GALANT_REFLEX_LOG: "@jobble/galant_reflex_log"
  - LATCH_ASYMMETRY_LOG: "@jobble/latch_asymmetry_log"  
  - TEMP_RHYTHM_LOG: "@jobble/temp_rhythm_log"
- YOU ONLY NEED TO CREATE the tab file

TASK: Create Galant Reflex + Latch Asymmetry Correlation Navigator tab

FILE TO CREATE: JobbleBaby/app/(tabs)/galant-latch-navigator.tsx

FEATURES:
1. Galant reflex timeline: tracks persistence beyond 6-month expected window. Input: reflex_present (boolean), months_age (number), trunk_extension_score (1-5)
2. Latch asymmetry quality log: latch_score (1-5), asymmetry_direction (left/right/none), side_preference (left/right/both)
3. Temperature rhythm overlay: ambient_temp (°C), tracking period (days)
4. Correlation matrix: cross-tabulate Galant retention vs latch quality vs temp rhythm — simple 3x3 grid with color coding
5. Alerts: if reflex_present=true at 7+ months AND latch_score < 3 → show alert banner "Consider professional review"
6. Combined score: (galant_integration_pct * 0.4) + (latch_quality_pct * 0.4) + (temp_rhythm_stability * 0.2) → display as percentage

STORAGE KEYS (already in storage-keys.ts):
- @jobble/galant_reflex_log: GalantReflexEntry[]
- @jobble/latch_asymmetry_log: LatchAsymmetryEntry[]
- @jobble/temp_rhythm_log: TempRhythmEntry[]

UI REQUIREMENTS:
- Use existing COLORS and layout patterns from other tabs (see bonding-journal.tsx as reference)
- Include accessibilityLabel on all interactive elements
- Use i18n t() for all user-facing strings (keys already exist in en.json/zh.json under galantLatch.*)
- All inputs via Pressable/TouchableOpacity (no TextInput for data entry)
- Show summary cards at top: reflex status, latch score, combined score
- Scrollable log below with entries

DATA TYPES:
type GalantReflexEntry = { id: string; date: string; months_age: number; reflex_present: boolean; trunk_extension_score: number; notes?: string }
type LatchAsymmetryEntry = { id: string; date: string; latch_score: number; asymmetry_direction: 'left' | 'right' | 'none'; side_preference: 'left' | 'right' | 'both' }
type TempRhythmEntry = { id: string; date: string; ambient_temp: number; period_days: number }

ALSO:
- Add Tabs.Screen entry for galant-latch-navigator in JobbleBaby/app/(tabs)/_layout.tsx
- i18n tab label: tabs.galantLatch = "Reflex & Latch"
- Run: npx tsc --noEmit → must pass 0 errors

IMPORTANCE: medium
PRIORITY: normal
KEYWORDS: galant_reflex, latch_asymmetry, temperature_rhythm, reflex_integration, infant_development
TASK_END

tmux send-keys -t jobble-baby C-c
sleep 1
tmux send-keys -t jobble-baby "cat > /tmp/sisyphus_task_342_v2.txt << 'TASK_END'\n=== CYCLE 342 — SISYPHUS TASK (v2) ===\n\nCONTEXT FROM PREVIOUS ATTEMPT:\n- i18n keys (galantLatch.*) already added to: JobbleBaby/app/i18n/en.json + zh.json\n- Storage keys already added to: JobbleBaby/store/storage-keys.ts\n  - GALANT_REFLEX_LOG: \"@jobble/galant_reflex_log\"\n  - LATCH_ASYMMETRY_LOG: \"@jobble/latch_asymmetry_log\"  \n  - TEMP_RHYTHM_LOG: \"@jobble/temp_rhythm_log\"\n- YOU ONLY NEED TO CREATE the tab file\n\nTASK: Create Galant Reflex + Latch Asymmetry Correlation Navigator tab\n\nFILE TO CREATE: JobbleBaby/app/(tabs)/galant-latch-navigator.tsx\n\nFEATURES:\n1. Galant reflex timeline: tracks persistence beyond 6-month expected window. Input: reflex_present (boolean), months_age (number), trunk_extension_score (1-5)\n2. Latch asymmetry quality log: latch_score (1-5), asymmetry_direction (left/right/none), side_preference (left/right/both)\n3. Temperature rhythm overlay: ambient_temp (°C), tracking period (days)\n4. Correlation matrix: cross-tabulate Galant retention vs latch quality vs temp rhythm — simple 3x3 grid with color coding\n5. Alerts: if reflex_present=true at 7+ months AND latch_score < 3 → show alert banner \"Consider professional review\"\n6. Combined score: (galant_integration_pct * 0.4) + (latch_quality_pct * 0.4) + (temp_rhythm_stability * 0.2) → display as percentage\n\nSTORAGE KEYS (already in storage-keys.ts):\n- @jobble/galant_reflex_log: GalantReflexEntry[]\n- @jobble/latch_asymmetry_log: LatchAsymmetryEntry[]\n- @jobble/temp_rhythm_log: TempRhythmEntry[]\n\nUI REQUIREMENTS:\n- Use existing COLORS and layout patterns from other tabs (see bonding-journal.tsx as reference)\n- Include accessibilityLabel on all interactive elements\n- Use i18n t() for all user-facing strings (keys already exist in en.json/zh.json under galantLatch.*)\n- All inputs via Pressable/TouchableOpacity (no TextInput for data entry)\n- Show summary cards at top: reflex status, latch score, combined score\n- Scrollable log below with entries\n\nDATA TYPES:\ntype GalantReflexEntry = { id: string; date: string; months_age: number; reflex_present: boolean; trunk_extension_score: number; notes?: string }\ntype LatchAsymmetryEntry = { id: string; date: string; latch_score: number; asymmetry_direction: 'left' | 'right' | 'none'; side_preference: 'left' | 'right' | 'both' }\ntype TempRhythmEntry = { id: string; date: string; ambient_temp: number; period_days: number }\n\nALSO:\n- Add Tabs.Screen entry for galant-latch-navigator in JobbleBaby/app/(tabs)/_layout.tsx\n- i18n tab label: tabs.galantLatch = \"Reflex & Latch\"\n- Run: npx tsc --noEmit → must pass 0 errors\n\nIMPORTANCE: medium\nPRIORITY: normal\nKEYWORDS: galant_reflex, latch_asymmetry, temperature_rhythm, reflex_integration, infant_development\nTASK_END" Enter
sleep 2
