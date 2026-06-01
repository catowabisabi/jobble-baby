# Google Play Console Setup Guide — Jobble Baby

## Prerequisites
- Google Play Console account (developer fee ~$25 one-time)
- Google Cloud project with Service Account for Play Console access
- Package name: `com.jobblebaby.app` (must match app.json)
- EAS CLI configured with Android credentials

---

## Step 1: Create App in Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Sign in with your Google account
3. Click **Create App**
4. Fill in:
   - **App Name:** Jobble Baby
   - **Default Language:** English (or Traditional Chinese zh-Hant)
   - **App Type:** Android App
   - **Free or Paid:** Free
5. Click **Create**

---

## Step 2: Set Up Store Listing

### Store Presence

| Field | Value |
|-------|-------|
| Title | Jobble Baby |
| Short Description (80 chars) | Your all-in-one baby care companion — track, schedule, and shop smarter. |
| Full Description (4000 chars) | Use content from `store/app-store-listing.md` |

### Category
- **Primary Category:** Parenting / Baby & Children
- **Secondary Category:** Health & Fitness

### Screenshots
Upload 17 screenshots from `store/play-store-screenshots/` (1080×1920):
- 1080×1920 phone screenshots (all 17 tabs + hero)

### Feature Graphic
Required: 1024×500 PNG
Use a branded graphic with app name and dark background.

### App Icon
Required: 512×512 PNG
Use the app icon from `JobbleBaby/assets/`.

---

## Step 3: Content Rating

1. Go to **Content Rating** → **Complete questionnaire**
2. Select appropriate options:
   - App contains/doesn't contain ads
   - Not targeting children specifically (age rating 4+)
   - No mature content
3. Get age rating certification

---

## Step 4: Privacy Policy

1. Go to **Policy** → **App Content** → **Privacy Policy**
2. Enter your privacy policy URL
   - Use `https://jobblebaby.com/privacy` (placeholder — must update before publishing)
3. Privacy policy must be publicly accessible

---

## Step 5: Set Up Internal Testing Track

### Create Internal Testing Track

1. **Release** → **Create release** (or use Internal Testing)
2. Upload AAB file from EAS build

### Upload AAB via EAS

```bash
cd JobbleBaby
eas build --platform android --profile production
```

EAS will upload the build to Google Play. You need:
1. Service Account JSON key saved locally (never commit to git)
2. Configure `android服务质量.json` path in environment or `eas.json`

### Manual Upload (Alternative)
1. Download AAB from EAS dashboard
2. In Play Console → **Release** → **Create Release**
3. Upload AAB file
4. Add countries/regions (select Hong Kong, Taiwan, Singapore initially)
5. Save → Review rollout

---

## Step 6: Pricing & Distribution

1. **Pricing:** Free (or set price in HKD if paid)
2. **Countries:** All countries (or limit to HK/TW/SG)
3. **Declarations:**
   - [ ] Not a gambling app
   - [ ] Not an AI-generated content app
   - [ ] Not a news app
   - [ ] No ads in app (if applicable)

---

## Step 7: Android Permissions

Ensure permissions in `app.json` are justified:
- `RECEIVE_BOOT_COMPLETED` — for scheduled reminders
- `VIBRATE` — for notifications
- `SCHEDULE_EXACT_ALARM` — for precise reminder timing

These are all standard for parenting apps.

---

## Step 8: Submit for Review

1. All sections complete
2. Click **Submit for Review**
3. Google Play review typically takes 1-3 days (faster than Apple)

**Common rejection reasons to avoid:**
- [ ] Privacy policy URL must be real
- [ ] Screenshots must match current app UI
- [ ] Don't use misleading screenshots
- [ ] App functionality must match description

---

## Quick Checklist

- [ ] Create Play Console account
- [ ] Create app with package `com.jobblebaby.app`
- [ ] Upload 17 Play Store screenshots
- [ ] Set up feature graphic (1024×500)
- [ ] Write short + full description
- [ ] Complete content rating questionnaire
- [ ] Add privacy policy URL (placeholder OK for internal testing)
- [ ] Set up Internal Testing track
- [ ] Upload AAB file via EAS
- [ ] Submit for review