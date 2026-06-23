## Sisyphus Task #402 — Multisensory Feeding Readiness Navigator

**Project**: JobbleBaby  
**Repo**: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby  
**Working Dir**: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

### Task

Create a new tab `feeding-readiness-navigator.tsx` implementing a Multisensory Feeding Readiness Navigator.

**IMPORTANT**: This is a NEW file, distinct from the existing `feeding-readiness.tsx` tab. The existing tab focuses on allergen introduction, iron, and texture checklists. This new tab focuses on crossmodal developmental readiness signals.

STEP 1 — Read these files first:
- JobbleBaby/app/(tabs)/_layout.tsx (for tab registration pattern)
- JobbleBaby/app/(tabs)/feeding-progression.tsx (for feeding UX patterns)
- JobbleBaby/app/(tabs)/growth.tsx (for milestone-style checklist UX)
- JobbleBaby/app/i18n/en.json and zh.json (for i18n key structure)

STEP 2 — Create `JobbleBaby/app/(tabs)/feeding-readiness-navigator.tsx`

Design:
- SafeAreaView + ScrollView, themed (COLORS, useLanguage, useTheme)
- Header: "Feeding Readiness" (i18n key: feedingReadinessMultisensor.title)

SECTION A — Multisensory Readiness Checklist
- Three-domain checklist with tap-to-log entries:
  - Oral Motor domain: tongue_lateralization, munching_reflex, accepts_spoon, gag_reflex_normal
  - Hand-Mouth Axis domain: hand_to_mouth_frequency (low/medium/high), pincer_grasp_emerged, self_feeding_attempts
  - Sensory domain: texture_tolerance_score (1-5), new_taste_acceptances, mouthing_frequency
- Each domain gets a sub-score (0-100) and a tap-to-toggle entry
- Visual: 3 domain cards with colored indicators

SECTION B — Crossmodal Correlation View
- Simple scatter or bar chart showing:
  - X-axis: days of mouthing object tracking
  - Y-axis: food acceptance speed (days to accept new food after introduction)
  - Use mock data: 14 data points for demo
- Title: "Does tactile exploration predict food acceptance?"

SECTION C — Readiness Composite Score
- Large circular gauge or progress ring showing 0-100 composite
- Sub-scores listed: Oral Motor: X%, Hand-Mouth: X%, Sensory: X%
- Color coding: red (<40), amber (40-70), green (>70)
- Below threshold message: "Not yet ready — keep practicing oral motor play"

SECTION D — Optimal Window Predictor
- Card showing: estimated developmental window for solids (e.g., "Window open: 4-6 months" or "Window closing: 8-10 months")
- Based on: baby age, readiness score trend, oral motor milestones logged
- Alert: "Optimal allergen introduction window (4-6 months) closing in ~N weeks"

SECTION E — Texture Ladder Progress
- Visual step-ladder of 5 texture stages:
  1. Smooth purée
  2. Chunky purée  
  3. Soft meltables (puffcorn, teething biscuit)
  4. Soft solids (soft banana, avocado)
  5. Family foods + self-feeding
- Highlight current stage, completed stages show checkmark
- Tap each stage to log when it was achieved

DATA: Use AsyncStorage for all checklist data and texture ladder.
- @jobble/ms_readiness_checklist
- @jobble/texture_ladder_state
- Mock data array for demo if storage is empty

STEP 3 — Add i18n keys
Add to en.json and zh.json:
- feedingReadinessMultisensor.title, subtitle
- feedingReadinessMultisensor.sectionA.* (checklist labels for all 3 domains)
- feedingReadinessMultisensor.sectionB.* (chart title, axis labels)
- feedingReadinessMultisensor.sectionC.* (score labels, threshold messages)
- feedingReadinessMultisensor.sectionD.* (window predictor, alerts)
- feedingReadinessMultisensor.sectionE.* (texture ladder stages)

STEP 4 — Register in _layout.tsx
Add Tabs.Screen entry for feeding-readiness-navigator.
Icon: silverware-fork-knife (MaterialCommunityIcons)
Register after feeding-progression.tsx entry.

STEP 5 — Verify
- TSC: npx tsc --noEmit → 0 errors
- Pre-submission audit: node scripts/pre-submission-audit.js → all PASS

Do NOT run npm install or modify package.json.

Keywords: crossmodal_transfer, feeding_readiness_composite, texture_ladder

ULW