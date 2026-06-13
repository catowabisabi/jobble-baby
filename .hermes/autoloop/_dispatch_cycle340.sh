#!/bin/bash
# Dispatch Cycle 340 — Accessibility Labels Fix
# Keywords: reflex_status_picker, skinfold_site_picker, visual_score_picker, gravity_feeding_angle, tactile_symbol_grid

GOAL="Fix 16 missing accessibilityLabel attributes across gravity-feeding.tsx (6 elements) and reflex-visual-motor.tsx (10 elements)"

cat << 'TASK'
STEP 1 — gravity-feeding.tsx accessibility labels:

Line ~154 (angle picker chip):
<TouchableOpacity
  key={angle}
  style={[styles.angleButton, selectedAngle === angle && { backgroundColor: colors.accent }]}
  onPress={() => setSelectedAngle(angle)}
>
Add: accessibilityLabel={`Angle ${angle} degrees`}

Line ~179 (position picker chip):
<TouchableOpacity
  key={pos}
  style={[styles.posButton, selectedPosition === pos && { backgroundColor: colors.accent }]}
  onPress={() => setSelectedPosition(pos)}
>
Add: accessibilityLabel={`Position: ${pos}`}

Line ~193 (outcome picker chip):
<TouchableOpacity
  key={out}
  style={[styles.optionChip, selectedOutcome === out && { backgroundColor: colors.accent }]}
  onPress={() => setSelectedOutcome(out)}
>
Add: accessibilityLabel={`Outcome: ${outcomeLabels[out]}`}

Line ~204 (save button):
<TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={saveLog}>
Add: accessibilityLabel={t('gravityFeeding.saveLog') || 'Save Log'}

Line ~237 (leap row):
<TouchableOpacity
  key={leap.leapId}
  style={styles.leapRow}
  onPress={() => setSelectedLeap(leap)}
>
Add: accessibilityLabel={`Leap ${leap.leapId}: ${leap.name}`}

Line ~260 (tactile symbol):
<TouchableOpacity
  key={symbol.id}
  style={styles.tactileSymbolBtn}
  onPress={() => toggleSymbol(symbol.id)}
>
Add: accessibilityLabel={`Tactile symbol: ${symbol.name}`}

STEP 2 — reflex-visual-motor.tsx accessibility labels:

Line ~138 (reflex row):
<TouchableOpacity key={r.id} style={styles.row} onPress={() => openAddReflex(r.id)}>
Add: accessibilityLabel={t(r.nameKey) + ' reflex row'}

Line ~157 (visual milestone row):
<TouchableOpacity key={m.id} style={styles.row} onPress={() => openAddVisual(m.id)}>
Add: accessibilityLabel={t(m.nameKey) + ' milestone row'}

Line ~173 (skinfold triceps):
<TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('triceps')}>
Add: accessibilityLabel={t('skinfold.triceps') + ' measurement'}

Line ~177 (skinfold subscapular):
<TouchableOpacity style={[styles.skinfoldBtn, { backgroundColor: bg }]} onPress={() => openAddSkinfold('subscapular')}>
Add: accessibilityLabel={t('skinfold.subscapular') + ' measurement'}

Line ~207 (reflex status picker):
<TouchableOpacity key={opt} style={[styles.pickerBtn, selectedReflex.status === opt && { backgroundColor: accent }]} onPress={() => setSelectedReflex({ ...selectedReflex, status: opt })}>
Add: accessibilityLabel={`Reflex status: ${t('reflex.' + opt)}`}

Line ~216 (modal save button):
<TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveReflexModal}>
Add: accessibilityLabel={t('reflex.save') || 'Save'}

Line ~234 (visual score picker):
<TouchableOpacity key={s} style={[styles.pickerBtn, selectedVisual.score === s && { backgroundColor: accent }]} onPress={() => setSelectedVisual({ ...selectedVisual, score: s })}>
Add: accessibilityLabel={`Score ${s} out of 5`}

Line ~243 (visual modal save):
<TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveVisualModal}>
Add: accessibilityLabel={t('reflex.save') || 'Save'}

Line ~260 (skinfold site picker):
<TouchableOpacity key={site} style={[styles.pickerBtn, selectedSkinfold.site === site && { backgroundColor: accent }]} onPress={() => setSelectedSkinfold({ ...selectedSkinfold, site })}>
Add: accessibilityLabel={`Site: ${t('skinfold.' + site)}`}

Line ~270 (skinfold modal save):
<TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveSkinfoldModal}>
Add: accessibilityLabel={t('reflex.save') || 'Save'}

STEP 3 — Verify:
cd JobbleBaby && node scripts/pre-submission-audit.js
Accessibility Labels should show 0 warnings (or fewer than before).

DONE
ULW
TASK
