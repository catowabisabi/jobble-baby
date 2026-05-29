# App Store + Google Play Submission Guide

## Prerequisites
- Apple Developer Account ($99/year) — https://developer.apple.com
- Google Play Developer Account ($25 one-time) — https://play.google.com/console
- EAS CLI installed: `npm install -g eas-cli`

---

## Part 1 — EAS Build (Cloud iOS Build — No Mac Required)

### Step 1: Login to EAS
```bash
cd JobbleBaby
eas login
```

### Step 2: Configure (already done — see eas.json)
The `eas.json` has been pre-configured with:
- `development` profile: iOS Simulator build (testing)
- `preview` profile: Internal distribution APK/IPA
- `production` profile: App Store/Play Store builds

### Step 3: Build for iOS Simulator (Development)
```bash
eas build --platform ios --profile development
```
Output: `.ipa` file downloaded after build completes.

### Step 4: Build for TestFlight (Production)
```bash
eas build --platform ios --profile production --non-interactive
```
This builds in the cloud — no macOS needed.

### Step 5: Submit to App Store Connect
After production build completes:
```bash
eas submit --platform ios --latest --non-interactive
```
Or upload manually via Transporter app (Mac required for manual upload).

---

## Part 2 — App Store Connect Setup

### Step 1: Create App Record
1. Go to https://appstoreconnect.apple.com
2. My Apps → + → New App
3. Fill in:
   - Platforms: iOS
   - Name: Jobble Baby
   - Primary Language: English
   - Bundle ID: com.jobblebaby.app (must match eas.json)
   - SKU: JOBBLEBABY001

### Step 2: App Store Listing Content
Already prepared in `/docs/APP_STORE_LISTING.md`:
- 100-char promotional text
- Full description (4,000 chars)
- Search keywords
- Screenshot specs (6.7" iPhone, iPad)

### Step 3: Upload Build
After `eas submit` or Transporter upload, the build appears in App Store Connect under "Activity" → "All Builds".

### Step 4: Submit for Review
1. Select the build in App Store Connect
2. Complete "App Review Information" (contact, demo account if needed)
3. Add "Age Rating" (4+ for this app)
4. Submit for review

**Review time:** 24-48 hours typically.

---

## Part 3 — Google Play Console Setup

### Step 1: Create App
1. Go to https://play.google.com/console
2. All Apps → Create App
3. Fill: App name, Default language, App type (App)

### Step 2: App Listing (already prepared in `/docs/PLAY_STORE_LISTING.md`)
- Short description (80 chars)
- Full description (4,000 chars)
- Screenshots: phone (1080x1920) + 7" tablet
- Feature graphic (1024x500)

### Step 3: Content Rating
Complete the questionnaire at: Setup → Content rating → Questionnaire
Baby/Parenting app → "No specific age rating" → "Everyone"

### Step 4: Pricing & Distribution
- Set price (Free or $0.00)
- Select countries
- Enable "Include in Android Enterprise"

### Step 5: App Signing
EAS handles app signing automatically with:
- Upload key (for Play Store)
- App signing key (managed by Google)

### Step 6: Build + Upload AAB
```bash
eas build --platform android --profile production --non-interactive
```
The `.aab` file is downloaded after build.

Upload to Play Console: Production → Create release → Upload .aab → Submit.

---

## Part 4 — iOS Privacy Manifest (Required for iOS 17+)

Apps targeting iOS 17+ must include `PrivacyInfo.xcprivacy` or include privacy keys in `Info.plist`.

Required entries for this app:
```
NSPrivacyAccessedAPITypes:
- NSPrivacyAccessedAPICategoryFileTimestamp (read file timestamps for caching)
- NSPrivacyAccessedAPICategoryUserDefaults (AsyncStorage for baby log data)
```

Add to `app.json` under `ios.infoPlist`:
```json
"NSPrivacyAccessedAPITypes": [
  {
    "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp",
    "NSPrivacyAccessedAPITypeReasons": ["C617.1"]
  },
  {
    "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
    "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
  }
]
```

---

## Part 5 — TestFlight Beta Testing

### Before App Store Review
1. Submit build to TestFlight (via `eas submit` or Transporter)
2. Add internal testers: App Store Connect → TestFlight → Users
3. Build goes live within ~10 minutes

### External Testing
1. Create external group in TestFlight
2. Add testing instructions
3. Submit for Apple Beta Review (usually < 24 hours)
4. Once approved, send TestFlight invite link to beta testers

---

## Status Checklist

- [x] Expo project initialized
- [x] All 7 tab screens implemented
- [x] Expo prebuild (ios + android native dirs)
- [x] Badge + notification system
- [x] WHO growth percentile chart
- [x] JSON data export/backup
- [x] Products tab with HK brands
- [x] EAS Build configured (eas.json created)
- [ ] App Store Connect app record created (needs Apple developer account)
- [x] App Store listing content filled in (docs/APP_STORE_LISTING.md)
- [x] iOS Privacy Manifest added (app.json)
- [ ] TestFlight internal build uploaded
- [ ] TestFlight external beta review submitted
- [ ] Google Play Console app created
- [x] Play Store listing filled in (docs/PLAY_STORE_LISTING.md)
- [ ] Play Store feature graphic + screenshots
- [ ] Google Play AAB uploaded
- [ ] Production submitted for review
