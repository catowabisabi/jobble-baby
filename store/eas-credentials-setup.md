# EAS Credentials Setup Guide — Jobble Baby

## Overview
EAS (Expo Application Services) is used for building the app binaries for Apple App Store and Google Play submission.

## Required Credentials

### Apple App Store (iOS)
1. **Apple Team ID** — found at https://developer.apple.com/account → Membership
2. **App-Specific Password** — https://appleid.apple.com/account/manage → App-Specific Passwords → Generate

### Google Play (Android)
1. **Google Service Account** — Create in Google Cloud Console → IAM → Service Accounts → JSON key
2. **Link to Play Console** — Grant access at https://play.google.com/console/users

## Steps to Configure

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Configure for iOS
```bash
cd JobbleBaby
eas build:configure --platform ios
```
Then set in `app.json` or `eas.json`:
- `ios.teamId` = your Apple Team ID
- `ios.bundleId` = "com.jobblebaby.app"

### Step 3: Configure for Android
- Set `android.package` = "com.jobblebaby.app" in `app.json`
- Google Service Account key saved as `android-service-account.json` (DO NOT commit to git)

### Step 4: Environment Variables (DO NOT commit these)
```
EAS_IOS_APPLE_TEAM_ID=XXXXXXXXXX
EAS_IOS_APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
EAS_ANDROID_SERVICE_ACCOUNT=./android-service-account.json
```

## Build Commands
```bash
# iOS App Store build
eas build --platform ios --profile production --local

# Android Play Store build  
eas build --platform android --profile production
```

## Notes
- Linux cannot build iOS — must use EAS cloud build or macOS
- Screenshots for App Store must be captured on a real iOS device using `expo export:embed` or a simulator
- Android builds can be done on Linux via EAS cloud