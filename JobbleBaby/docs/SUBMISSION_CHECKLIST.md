# Jobble Baby — App Store Submission Checklist

**Last Updated:** Cycle 1115 (2026-07-05)

---

## ✅ Pre-Submission Status: READY

All app features, code audits, and TSC checks pass. The code is ready.

---

## ⏳ User Action Required (Before Submitting)

These steps require your Apple/Google account credentials and cannot be automated.

### iOS / App Store Connect

- [ ] **Apple Developer Program** — Ensure you have an active membership ($99/year)
- [ ] **App Store Connect App** — Create the app entry at appstoreconnect.apple.com
  - Bundle ID: `com.jobblebaby.app`
  - Name: `Jobble Baby`
  - Primary Language: English
- [ ] **EAS Credentials** — Run `eas credentials --platform ios` and follow prompts
  - Required env vars: `EXPO_APPLE_APP_SPECIFIC_PASSWORD`, `EXPO_APPLE_TEAM_ID`
- [ ] **EAS Build** — Run `eas build --platform ios --profile preview --local`
  - This generates the .ipa for TestFlight
- [ ] **TestFlight** — Upload .ipa to App Store Connect, add beta testers
- [ ] **Privacy Policy URL** — Deploy to `https://jobblebaby.com/privacy` (placeholder currently)
- [ ] **Age Rating** — Complete in App Store Connect (All Ages for this app)
- [ ] **Export Compliance** — Answer "No" to cryptography question in App Store Connect
- [ ] **Screenshot Upload** — 6 screenshots at 1290×2796 (iPhone 6.7")
- [ ] **Metadata** — Fill in title, subtitle, keywords, description
- [ ] **Submit for Review**

### Android / Play Console

- [ ] **Google Play Developer Account** — Ensure you have an active account ($25 one-time)
- [ ] **Play Console App** — Create the app at play.google.com/console
  - Package name: `com.jobblebaby.app`
- [ ] **EAS Credentials** — Run `eas credentials --platform android`
- [ ] **EAS Build** — Run `eas build --platform android --profile preview --local`
  - This generates the .aab for Play Console
- [ ] **Privacy Policy URL** — Same deployment as iOS above
- [ ] **Screenshots Upload** — Phone screenshots at 1080×1920 (9:16)
- [ ] **Feature Graphic** — 1024×500 PNG
- [ ] **Description** — Fill in short + full description
- [ ] **Content Rating** — Complete the questionnaire
- [ ] **Submit for Review**

---

## 📋 App Feature Summary (31 Tabs)

| # | Tab | Description |
|---|-----|-------------|
| 1 | Home | Dashboard overview |
| 2 | Tracking | Feeding, diaper, pumping log |
| 3 | Schedule | Sleep/wake schedule + wake window calculator |
| 4 | Products | Baby product database |
| 5 | Growth | Height/weight WHO percentile charts |
| 6 | Milestones | Developmental milestone tracker |
| 7 | Allergens | Allergen introduction log |
| 8 | Sleep Training | Ferber/Extinction/Custom method |
| 9 | Circadian | Circadian rhythm dashboard |
| 10 | Milk Prep | Bottle preparation safety |
| 11 | Monitor Correlation | Baby monitor event correlation |
| 12 | Shift Handoff | Dual-parent shift schedule |
| 13 | Stress Cascade | Parental stress tracking |
| 14 | Teething | Teething symptom tracker |
| 15 | Doctor Visit | Export summary for pediatrician |
| 16 | Profile | Baby profile + settings |
| 17+ | ... | Plus 15+ clinical navigator tabs |

Full tab list: `app/(tabs)/_layout.tsx`

---

## 🔧 Pre-Submission Audit Commands

```bash
cd JobbleBaby
npx tsc --noEmit                           # Must pass 0 errors
node scripts/pre-submission-audit.js       # Must show 9/9 PASS
```

## 📁 Key Files

- `app.json` — Bundle ID, version, permissions
- `store/` — App Store + Play Store screenshots
- `docs/ASO_KEYWORD_RESEARCH.md` — App Store keywords
- `docs/PRIVACY_POLICY.md` — Privacy policy template
