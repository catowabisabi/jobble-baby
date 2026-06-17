#!/usr/bin/env python3
# dispatch_378_v2 — Fix gesture-milestone.tsx hardcoded strings → i18n (RE-DISPATCH)
# Keywords: attractor_state, pitch_contour_mapping, nasal_persistence

DISPATCH = """
=== DISPATCH #378-v2 ===
REPO: /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby
FILE: JobbleBaby/app/(tabs)/gesture-milestone.tsx
PRIORITY: P1 — App Store submission blocker
PREVIOUS ATTEMPT FAILED — hardcoded strings still present at lines 400, 411, 416, 559, 566

TASK: Fix 6 hardcoded user-visible strings in gesture-milestone.tsx → i18n.

=== STEP 1: Add i18n keys to en.json ===
Path: JobbleBaby/app/i18n/en.json
Add under "gestureMilestone": { ... }:

  "overdueAlert": "Some milestones are overdue. Consider professional review.",
  "bridge": {
    "pointing": "Pointing",
    "jointAttn": "Joint Attn",
    "words": "Words"
  },
  "wordContext": {
    "spontaneous": "Spontaneous",
    "elicited": "Elicited"
  }

=== STEP 2: Add i18n keys to zh.json ===
Path: JobbleBaby/app/i18n/zh.json
Add same structure with Chinese translations:

  "overdueAlert": "部分里程碑已逾期。建议咨询专业人士。",
  "bridge": {
    "pointing": "指向",
    "jointAttn": "共同注意",
    "words": "词语"
  },
  "wordContext": {
    "spontaneous": "自发性",
    "elicited": "诱发性"
  }

=== STEP 3: Fix gesture-milestone.tsx ===
File: JobbleBaby/app/(tabs)/gesture-milestone.tsx

Line 400: Change:
  <Text style={styles.alertBody}>Some milestones are overdue. Consider professional review.</Text>
To:
  <Text style={styles.alertBody}>{t('gestureMilestone.overdueAlert')}</Text>

Line 411: Change:
  <Text style={styles.bridgeLabel}>Pointing</Text>
To:
  <Text style={styles.bridgeLabel}>{t('gestureMilestone.bridge.pointing')}</Text>

Line 416: Change:
  <Text style={styles.bridgeLabel}>Joint Attn</Text>
To:
  <Text style={styles.bridgeLabel}>{t('gestureMilestone.bridge.jointAttn')}</Text>

Line 559: Change:
  <Text style={styles.toggleBtnText}>Spontaneous</Text>
To:
  <Text style={styles.toggleBtnText}>{t('gestureMilestone.wordContext.spontaneous')}</Text>

Line 566: Change:
  <Text style={styles.toggleBtnText}>Elicited</Text>
To:
  <Text style={styles.toggleBtnText}>{t('gestureMilestone.wordContext.elicited')}</Text>

Also update the toggle button accessibilityLabels at lines 557 and 564:
Line 557: accessibilityLabel="Spontaneous context" → accessibilityLabel={t('gestureMilestone.wordContext.spontaneous')}
Line 564: accessibilityLabel="Elicited context" → accessibilityLabel={t('gestureMilestone.wordContext.elicited')}

=== VERIFICATION ===
After changes, run from JobbleBaby/:
npx tsc --noEmit
Must show 0 errors.

**DONE ULW**
"""

if __name__ == "__main__":
    print(DISPATCH)
