# CI/CD Setup Guide

This guide covers setting up continuous integration, automated builds, and notifications for Jobble Baby.

## Table of Contents

1. [GitHub Actions CI Pipeline](#github-actions-ci-pipeline)
2. [EAS Build Automation](#eas-build-automation)
3. [Telegram Notifications](#telegram-notifications)
4. [GitHub Secrets Setup](#github-secrets-setup)

---

## GitHub Actions CI Pipeline

The CI pipeline runs on every push and pull request to `master`.

### What It Does

1. **Checkout** - Checks out the repository
2. **Setup Node.js** - Uses Node.js 20 with npm caching
3. **Install dependencies** - Runs `npm ci`
4. **TypeScript check** - Runs `npx tsc --noEmit`
5. **Expo install check** - Runs `npx expo install --check`
6. **Telegram notification** - Notifies on success/failure

### Enabling GitHub Actions

The CI pipeline is already configured in `.github/workflows/ci.yml`. It activates automatically when you push to GitHub:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI pipeline"
git push origin master
```

No additional setup is required - GitHub Actions runs automatically on:
- Every push to `master` branch
- Every pull request to `master` branch

---

## EAS Build Automation

EAS Build creates production-ready iOS and Android builds.

### What It Does

1. **Build iOS** - Creates .ipa via EAS for App Store distribution
2. **Build Android** - Creates .apk via EAS for Play Store distribution
3. **Upload artifacts** - Stores build outputs as GitHub artifacts

### EAS Build Workflow File

```yaml
# .github/workflows/eas-build.yml
name: EAS Build & Release

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: JobbleBaby/package-lock.json
      - run: npm ci
        working-directory: JobbleBaby
      - uses: expo/expo-github-actions@v1
        with:
          eas-version: latest
          packager: npm
      - name: EAS Build iOS
        run: eas build --platform ios --profile preview --non-interactive
        working-directory: JobbleBaby
        env:
          EXPO_APPLE_TEAM_ID: ${{ secrets.EXPO_APPLE_TEAM_ID }}
          EXPO_APPLE_ID: ${{ secrets.EXPO_APPLE_ID }}
          EXPO_APPLE_APP_PASSWORD: ${{ secrets.EXPO_APPLE_APP_PASSWORD }}
      - name: EAS Build Android
        run: eas build --platform android --profile preview --non-interactive
        working-directory: JobbleBaby
      - name: Upload Android APK
        uses: actions/upload-artifact@v4
        with:
          name: eas-android-apk
          path: android/app/build/outputs/apk/**/*.apk
          retention-days: 7
```

---

## Telegram Notifications

Get instant build status updates via Telegram bot.

### Setup Steps

#### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow prompts - give it a name and username
4. Copy the **bot token** (e.g., `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`)

#### 2. Get Your Chat ID

1. Start a chat with your new bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `"chat":{"id":123456789,"type":"private"}` - the `id` is your chat ID

#### 3. Add Secrets to GitHub

1. Go to your GitHub repository **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Your numeric chat ID |

#### 4. Notification Behavior

- **On CI failure**: Sends `❌ CI Failed: Jobble Baby (<commit-sha>)`
- **On CI success (master only)**: Sends `✅ CI Passed: Jobble Baby (<commit-sha>)`

---

## GitHub Secrets Setup

Secrets encrypt environment variables stored in GitHub. They're required for:

- EAS builds (Apple credentials)
- Telegram notifications (bot token)

### Adding Secrets

1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret from the table below

### Required Secrets

| Secret Name | Description | Where to Get |
|-------------|-------------|-------------|
| `EXPO_APPLE_TEAM_ID` | Apple Developer Team ID | [developer.apple.com](https://developer.apple.com) → Account → Membership |
| `EXPO_APPLE_ID` | Apple ID email | Your Apple Developer account email |
| `EXPO_APPLE_APP_PASSWORD` | App-specific password | [appleid.apple.com](https://appleid.apple.com) → Sign In → App-Specific Passwords |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | Use getUpdates API |
| `SENTRY_DSN` | Sentry DSN (optional) | [sentry.io](https://sentry.io) → Project → Settings → Client Keys |

### Creating App-Specific Password for Apple

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Navigate to **App-Specific Passwords**
4. Click the **+** to generate a new password
5. Name it something like "GitHub Actions EAS"
6. Copy the generated password
7. Add it as `EXPO_APPLE_APP_PASSWORD` in GitHub Secrets

### EAS Secrets (Alternative to GitHub Secrets)

You can also use EAS secrets for environment variables that EAS Build needs:

```bash
# Add Sentry DSN
eas secret:create --name SENTRY_DSN --value "https://your-dsn@o123.ingest.sentry.io/456" --scope production

# Add Apple Team ID
eas secret:create --name EXPO_APPLE_TEAM_ID --value "ABC123XYZ" --scope production
```

---

## Workflow Files Location

All workflow files are in `.github/workflows/`:

```
.github/workflows/
├── ci.yml           # TypeScript, lint, Expo checks
├── eas-build.yml    # EAS iOS/Android builds
└── testflight-release.yml  # TestFlight deployment
```

---

## Verification

After setup, verify everything works:

1. **Push a commit** to trigger CI
2. **Check GitHub Actions tab** - you should see the workflow running
3. **Check Telegram** - you should receive a success/failure notification
4. **For EAS builds** - download artifacts from the workflow run

---

## Troubleshooting

### CI Fails at `npx tsc --noEmit`

- Ensure TypeScript dependencies are installed: `npm ci`
- Check for type errors locally: `npx tsc --noEmit`
- If @sentry/react-native causes errors, add `"skipLibCheck": true` to tsconfig.json

### EAS Build Fails

- Verify Apple credentials are correct in GitHub Secrets
- Ensure EAS CLI is authenticated: `eas login`
- Check `eas.json` configuration

### Telegram Notifications Not Working

- Verify bot token is correct
- Ensure chat ID is numeric (not with @)
- Test manually: `curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d "chat_id=<ID>" -d "text=test"`
