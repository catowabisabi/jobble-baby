# App Store Connect Setup Guide — Jobble Baby

## Prerequisites
- Apple Developer Account (enoma@enomac.com or enomars@gmail.com)
- Bundle ID: `com.jobblebaby.app` (must match app.json)
- macOS with Xcode or EAS CLI configured

---

## Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Sign in with your Apple Developer account
3. Click **My Apps** → **+** → **New App**
4. Fill in:
   - **Platform:** iOS
   - **App Name:** Jobble Baby
   - **Primary Language:** English (or Traditional Chinese zh-Hant for HK)
   - **Bundle ID:** com.jobblebaby.app
   - **SKU:** JOBBLEBABY001
5. Click **Create**

---

## Step 2: Privacy Nutrition Labels

In App Store Connect, navigate to your app → **Privacy** → **App Privacy** → **Log In To Start**

Select all data types your app collects:

| Data Type | Collected? | Purpose |
|-----------|-----------|---------|
| Contact Info (name, email) | Optional (if user signs up) | Account creation |
| Health Info | Yes | Baby tracking (allergies, growth, milestones) |
| Device ID | Yes | Push notifications |

**Select "No" for:**
- Financial info, precise location, browsing history, purchase history, third-party advertising

Click **Save**.

---

## Step 3: Pricing and Availability

1. **Price:** Free (or $0.00)
2. **Availability:** All countries/regions (or limit to Hong Kong, Taiwan, Singapore if preferred)
3. **Age Rating:** Click **Complete** questionnaire:
   - Do users upload their own content? → No
   - Does app contain mature/adult content? → No
   - Is it a children's app? → Yes (for ages 4+)
   - Generate age rating (should be 4+)

---

## Step 4: Prepare for Build

### Option A: EAS Build (Recommended for CI/CD)
```bash
cd JobbleBaby
eas build --platform ios --profile production
```
Requires:
- Apple Team ID configured in `eas.json`
- App-Specific Password for EAS submission

### Option B: Manual Build via Xcode
1. Open `ios/jobblebaby.xcworkspace` in Xcode
2. Select your team in Signing & Capabilities
3. Archive → Distribute to App Store

---

## Step 5: Upload Screenshots

App Store requires screenshots for each device size. Use the 17 screenshots from `store/app-store-screenshots/`:

| Slot | Size | Use |
|------|------|-----|
| iPhone 6.5" (optional) | 1284×2778 | iPhone 11 Pro Max, XS Max |
| iPhone 5.5" | 1242×2208 | iPhone 8, 7, 6s Plus |
| iPad Pro 12.9" (optional) | 2048×2732 | iPad Pro |
| iPad Mini (optional) | 1536×2048 | iPad Mini |

**Note:** For initial submission, use the 5.5" screenshots as primary. All 17 tabs are shown but Apple may accept fewer in initial submission.

---

## Step 6: Write Store Description

Use content from `store/app-store-listing.md`:

**Promotional Text (170 chars):**
> Your all-in-one baby care companion — track, schedule, and shop smarter every day.

**Description (4000 chars):** Use the full description from `app-store-listing.md`.

**Keywords (100 chars):**
> baby tracker,infant care,feeding timer,sleep schedule,diaper log,new parent app,baby feeding app,sleep tracking baby,baby monitor,parenting app,Hong Kong baby app,baby care app,newborn tracker,baby schedule,feeding reminder,baby sleep app,diaper change tracker,baby development,baby milestones,baby routine,baby care companion

**Category:** Health & Fitness → Medical & Fitness (or Lifestyle)

---

## Step 7: Submit for Review

1. Ensure all sections are complete
2. Click **Add for Review**
3. Review typically takes 24-48 hours

**Common rejection reasons to avoid:**
- [ ] Don't require sign-in to use core features
- [ ] Don't use "baby monitor" terminology without actual monitoring
- [ ] Don't claim medical advice
- [ ] Privacy policy URL must be real (update from placeholder before submission)