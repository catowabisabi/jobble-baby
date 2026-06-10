# Jobble Baby Pre-Submission Checklist

Before submitting to the App Store or Play Console, ensure all items below are verified and passing.

## Run Automated Audit

Execute the pre-submission audit script to automatically validate most requirements:

```bash
node scripts/pre-submission-audit.js
```

The script runs 9 checks. All **REQUIRED** checks must pass before submission.

---

## Automated Checks (via pre-submission-audit.js)

| Check | Required | Description |
|-------|----------|-------------|
| TypeScript Compilation | YES | `npx tsc --noEmit` passes with 0 errors |
| Console.log Detection | YES | No console.log/debug/warn/error in app/ |
| i18n Key Validation | YES | All translation keys exist in en.json AND zh.json |
| Accessibility Labels | NO | All interactive elements have accessibilityLabel |
| Screenshot Dimensions | NO | iPhone: 1290×2796, Android: 1080×1920 |
| Tabs.Screen Alignment | YES | All tab files have corresponding Tabs.Screen |
| AsyncStorage Keys | NO | All @jobble/ keys follow naming convention |
| app.json Fields | YES | name, version, slug, ios.bundleIdentifier, android.package |
| Hardcoded Strings | NO | No hardcoded non-i18n strings in UI components |

---

## Manual Verification Checklist

### 1. TypeScript Compilation
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No type errors in any `.ts` or `.tsx` files

### 2. Console Logs
- [ ] No `console.log`, `console.debug`, `console.warn`, or `console.error` in production code
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

### 3. Internationalization (i18n)
- [ ] All visible strings use the `t('key')` translation function
- [ ] Every translation key exists in both:
  - `app/i18n/en.json` (English)
  - `app/i18n/zh.json` (Chinese)
- [ ] No hardcoded English/Chinese strings in UI components
- [ ] Fallback strings (e.g., `t('key') || 'Default'`) should be avoided in favor of complete translations

### 4. Accessibility
- [ ] All interactive elements (TouchableOpacity, Pressable, Button) have:
  - `accessibilityLabel` - describes the element for screen readers
  - `accessibilityRole` - describes the role (button, link, etc.)
  - `accessibilityState` - when applicable (disabled, selected, etc.)
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

### 5. Tab Navigation Alignment
- [ ] Every `.tsx` file in `app/(tabs)/` has a corresponding `<Tabs.Screen>` entry in `_layout.tsx`
- [ ] Every `<Tabs.Screen>` in `_layout.tsx` has a corresponding `.tsx` file in `app/(tabs)/`
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

### 6. AsyncStorage Keys
- [ ] All AsyncStorage keys follow naming conventions:
  - `@jobble/<module>` (e.g., `@jobble/tracking_entries`)
  - OR `@jobble_<app>` (e.g., `@jobble_baby_profile`)
- [ ] No inconsistent naming (e.g., mixing `@jobble/` and other prefixes)
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

### 7. app.json Configuration
- [ ] Required fields present:
  - [ ] `name` - App display name ("Jobble Baby")
  - [ ] `version` - Current version string (e.g., "1.0.0")
  - [ ] `slug` - URL-friendly identifier (e.g., "jobble-baby")
  - [ ] `ios.bundleIdentifier` - iOS bundle ID (e.g., "com.jobblebaby.app")
  - [ ] `android.package` - Android package name (e.g., "com.jobblebaby.app")
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

### 8. App Store Screenshots
#### iPhone Sizes (Portrait)
- [ ] iPhone 16 Pro Max: 1290 × 2796 px (6 screenshots required)
- [ ] iPhone 16 Pro: 1206 × 2622 px
- [ ] iPhone 16/15/14: 1179 × 2556 px
- [ ] iPhone SE (3rd gen): 750 × 1334 px

#### iPad Sizes (Portrait)
- [ ] iPad Pro 12.9" (6th gen): 2048 × 2732 px
- [ ] iPad Pro 11" (4th gen): 1668 × 2388 px
- [ ] iPad Air (5th gen): 1640 × 2360 px
- [ ] iPad mini (9th gen): 1336 × 2048 px

#### Screenshot Locations
- [ ] iOS screenshots in: `assets/screenshots/app-store/` OR `assets/app-store/`
- [ ] Android screenshots in: `assets/screenshots/play-store/` OR `assets/play-store/`
- [ ] All screenshots in PNG format

### 9. Play Store Screenshots
- [ ] Phone screenshots: 1080 × 1920 px (portrait)
- [ ] Feature graphic: 1024 × 500 px
- [ ] Screenshots in PNG format

### 10. Hardcoded Strings Check
- [ ] No static string arrays with hardcoded labels (e.g., `const OPTIONS = ['Option1', 'Option2']`)
- [ ] No inline object label properties without i18n (e.g., `{ label: 'Some Label' }`)
- [ ] Run audit script to detect: `node scripts/pre-submission-audit.js`

---

## Pre-Submission Test Sequence

Run these commands in order before submitting:

```bash
# 1. Run full automated audit
node scripts/pre-submission-audit.js

# 2. If audit passes, run TypeScript check
npx tsc --noEmit

# 3. Verify no console logs (manual grep)
grep -r "console\.\(log\|debug\|warn\|error\)" app/ --include="*.tsx"

# 4. Test on iOS Simulator
npx expo run:ios

# 5. Test on Android Emulator
npx expo run:android
```

---

## Known Issue Areas (Files with Hardcoded Strings)

The following files have been identified with potential hardcoded strings that should use i18n:

- `app/(tabs)/caregiver-fatigue.tsx` - DEFAULT_MENTAL_LOAD_TASKS array
- `app/(tabs)/bilateral-coordination.tsx` - MOVEMENT_TYPES, HAND_FOOT_OPTIONS arrays
- `app/(tabs)/constellation.tsx` - Milestone labels
- `app/(tabs)/colic-relief.tsx` - Relief method labels
- `app/(tabs)/gear-check.tsx` - Checklist item labels
- `app/(tabs)/index.tsx` - Quick action labels
- `app/(tabs)/asymmetric-growth.tsx` - Severity labels
- `app/(tabs)/circadian.tsx` - Phase labels
- `app/(tabs)/fontanelle-hydration.tsx` - Urine color labels
- `app/(tabs)/tracking.tsx` - Tracking type labels
- `app/(tabs)/sleep-architecture.tsx` - Sleep debt severity labels
- `app/(tabs)/sleep-debt.tsx` - Debt level labels
- `app/(tabs)/eight-month-storm.tsx` - Bilingual inline strings
- `app/(tabs)/iot-security.tsx` - Security check labels
- `app/(tabs)/oral-motor.tsx` - Nipple level labels
- `app/(tabs)/procedure-recovery.tsx` - Procedure labels
- `app/(tabs)/solid-food.tsx` - Food labels
- `app/(tabs)/cup-feeding.tsx` - Cup type labels
- `app/(tabs)/clinician-portal.tsx` - Pre-visit checklist labels
- `app/(tabs)/habit-reset.tsx` - Domain score labels
- `app/(tabs)/bonding-journal.tsx` - MOOD_LABELS array
- `app/(tabs)/cry-analyzer.tsx` - Day abbreviations

---

## Submission Readiness

Before proceeding to submission:

- [ ] All REQUIRED audit checks pass
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] All hardcoded strings converted to i18n keys
- [ ] Screenshots captured at correct dimensions for all required device sizes
- [ ] app.json has all required fields
- [ ] No console.log statements remain in code
- [ ] Tested on both iOS and Android

---

## Additional Resources

- [App Store Screenshot Specification](../store/app-store-screenshots-spec.md)
- [EAS Credentials Checklist](../store/eas-credentials-checklist.md)
- [Internal Testing Guide](../store/internal-testing-guide.md)
- [App Store Listing Notes](../store/app-store-listing.md)
- [Play Store Listing Notes](../store/play-listing.md)

---

## App Store Connect Requirements

- [ ] Bundle ID registered: `com.jobblebaby.app`
- [ ] App-Specific Password created
- [ ] Export Compliance: Yes
- [ ] Age Rating: 4+
- [ ] Content Rights: Not providing third-party content
- [ ] Privacy Policy URL: live and accessible

## Google Play Console Requirements

- [ ] AAB file uploaded
- [ ] Content rating questionnaire completed
- [ ] Target audience: Parents of infants (0-12 months)
- [ ] Age rating: Everyone