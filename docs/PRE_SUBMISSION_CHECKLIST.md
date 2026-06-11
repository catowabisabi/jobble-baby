# Jobble Baby — Pre-Submission Checklist

## Automated Checks (run `node scripts/pre-submission-audit.js`)

| Check | What It Validates | How to Fix |
|-------|-------------------|-------------|
| **TabNavigator** | Every `app/(tabs)/*.tsx` file has a `Tabs.Screen` entry in `_layout.tsx` | Add missing `Tabs.Screen name="..."` entry in `app/(tabs)/_layout.tsx` |
| **i18nCoverage** | Every key in `en.json` exists in `zh.json` and vice versa | Add missing translation keys to `app/i18n/zh.json` (or `en.json`) |
| **appJson** | `app.json` has required fields: name, slug, version, ios.bundleId, android.package | Fill in missing fields in `JobbleBaby/app.json` |
| **ScreenshotDimensions** | Screenshots exist in `store/` directory | Place iPhone (1290×2796) and Android (1080×1920) screenshots in `store/` |
| **TSCParse** | TypeScript compiles with 0 errors (`npx tsc --noEmit`) | Fix TypeScript errors reported by TSC |
| **HardcodedStrings** | No display strings in `<Text>` that skip i18n `t()` | Wrap all user-facing text in `t('key')` using the i18n hook |

---

## Manual Checks (App Store Connect)

- [ ] Apple Developer Program account active
- [ ] App Store Connect app created (bundle ID: `com.jobblebaby.app`)
- [ ] App Store listing filled: title, subtitle, description, keywords, screenshots, privacy policy URL
- [ ] Privacy policy URL points to live `https://jobblebaby.com/privacy`
- [ ] EAS credentials configured (`EXPO_APPLE_APP_SPECIFIC_PASSWORD`, `EXPO_APPLE_TEAM_ID`)
- [ ] TestFlight build submitted via EAS (`eas build --platform ios --profile preview`)
- [ ] Build appears in App Store Connect → TestFlight → Builds

## Manual Checks (Play Console)

- [ ] Google Play Developer account active
- [ ] Play Console app created (package: `com.jobblebaby.app`)
- [ ] Play Store listing filled: short description, full description, screenshots, privacy policy
- [ ] Privacy policy URL points to live `https://jobblebaby.com/privacy`
- [ ] EAS credentials configured (`EXPO_GOOGLE_SERVICE_ACCOUNT_KEY_PATH` or interactive auth)
- [ ] Internal testing track build submitted via EAS (`eas build --platform android --profile preview`)
- [ ] Build appears in Play Console → Release → Internal Testing

## Privacy Policy

- [ ] HTML file ready at: `docs/privacy-policy.html`
- [ ] Deployed to `https://jobblebaby.com/privacy` (or equivalent live URL)
- [ ] URL added to App Store Connect and Play Console listings

## Pre-Release Final Verification

- [ ] TSC: `cd JobbleBaby && npx tsc --noEmit` → 0 errors
- [ ] i18n: `node scripts/pre-submission-audit.js` → all checks PASS
- [ ] Screenshots: 17 tabs × 2 platforms = 34 screenshots in `store/`
- [ ] `user-intention.md` is current and accurate
- [ ] All 68 tabs load without crash (manual spot-check on simulator)

## EAS Build Commands

```bash
# iOS
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby
eas build --platform ios --profile preview

# Android
eas build --platform android --profile preview
```

## Support Contacts

- Expo documentation: https://docs.expo.dev
- Apple App Store Connect: https://appstoreconnect.apple.com
- Google Play Console: https://play.google.com/console