# EAS Build Setup Guide

This guide walks you through configuring EAS credentials for automated builds via GitHub Actions.

## Prerequisites

- EAS CLI installed: `npm install -g eas-cli`
- Expo account at https://expo.dev
- Apple Developer Program membership (for iOS builds)
- Google Play Console account (for Android builds)

---

## Step 1: Create an EAS Account

```bash
eas login
```

Or log in at https://expo.dev/signup

---

## Step 2: Configure iOS Credentials

### Option A: Automatic (recommended)

```bash
cd JobbleBaby
eas credentials --platform ios
```

Follow the prompts. EAS will create the necessary certificates and provisioning profiles automatically.

### Option B: Manual

1. Go to https://developer.apple.com
2. Create an App ID: `com.jobblebaby.app`
3. Create a provisioning profile for development and distribution
4. Create a certificates for signing

### Apple App-Specific Password (required for CI/CD)

1. Go to https://appleid.apple.com
2. Sign in → Security → App-Specific Passwords
3. Generate a new password, label it "Jobble Baby EAS"
4. Save this password securely - you will need it for GitHub Secrets

### Apple Team ID

1. Go to https://developer.apple.com → Account → Membership
2. Copy your Team ID (10-character string)

---

## Step 3: Configure Android Credentials

```bash
cd JobbleBaby
eas credentials --platform android
```

Follow the prompts to set up your Google Play Console service account.

For Play Console manual setup:
1. Go to Google Play Console → Settings → API Access
2. Create a new service account
3. Download the JSON key file
4. Grant the service account the "Release Manager" role

---

## Step 4: Create EAS Access Token

1. Go to https://expo.dev/settings/access-tokens
2. Click "Create Access Token"
3. Name it "GitHub Actions"
4. Copy the token immediately - it will not be shown again

---

## Step 5: Add Secrets to GitHub

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `EAS_TOKEN` | The access token from Step 4 |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | The app-specific password from Step 2 |
| `EXPO_APPLE_TEAM_ID` | Your Apple Team ID from Step 2 |

---

## Step 6: Verify Setup

Run a test build locally:

```bash
cd JobbleBaby
eas build --platform ios --profile preview --local
```

If this succeeds, your CI/CD pipeline should work.

---

## Troubleshooting

### "Expo token is required" error
- Ensure EAS_TOKEN is set in GitHub Secrets
- Ensure the token is valid at https://expo.dev/settings/access-tokens

### iOS: "No team provided" error
- Set EXPO_APPLE_TEAM_ID in GitHub Secrets

### iOS: "Invalid credentials" error
- Regenerate your app-specific password at appleid.apple.com
- Update the secret in GitHub

### Android: "Google Play credentials invalid"
- Regenerate the service account key in Google Play Console
- Download new JSON file and convert to base64 for the secret

---

## Files Created

- `.github/workflows/eas-build.yml` - Builds on push to main
- `.github/workflows/test.yml` - TypeScript check on PRs