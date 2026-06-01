# App Store Listing — Jobble Baby (Spec Document)

## A/B Title Variants

| Variant | Title | Rationale |
|---------|-------|-----------|
| A (Control) | Jobble Baby | Brand name, distinctive, memorable |
| B | Baby Care Tracker | Generic, higher search volume, competitive |
| C | Baby Log — Care Companion | Action-oriented, emphasizes logging |

Recommendation: Test Variant A first (brand differentiation). Switch to B if CPI >$2.50.

## 100-Char Keywords Field
baby tracker,infant care,feeding timer,sleep schedule,diaper log,new parent app,baby feeding app,sleep tracking baby,baby monitor,parenting app,Hong Kong baby app,baby care app,newborn tracker,baby schedule,feeding reminder,baby sleep app,diaper change tracker,baby development,baby milestones,baby routine,baby care companion

## Competition Analysis

| App | Strengths | Weaknesses | Opportunity |
|-----|-----------|------------|-------------|
| Baby Tracker (G呵噶) | #1 in HK parenting, simple UI | No Chinese, no sleep curriculum | Better local content |
| Feed Baby | Strong feeding timer | No sleep training, dated UI | Unified experience |
| Smart Baby Tracker | WHO growth charts | Complex, paid features | Gamification gap |
| Taipei Baby | Taiwan-focused | No HK brands | HK localization gap |

Differentiation: HK-first content, dark-mode UI (3am-friendly), English+Traditional Chinese, sleep training curriculum.

## iOS Rejection Risk Checklist

### MUST FIX Before Submission
- [ ] **Sign in required**: Do NOT force sign-in before app functionality works. Apple rejects apps requiring signup upfront.
- [ ] **Limited functionality in demo**: All 17 tabs must be functional without account. Only cloud sync requires account.
- [ ] **Privacy nutrition labels**: Required in App Store Connect — declare all data collected (tracking data, photos, growth data).
- [ ] **HK privacy policy**: Must have a valid URL. Placeholder `https://jobblebaby.com/privacy` is NOT acceptable.
- [ ] **Screenshots must match current UI**: App has 17 tabs, screenshots only show 7. Update screenshots.
- [ ] **Missing age rating**: Select "4+" or "12+" for baby/parenting app correctly.

### COMMON REJECTION REASONS (Preventive)
- [ ] Do NOT use "baby monitor" in screenshots without actual monitor functionality
- [ ] Do NOT claim "doctor-approved" or medical claims without evidence
- [ ] "SIDS prevention" wording is medical — use "safe sleep" instead
- [ ] Screenshots: Do NOT show real baby photos without model release
- [ ] In-app purchases must show price in local currency (HKD)
- [ ] If sharing data with third parties (analytics, crash reporting), disclose in privacy policy

### SUBMISSION FLOW
1. Create App Store Connect account (enomars@gmail.com)
2. Create app: Bundle ID `com.jobblebaby.app`
3. Fill: Privacy, Pricing, Availability
4. Upload screenshots (17-tab version)
5. Submit for review — expect 24-48hr turnaround

## Promotional Text (100 chars)
Your all-in-one baby care companion — track, schedule, and shop smarter every day.

## Full Description (4000 chars) — DO NOT MODIFY WITHOUT ASO REVIEW

**MEET JOBBLE BABY**
The all-in-one companion for new parents navigating the beautiful chaos of early parenthood. Jobble Baby brings together smart tracking, gentle scheduling, and curated product discovery — so you can spend less time worrying and more time bonding.

**TRACK EVERYTHING, MISS NOTHING**
- Diaper log: one-tap tracking with timestamp and notes
- Feeding timer: breast, bottle, and solids with duration and amount
- Sleep tracker: monitor nap cycles and nighttime sleep patterns
- Growth记录: track height, weight, and milestones with photo memories

**SCHEDULE WITH CONFIDENCE**
- Personalized sleep schedules that adapt to your baby's natural rhythms
- Feeding reminders tuned to your baby's age and needs
- Medication and supplement alerts with dosage tracking
- Share schedules with caregivers, grandparents, and your partner seamlessly

**DISCOVER TRUSTED PRODUCTS**
- Curated product recommendations based on your baby's age and developmental stage
- Hong Kong and international brand reviews from real parents
- Easy shopping links to verified retailers

**DESIGNED FOR PEACE OF MIND**
- Clean, dark-mode interface — designed for 3am diaper changes without harsh lights
- Fully offline: track without internet, sync when connected
- Local data storage: your family's data stays on your device
- Supports English and Traditional Chinese

**JOIN THOUSANDS OF HONG KONG PARENTS**
Recommended by parenting groups and maternal health professionals across Hong Kong.

Download Jobble Baby today and turn chaos into confidence.

---
For support: support@jobblebaby.com
Privacy Policy: https://jobblebaby.com/privacy
Terms of Service: https://jobblebaby.com/terms

## Screenshot Specs (17-tab version — UPDATE REQUIRED)

Current screenshots: 7 tabs only. Need to regenerate for all 17 tabs.
Required tabs: Home, Tracking, Schedule, Products, Growth, Milestones, Allergens, Sleep Training, Circadian, Milk Prep, Monitor Correlation, Shift Handoff, Stress Cascade, Teething, Doctor Visit, Profile

### iPhone 6.7" (iPhone 14/15 Pro)
- Size: 1290 x 2796 pixels
- Required: YES
- Show: Home tab + any 2 feature tabs

### iPhone 6.5" (iPhone 11 Pro Max/XS Max)
- Size: 1242 x 2688 pixels
- Required: YES

### iPad (12.9" iPad Pro)
- Size: 2048 x 2732 pixels
- Required: YES
- Show: All 17 tabs visible in tab bar

## Localizable Info
- Primary: English (en-US)
- Secondary: Traditional Chinese (zh-Hant-HK)
