# CI/CD Setup Guide — Jobble Baby

## GitHub Actions CI Pipeline

**File:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `master`
- Pull requests to `master`

**Jobs:**
1. Checkout code
2. Setup Node.js 20
3. `npm ci`
4. `npx tsc --noEmit`
5. `npx expo install --check`
6. Telegram notification on pass/fail

---

## GitHub Actions EAS Build

**File:** `.github/workflows/eas-build.yml`

**Trigger:** Manual workflow dispatch (`workflow_dispatch`)

**Inputs:**
- `platform`: `ios` | `android` | `all`
- `profile`: `preview` | `production`

**Steps:**
1. Checkout + Node.js 20
2. `npm ci`
3. Setup Expo (via `expo/expo-github-action`)
4. `eas build --platform <input> --profile <input> --non-interactive`
5. Telegram notification on pass/fail

---

## Required GitHub Secrets

Add these in GitHub repo → Settings → Secrets and variables → Actions:

| Secret Name | Where to get it |
|---|---|
| `EXPO_TOKEN` | Expo dashboard → Account Settings → Access Tokens |
| `TELEGRAM_BOT_TOKEN` | Telegram @BotFather → /newbot |
| `TELEGRAM_CHAT_ID` | Your chat ID (use @userinfobot or channel ID) |
| `APPLE_APP_SPECIFIC_PASSWORD` | appleid.apple.com → Sign In → App-Specific Passwords |
| `APPLE_TEAM_ID` | Apple Developer Portal → Membership → Team ID |
| `SENTRY_AUTH_TOKEN` | sentry.io → Settings → Auth Tokens (if using sourcemaps) |

---

## EAS Build Commands (Local)

```bash
# Preview build (iOS)
eas build --platform ios --profile preview

# Preview build (Android)
eas build --platform android --profile preview

# Production build (iOS)
eas build --platform ios --profile production

# Production build (Android)
eas build --platform android --profile production

# Build for both platforms
eas build --platform all --profile preview
```

---

## Telegram Build Notifications

The CI/CD pipelines send Telegram notifications on:
- ✅ CI Passed (master only)
- ❌ CI Failed
- ✅ EAS Build Success
- ❌ EAS Build Failed

To set up the bot:
1. Create a bot via @BotFather in Telegram
2. Get your chat ID: start a conversation with @userinfobot
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to GitHub Secrets

---

## Setting Up the Repository

```bash
# Clone and install
cd JobbleBaby
npm install

# Configure EAS
eas configure

# Build locally for development
npx expo run:ios
npx expo run:android

# Run TypeScript check
npx tsc --noEmit
```

---

## Branch Strategy

- `master`: Production-ready code, CI must pass
- Feature branches: PR → master → CI runs → merge
- EAS production builds: triggered manually from `master` after CI passes

---

## Troubleshooting

**CI fails on `npx tsc --noEmit`:**
- Check TypeScript errors locally: `npx tsc --noEmit`
- Ensure all new tabs are registered in `app/(tabs)/_layout.tsx`

**EAS build fails:**
- Run `eas diagnostics` locally
- Verify `EXPO_TOKEN` is valid in GitHub Secrets
- Check `app.json` / `app.config.js` for configuration errors

**Telegram notifications not working:**
- Verify bot token is correct
- Ensure chat ID is numeric (not @username)
- Test with: `curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d "chat_id=<ID>" -d "text=Test"`