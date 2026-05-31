# EAS Credentials Setup Checklist — Jobble Baby

## Prerequisites
- Apple Developer Account ($99/year): https://developer.apple.com
- Google Play Console Account ($25 one-time): https://play.google.com/console
- Expo Account: https://expo.dev (sign up if not already)

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

---

## Step 2: Apple Developer Setup (Required for iOS / TestFlight)

### 2a. Get Apple Team ID
1. Go to https://developer.apple.com → Account → Membership
2. Copy **Team ID** (10-character alphanumeric, e.g., `ABCDE12345`)

### 2b. Create App-Specific Password
1. Go to https://appleid.apple.com → Sign In
2. **App-Specific Passwords** → Create New
3. Name it: `EAS JobbleBaby`
4. Copy the generated password (16 characters, no spaces)

### 2c. Configure EAS Credentials (Interactive)
```bash
cd JobbleBaby
eas credentials --platform ios
```
- Select "Add New Credential" or "Use existing Certificate"
- When prompted for Apple Team ID: enter your Team ID
- When prompted for App-Specific Password: paste from step 2b
- Choose "Distribution Certificate" for release builds
- Choose "Push Notification Certificate" (for expo-notifications)

### 2d. Set Environment Variables (Optional — for CI/CD)
```bash
export EXPO_APPLE_TEAM_ID="ABCDE12345"
export EXPO_APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop"
```

Add to `~/.bashrc` or `.env` file for persistence.

---

## Step 3: Google Play Console Setup (Required for Android / Play Store)

### 3a. Create Google Service Account (Recommended for EAS)
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. **APIs & Services → Credentials** → Create Credentials → Service Account
4. Name: `EAS JobbleBaby`
5. Download JSON key file (rename to `google-services.json`)

### 3b. Grant Play Console Access to Service Account
1. Go to https://play.google.com/console → Settings → Developer account → Users & permissions
2. Invite service account email (from step 3a)
3. Grant roles: **Release Manager**, **Finance**
4. Accept the invitation

### 3c. Configure EAS Credentials (Interactive)
```bash
eas credentials --platform android
```
- Choose "Google Service Account JSON" method
- Upload or paste the JSON key content

---

## Step 4: Configure EAS Build (eas.json)

Your `eas.json` should already be configured. Verify it:
```bash
cat JobbleBaby/eas.json
```

Expected content:
```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "ios": { "simulator": true }, "android": { "buildType": "apk" } },
    "production": { "ios": { "simulator": false } }
  },
  "submit": {
    "production": {
      "ios": { "appleTeamId": "YOUR_TEAM_ID" },
      "android": { "serviceAccountKeyPath": "./path/to/service-account.json" }
    }
  }
}
```

---

## Internal Testing vs Production Builds

Understanding build types is essential for choosing the right workflow:

| Profile | Purpose | Distribution | Testing Method |
|---------|---------|--------------|----------------|
| `development` | Local development with Expo Go | `internal` | Direct install via EAS local build |
| `preview` | Internal testing on physical devices | `internal` | TestFlight (iOS) / Play Console internal testing (Android) |
| `production` | App Store / Play Store release | `store` | App Store review (iOS) / Play Store review (Android) |

Key clarifications:

- **`development` and `preview` profiles** use `distribution: "internal"`. These builds are for internal testing BEFORE you push to production. They generate `.ipa` (iOS) and `.aab`/`.apk` (Android) files that can be installed and tested via TestFlight or Google Play Console internal testing tracks **without going through app review**.

- **`production` profile** is for App Store (iOS) and Play Store (Android) release builds. These builds must pass app review before becoming publicly available. The `production` profile uses `distribution: "store"` by default.

- **Internal testing builds** are ideal for: QA teams, stakeholder reviews, beta testers, and pre-release validation. You can distribute these builds to specific testers without making your app publicly available.

- **Production builds** are the final release candidate. Once approved, your app goes live on the App Store or Play Store for all users.

---

## Step 5: Test EAS Build

```bash
# Test Android build locally
eas build --platform android --profile preview --local

# Test iOS build (requires macOS for cloud build)
eas build --platform ios --profile production
```

---

## Checklist Summary

- [ ] Expo account created and logged in (`eas login`)
- [ ] Apple Team ID obtained from developer.apple.com
- [ ] App-Specific Password generated
- [ ] `eas credentials --platform ios` completed successfully
- [ ] Google Service Account JSON downloaded
- [ ] Service account granted Play Console access
- [ ] `eas credentials --platform android` completed successfully
- [ ] `eas.json` verified and correct
- [ ] Test build completed for at least one platform

---

## Key Notes

- **Apple credentials expire**: Distribution certs last 1 year; push certs last 1 year. Set calendar reminders.
- **Google Service Account**: Does not expire but Play Console access can be revoked.
- **macOS not required for EAS cloud builds**: EAS Build runs on Expo's servers. You only need macOS for local iOS simulator builds or if not using EAS.
- **TestFlight submission**: After `eas build --platform ios` succeeds, EAS can automatically submit to TestFlight if credentials are configured.