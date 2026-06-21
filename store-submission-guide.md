# Jobble Baby — App Store & Play Store Submission Guide

This guide walks you through every step to get Jobble Baby published on the **Apple App Store** and **Google Play Store**.

---

## Section 1: Prerequisites

Before you begin, you need accounts from Apple and Google.

### Apple Developer Program
- **Cost**: $99 USD/year
- **Enrollment**: [developer.apple.com/programs](https://developer.apple.com/programs)
- **Required for**: App Store distribution, TestFlight
- **Timeline**: 24–48 hours after enrollment approval

### Google Play Developer Console
- **Cost**: $25 USD (one-time)
- **Enrollment**: [play.google.com/console](https://play.google.com/console)
- **Required for**: Play Store distribution
- **Timeline**: Immediate after payment

### EAS Account
- **Cost**: Free tier is sufficient to start
- **Sign up**: [expo.dev](https://expo.dev)
- **Required for**: Building .ipa/.apk without a local macOS machine

---

## Section 2: EAS Credentials Setup

Run these commands in the `JobbleBaby` directory.

### Environment Variables

Set these before running EAS commands:

```bash
# Apple Team ID (found at developer.apple.com → Membership)
EAS_APPLE_TEAM_ID=XXXXXXXXXX

# App-Specific Password (generated at appleid.apple.com → Security → App-Specific Passwords)
EAS_APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx

# EAS Token (generated via eas login)
EAS_TOKEN=exp(...)
```

### How to Get Each Value

| Variable | Where to Find It |
|---|---|
| `EAS_APPLE_TEAM_ID` | [developer.apple.com](https://developer.apple.com) → Account → Membership → **Team ID** (10-character string) |
| `EAS_APPLE_APP_SPECIFIC_PASSWORD` | [appleid.apple.com](https://appleid.apple.com) → Sign In → Security → **App-Specific Passwords** → Add → Name it "EAS" → Copy the generated password |
| `EAS_TOKEN` | Run `eas login` in the JobbleBaby directory, then `eas credentials --interactive` |

### One-Time Interactive Setup

```bash
cd JobbleBaby
npm install
eas login
eas credentials --interactive
```

Follow the interactive prompts to configure your Apple and Google credentials for EAS Build.

---

## Section 3: App Store Connect Setup

### Step-by-Step Instructions

1. **Go to** [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in with your Apple Developer account.

2. **Create a New App**
   - Click the **+** button → **New App**
   - Fill in the following:

     | Field | Value |
     |---|---|
     | **Platforms** | iOS |
     | **Bundle ID** | `com.jobblebaby.app` (must match `app.json`) |
     | **App Name** | `Jobble Baby` |
     | **Primary Language** | English |
     | **Category** | Health & Fitness |
     | **SKU** | `jobble-baby` |

3. **Fill in App Information**
   - **Privacy Policy URL**: `https://catowabisabi.github.io/jobble-baby/privacy`
   - **Support URL**: `https://github.com/catowabisabi/jobble-baby` (or your support page)
   - **Copyright**: `2026` (or your name/organization)

4. **Upload a Build** (after Section 4 — EAS Build)

5. **Complete Store Listing**
   - Screenshots for all iPhone/iPad sizes are in the `store/` folder
   - **App Preview**: Optional but recommended (use the same screenshots)
   - **Description**: Write a compelling description of Jobble Baby
   - **Keywords**: baby, sleep, feeding, health, tracker, infant, parenting, newborn
   - **Marketing URL** (optional)

6. **Submit for Review**
   - Fill in the export compliance information
   - Select appropriate content rights
   - Click **Add for Review**

---

## Section 4: EAS Build Commands

Run these commands in the `JobbleBaby` directory.

### Full EAS Build Workflow

```bash
cd JobbleBaby

# Step 1: Login to EAS (if not already logged in)
eas login

# Step 2: Configure credentials (one-time setup)
eas credentials --interactive

# Step 3: Build for iOS (creates .ipa for TestFlight/App Store)
eas build --platform ios --profile production

# Step 4: Build for Android (creates .apk/.aab for Play Console)
eas build --platform android --profile production
```

### Build Profiles

The `eas.json` file defines build profiles. The `production` profile is used for store submissions.

### After a Successful iOS Build

1. Go to **App Store Connect** → your app
2. Select the **TestFlight** tab
3. Your build will appear here after EAS completes the upload
4. You can then create a **TestFlight group** for beta testing
5. When ready, click **Add for Review** to submit

### After a Successful Android Build

1. The `.apk` or `.aab` will be available from the EAS build page
2. Alternatively, download from: `android/app/build/outputs/apk/` after running `eas build --platform android --local` (or use the EAS dashboard)
3. Proceed to **Section 5** to upload to Play Console

---

## Section 5: Google Play Console Setup

### Step-by-Step Instructions

1. **Go to** [play.google.com/console](https://play.google.com/console) and sign in with your Google account.

2. **Create a New App**
   - Click **Create App**
   - Fill in:

     | Field | Value |
     |---|---|
     | **App Name** | `Jobble Baby` |
     | **Package Name** | `com.jobblebaby.app` (must match `app.json`) |
     | **Category** | Health & Fitness |
     | **Tagline** | `Fewer clicks, more presence.` |

3. **Set Up Release Track**
   - Go to **Release** → **Production**
   - Start with **Internal Testing** first (recommended before submitting to Production)
   - Internal testing lets you test with a small group before wider release

4. **Upload the Android Package**
   - Go to **Production** → **Create Release**
   - Upload the `.apk` from:
     ```
     android/app/build/outputs/apk/
     ```
     (after running `eas build --platform android`)
   - Or upload via the EAS build dashboard

5. **Complete Store Listing**
   - Screenshots are in `store/play-store-screenshots/`
   - Fill in:
     - **Short Description** (80 characters max)
     - **Full Description** (detailed description of features)
     - **Feature Graphic** (optional)
     - **App Icon** (uses your app's icon)
     - **Category**: Health & Fitness
     - **Tags**: baby, sleep, feeding, health, tracker, infant

6. **Fill in Policy Information**
   - **Privacy Policy URL**: `https://catowabisabi.github.io/jobble-baby/privacy`
   - **Content Rating**: Complete the questionnaire to get an age rating

7. **Submit for Review**
   - Click **Submit to Production** (or Internal Testing first)
   - Review typically takes **1–7 days** for new apps

---

## Section 6: Privacy Policy URL

Your privacy policy is deployed on **GitHub Pages**:

```
https://catowabisabi.github.io/jobble-baby/privacy
```

### Enable GitHub Pages (if not already enabled)

1. Go to your GitHub repo: [github.com/catowabisabi/jobble-baby](https://github.com/catowabisabi/jobble-baby)
2. Go to **Settings** → **Pages**
3. **Source**: Select **GitHub Actions**
4. Click **Save**

This setting tells GitHub Pages to serve your site from the GitHub Actions workflow artifacts, which includes the privacy policy HTML page.

### Update URLs in Stores

| Store | Where to Paste the Privacy Policy URL |
|---|---|
| App Store Connect | App Information → Privacy Policy |
| Google Play Console | Policy → Privacy Policy |

---

## Section 7: Submission Checklist

Use this checklist to make sure you haven't missed anything.

- [ ] Apple Developer Program enrolled ($99/year)
- [ ] Google Play Developer Console enrolled ($25 one-time)
- [ ] EAS account created at expo.dev
- [ ] EAS credentials configured (`eas credentials --interactive`)
- [ ] App Store Connect app created with bundle ID `com.jobblebaby.app`
- [ ] Play Console app created with package name `com.jobblebaby.app`
- [ ] GitHub Pages privacy policy enabled (Settings → Pages → Source: GitHub Actions)
- [ ] Privacy policy URL updated in App Store Connect: `https://catowabisabi.github.io/jobble-baby/privacy`
- [ ] Privacy policy URL updated in Play Console: `https://catowabisabi.github.io/jobble-baby/privacy`
- [ ] Screenshots uploaded to App Store Connect (from `store/` folder)
- [ ] Screenshots uploaded to Play Console (from `store/play-store-screenshots/` folder)
- [ ] EAS iOS build completed → TestFlight build available
- [ ] EAS Android build completed → `.apk` uploaded to Play Console
- [ ] App Store Connect: Export Compliance information filled in
- [ ] App Store Connect: Content Rights questionnaire completed
- [ ] Play Console: Content Rating questionnaire completed
- [ ] Both stores submitted for review

---

## Quick Reference

| Item | Value |
|---|---|
| **Bundle ID (iOS)** | `com.jobblebaby.app` |
| **Package Name (Android)** | `com.jobblebaby.app` |
| **App Name** | `Jobble Baby` |
| **Privacy Policy URL** | `https://catowabisabi.github.io/jobble-baby/privacy` |
| **Primary Category** | Health & Fitness |
| **GitHub Repo** | `catowabisabi/jobble-baby` |

---

## Troubleshooting

### "Bundle ID does not match"
- Ensure the bundle ID in App Store Connect matches exactly: `com.jobblebaby.app`
- Check `app.json` → `ios.bundleIdentifier`

### "Package name does not match"
- Ensure the package name in Play Console matches exactly: `com.jobblebaby.app`
- Check `app.json` → `android.package`

### EAS Build Fails
- Run `eas credentials --interactive` to refresh credentials
- Ensure your Apple Developer account is still active
- Check [expo.dev](https://expo.dev) for any service outages

### Privacy Policy Not Loading
- Verify GitHub Pages is enabled: Repo → Settings → Pages → Source: **GitHub Actions**
- Check that the `dist/` folder (or your deployed artifact) contains `privacy/index.html`

### TestFlight Build Not Appearing
- EAS builds take **10–30 minutes** to complete
- After completion, it can take another **5–15 minutes** for the build to appear in App Store Connect
- Check your email for any email-related issues Apple flags

---

Good luck with your submission! 🚀
