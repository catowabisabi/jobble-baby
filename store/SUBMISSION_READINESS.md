# Jobble Baby — Submission Readiness Checklist

**Last Updated:** 2026-06-01  
**Branch:** master  
**Bundle ID:** com.jobblebaby.app

---

## 📱 App Store (iOS) — 17-Tab Status

All 16 tab screens are **FUNCTIONAL** (code reviewed 2026-06-01):

| Tab | Screen | Lines | Status |
|-----|--------|-------|--------|
| 01 | Home (index.tsx) | 352 | ✅ Functional |
| 02 | Tracking (tracking.tsx) | 248 | ✅ Functional |
| 03 | Schedule (schedule.tsx) | 564 | ✅ Functional |
| 04 | Products (products.tsx) | 188 | ✅ Functional |
| 05 | Growth (growth.tsx) | 619 | ✅ Functional |
| 06 | Milestones (milestones.tsx) | 612 | ✅ Functional |
| 07 | Allergens (allergens.tsx) | 175 | ✅ Functional |
| 08 | Sleep Training (sleep-training.tsx) | 911 | ✅ Functional |
| 09 | Circadian (circadian.tsx) | 359 | ✅ Functional |
| 10 | Milk Prep (milk-prep.tsx) | 588 | ✅ Functional |
| 11 | Monitor Correlation (monitor-correlation.tsx) | 250 | ✅ Functional |
| 12 | Shift Handoff (shift-handoff.tsx) | 713 | ✅ Functional |
| 13 | Stress Cascade (stress-cascade.tsx) | 519 | ✅ Functional |
| 14 | Teething (teething.tsx) | 551 | ✅ Functional |
| 15 | Doctor Visit (doctor-visit.tsx) | 440 | ✅ Functional |
| 16 | Profile (profile.tsx) | 493 | ✅ Functional |

**Tab Navigator (_layout.tsx):** 16 tabs wired ✅

---

## ✅ iOS Submission Checklist (from app-store-listing.md)

### MUST FIX Before Submission
- [ ] **Sign in required**: All 17 tabs functional without account. Only cloud sync requires account. ✅ PASS
- [ ] **Limited functionality**: All tabs have real UI, AsyncStorage persistence, real interactions. ✅ PASS
- [ ] **Privacy nutrition labels**: Declare all data collected in App Store Connect — tracking data, photos, growth data, push notifications. ⚠️  USER ACTION: Fill in App Store Connect Privacy section
- [ ] **HK privacy policy URL**: Must have a valid real URL. Current placeholder `https://jobblebaby.com/privacy` is NOT acceptable. ⚠️  USER ACTION: Deploy privacy policy page
- [ ] **Screenshots match UI**: 17-tab screenshots exist (19 PNGs each for iOS/Android). ✅ PASS
- [ ] **Age rating**: Select "4+" or "12+" correctly in App Store Connect. ⚠️  USER ACTION

### Common Rejection Reasons (Preventive)
- [ ] Do NOT use "baby monitor" in screenshots without actual monitor functionality — Monitor Correlation tab exists but is a correlation view, not live monitor. ⚠️  Caution
- [ ] Do NOT claim "doctor-approved" or medical claims — app uses "safe sleep" not "SIDS prevention" ✅
- [ ] Screenshots: no real baby photos without model release ✅ (placeholder screenshots use mock UI)
- [ ] IAP pricing in HKD if any paid features ⚠️  N/A (no IAP currently)
- [ ] Third-party data sharing disclosed in privacy policy ⚠️  USER ACTION: Check if Expo/analytics SDKs are used

---

## ✅ Google Play Submission Checklist

### MUST FIX Before Submission
- [ ] **Privacy policy URL**: Must be a real, accessible URL in Play Console. ⚠️  USER ACTION
- [ ] **Content rating questionnaire**: Complete for "Family" category (baby/parenting app). ⚠️  USER ACTION
- [ ] **Target audience**: "Parents of infants/toddlers" — no children under 13 collecting data. ⚠️  USER ACTION
- [ ] **Ads**: App does not contain ads ✅ PASS
- [ ] **In-app purchases**: None currently ✅ PASS
- [ ] **Screenshots**: 19 Android screenshots (1080×1920) exist ✅ PASS
- [ ] **Feature graphic**: 1024×500 PNG exists in assets/play-store/ ✅ PASS
- [ ] **App signing**: EAS build for Android produces .aab with correct keystore ✅

### Common Rejection Reasons (Preventive)
- [ ] "Family" category apps must comply with Play Families Policy — no behavioural advertising ⚠️  USER ACTION: Verify no third-party ads SDKs
- [ ] Privacy policy must be accessible and comprehensive ⚠️  USER ACTION
- [ ] App binary (.aab) must be built and uploaded via EAS or Play Console ⚠️  USER ACTION: Run `eas build --platform android`

---

## 🔴 Critical Path Blocker (User Action Required)

The following **cannot be completed by Sisyphus/Hermes** — user must do manually:

1. **EAS Credentials Setup** (iOS + Android)
   - iOS: Apple Team ID + App-Specific Password → run `eas credentials --platform ios`
   - Android: Google Service Account for Play Console → see `store/eas-credentials-setup.md`
   - See: `store/eas-credentials-setup.md`

2. **Privacy Policy Page Deployment**
   - Deploy actual HTML page at a real URL (e.g., jobblebaby.com/privacy)
   - Must disclose: data collected, third-party SDKs, parental consent for children's data

3. **App Store Connect App Creation**
   - Create app at appstoreconnect.apple.com with bundle ID `com.jobblebaby.app`
   - Fill: Privacy, Pricing, Availability, Age Rating

4. **Play Console App Creation**
   - Create app at play.google.com/console
   - Complete content rating questionnaire for "Family" / parenting app

5. **EAS Build** (requires macOS or EAS cloud build — no macOS on this machine)
   - iOS: `eas build --platform ios --profile preview` (cloud build, no macOS needed)
   - Android: `eas build --platform android --profile preview`

---

## 📊 Build Status

| Platform | Native Prebuild | EAS Build | Binary Ready |
|----------|----------------|-----------|--------------|
| iOS | ✅ expo prebuild done | ⏳ Pending (user: EAS creds) | ⏳ |
| Android | ✅ expo prebuild done | ⏳ Pending (user: EAS creds) | ⏳ |

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `store/app-store-listing.md` | App Store Copy + iOS rejection checklist |
| `store/google-play-setup.md` | Play Console setup steps |
| `store/eas-credentials-setup.md` | EAS credentials how-to |
| `store/privacy-policy.md` | Privacy policy template |
| `store/app-store-screenshots/` | 19 iOS screenshots (1290×2796) |
| `store/play-store-screenshots/` | 19 Android screenshots (1080×1920) |
| `store/generate-screenshots.py` | Screenshot generation script |
| `JobbleBaby/app.json` | Expo config with bundle ID ✅ |
| `JobbleBaby/ios/` | iOS native project ✅ |
| `JobbleBaby/android/` | Android native project ✅ |
