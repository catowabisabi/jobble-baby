# Internal Testing Setup Guide

## Prerequisites

Before building for internal testing, ensure you have completed the following:

- EAS CLI installed and logged in (`eas login`)
- Apple Developer Account with App Store Connect access
- Google Play Console account with appropriate permissions
- EAS credentials configured via `eas credentials`

---

## iOS TestFlight

### Step 1: Build the App

Generate an .ipa file for TestFlight distribution:

```bash
eas build --profile preview --platform ios
```

The build will produce a `.ipa` file ready for upload to App Store Connect.

### Step 2: Upload to App Store Connect

1. Sign in to App Store Connect at appstoreconnect.apple.com
2. Navigate to the "TestFlight" tab
3. Select your app (bundle ID: com.jobblebaby.app)
4. Click "Builds" in the sidebar
5. Drag and drop the generated `.ipa` file, or use Transporter app to upload

### Step 3: Wait for Build Processing

App Store Connect typically takes 10-30 minutes to process a build. Once processed, the build becomes available in TestFlight.

### Step 4: Add Internal Testers

1. In App Store Connect, go to "Users and Access" > "Internal Testing"
2. Click "Add" to add internal testers by email
3. Internal testers will receive an email invitation to download TestFlight and access the build

Note: Internal testing builds are only visible to users added directly in App Store Connect with internal access roles.

---

## Android Internal Testing

### Step 1: Build the App

Generate an `.aab` (Android App Bundle) file for internal testing:

```bash
eas build --profile preview --platform android
```

The build will produce a `.aab` file ready for upload to Google Play Console.

### Step 2: Upload to Play Console

1. Sign in to Google Play Console at play.google.com/console
2. Select your app (package: com.jobblebaby.app)
3. Navigate to "Release" > "Production" or create a new release track

### Step 3: Create Internal Testing Track (if needed)

If you do not have an Internal Testing track set up:

1. Go to "Release" > "Release overview"
2. Click "Create release" 
3. Select "Internal testing" track from the dropdown
4. Upload your `.aab` file

### Step 4: Add Testers

**Option A: Email invitations**
1. In your release, navigate to "Testers" tab
2. Add tester emails manually
3. Testers will receive an email with a download link

**Option B: Opt-in link**
Share the internal testing opt-in link with testers:

```
https://play.google.com/apps/internaltest/testing
```

Testers can access this URL to opt into internal testing and download the app.

---

## Credentials Setup

Before building, ensure your EAS credentials are properly configured:

```bash
eas credentials --platform ios
eas credentials --platform android
```

For iOS, you'll need your Apple Team ID and distribution certificate. For Android, ensure your Google Play Console service account has the appropriate permissions.

---

## Build Configuration

Your `eas.json` preview profile is configured with:

- `distribution: "internal"` for both platforms
- `android.buildType: "apk"` (for local development/testing)

For internal testing submissions, the `.aab` format is preferred as it supports Play Console's testing tracks.

---

For support: support@jobblebaby.com