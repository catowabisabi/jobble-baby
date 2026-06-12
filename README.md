# Jobble Baby — App Specification

> Smart infant care companion for new parents. Track, learn, and thrive together.

[![Expo](https://img.shields.io/badge/Expo-~56.0.0-000000?style=flat-square&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![i18n](https://img.shields.io/badge/i18n-En|Zh-28c3d4?style=flat-square)](src/i18n/)

---

## 📱 App Overview

**Jobble Baby** is a comprehensive infant care tracking and guidance app for iOS and Android, built with Expo.

It helps new parents navigate the 0–12 month journey through:
- 📊 **Structured tracking** across 16 care domains (feeding, sleep, growth, development, health)
- 🧠 **Evidence-based guidance** grounded in pediatric, neuroscience, and developmental science
- 🔗 **Cross-domain correlation** — connecting systems (gut-brain, sensory-motor, autonomic) that affect each other
- 👨‍👩‍👧‍👦 **Dyadic features** — tracking parent and baby as an inseparable regulation unit
- 🌍 **Bilingual** — full English and Traditional Chinese (zh) localization

---

## 🗂️ App Structure (16 Tabs)

| # | Tab | Description |
|---|-----|-------------|
| 1 | Home | Dashboard with today's priorities and alerts |
| 2 | Tracking | Quick-log feeds, diapers, sleep, mood |
| 3 | Schedule | Daily routine planner with reminders |
| 4 | Products | Baby gear rating and recall database |
| 5 | Growth | Weight/height/length charts with WHO standards |
| 6 | Milestones | Developmental milestone tracker with alerts |
| 7 | Allergens | Food allergen reaction log and introduction guide |
| 8 | Sleep Training | Sleep method selection, Feretoy, fading techniques |
| 9 | Circadian | Circadian rhythm entrainment for 0–6 months |
| 10 | Milk Prep | Infant formula preparation safety checker |
| 11 | Monitor Correlation | Cross-tab correlation insights |
| 12 | Shift Handoff | Caregiver shift log with notes and alerts |
| 13 | Stress Cascade | Polyvagal-informed parent stress tracking |
| 14 | Teething | Teething pain relief with symptom correlation |
| 15 | Doctor Visit | Pre-visit preparation and post-visit summary |
| 16 | Profile | Baby info, app settings, data export |

---

## 🧬 Science Foundation

Jobble Baby is grounded in cross-disciplinary research:

- **Polyvagal Theory** (Porges) — autonomic nervous system regulation, co-regulation, window of tolerance
- **Gut-Brain Axis** — microbiome-enteric nervous system-brain signaling, infant microbiome colonization
- **Sensory Integration** (Ayres) — tactile, vestibular, proprioceptive, oral-motor development
- **Primitive Reflex Integration** (Stegeren) — Moro, rooting, palmar, ATNR, Babinski, Galant, stepping reflexes
- **Circadian Entrainment** — suprachiasmatic nucleus, melatonin, cortisol rhythms in infancy
- **Interoceptive Precision** — gut feelings, body awareness, parent–baby interoceptive synchrony
- **Dyadic Synchrony** — cardiorespiratory entrainment, gaze synchronization, co-regulation loops

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 56 |
| Language | TypeScript 5.3 (strict) |
| Navigation | Expo Router (file-based) |
| State | React Context + AsyncStorage |
| Styling | StyleSheet + custom theme system |
| i18n | react-i18next (en.json + zh.json) |
| Charts | React Native SVG charts |
| Build | EAS Build + Expo prebuild (iOS/Android) |
| Validation | TSC + pre-submission-audit.js |

---

## 📁 Key Directories

```
JobbleBaby/
├── app/(tabs)/          # 16 tab screens (Expo Router)
├── app/_layout.tsx      # Root layout with TabNavigator
├── components/          # Reusable UI components
├── context/             # Theme, i18n, app state contexts
├── data/                # Reference data (milestones, products, WHO growth)
├── docs/
│   ├── concepts/        # Feature concept specs
│   ├── App Store/       # App Store listing + screenshots
│   └── Play Store/      # Play Store listing + screenshots
├── hooks/               # Custom React hooks
├── i18n/                # en.json + zh.json
├── scripts/             # Build and audit scripts
├── store/               # AsyncStorage key registry
├── theme.ts             # Design tokens
└── utils/               # Helpers (date, validation, calculation)
```

---

## ✅ Pre-Submission Audit

Run the full pre-submission validation:

```bash
cd JobbleBaby
node scripts/pre-submission-audit.js
```

Checks include:
- ✅ Tab Navigator integrity (all 16 tabs)
- ✅ i18n coverage (all strings translated)
- ✅ app.json completeness
- ✅ TSC parse (0 errors)
- ✅ Accessibility labels (WCAG 2.1 AA)
- ✅ No hardcoded strings (all UI uses i18n)
- ✅ AsyncStorage key registry consistency

---

## 🚀 Getting Started

```bash
cd JobbleBaby
npm install
npx expo start
```

Build for production:
```bash
eas build --platform ios
eas build --platform android
```

---

## 📦 Submission Status

| Item | Status |
|------|--------|
| Code (all 16 tabs) | ✅ Complete |
| TypeScript (0 errors) | ✅ Pass |
| i18n (en + zh) | ✅ Complete |
| Expo prebuild (iOS + Android) | ✅ Complete |
| App Store listing spec | ✅ Ready |
| Play Store listing spec | ✅ Ready |
| Privacy policy | ⚠️ Needs deployment to live URL |
| EAS iOS credentials | ⏳ User action required |
| EAS Android credentials | ⏳ User action required |
| App Store Connect app | ⏳ User action required |
| Play Console app | ⏳ User action required |

---

## 🔑 AsyncStorage Keys

Core keys registered in `store/storage-keys.ts`:
- `@jobble/baby_profile` — Baby name, DOB, gestational age
- `@jobble/feeding_log` — Feed entries
- `@jobble/sleep_log` — Sleep entries
- `@jobble/diaper_log` — Diaper entries
- `@jobble/growth_records` — Weight, length, head circumference
- `@jobble/milestone_log` — Developmental milestones
- `@jobble/ allergen_log` — Food allergen reactions
- ... (60+ total keys)

---

## 🌐 Localization

All user-facing strings use `t('key')` from `i18n.ts`. To add/modify strings:

1. Edit `src/i18n/en.json` and `src/i18n/zh.json`
2. Ensure all keys are present in both files
3. Run `node scripts/pre-submission-audit.js` to verify coverage

---

*Last updated: Cycle 324 · App submission-ready (code perspective)*