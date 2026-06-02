# Jobble Baby — User Intention

## App Purpose
Jobble Baby is a calm, privacy-first baby tracking app for HK/Asian parents. Core value:
"Fewer clicks, more presence." The app reduces parental cognitive load through
ambient, glanceable tracking — not dashboards or gamification overload.

## Core Features (v1)
- **Tracking**: Sleep, feeding, diaper — one-tap logging, minimal friction
- **Schedule**: Wake windows, feed intervals, sleep timing
- **Growth**: WHO percentile chart for height/weight
- **Milestones**: Photo capture with timestamp and age
- **Allergens**: FPIES/IgE/non-IgE food reaction tracking with timeline
- **Sleep Training**: Curriculum + method tracker (Ferber/extinction/chair/fading)
- **Gear Check**: Context-aware outing checklist (weather + trip type)
- **Circadian Dashboard**: Shift-handoff + baby sleep phase visualization
- **Stress Cascade**: Parental burnout detection + breathing intervention
- **Teething**: 20-tooth chart + pain/remedy log
- **Milk Prep Guide**: Thaw guidelines, freezer stash, expiry tracking
- **Doctor Visit Export**: Shareable summary for pediatrician
- **Parental Shift Handoff**: QR code schedule sharing with caregiver
- **Reflex Tracker**: Primitive reflex milestone tracking
- **Sleep Debt Dashboard**: Parental sleep deficit vs baby regression correlation
- **Emergency SOS**: Panic mode with breathing + safe space checklist

## Target Market
- Primary: HK parents (6-18 month baby, working parents, dual-income households)
- Secondary: Taiwan, Singapore, Malaysia Chinese-speaking parents
- ASO: "bb 追蹤 / 嬰兒 sleep / 餵奶 記錄 / 育兒 app"

## App Store Goal
- iOS: App Store HK (English + Chinese listing)
- Android: Play Console HK
- Privacy: No account required, all data on-device (AsyncStorage)
- No push notifications initially (manual reminders only)

## Design Principles
- Calm technology: no alarms, no badges, no dark patterns
- Dark theme default + light mode toggle (WCAG 2.1 AA)
- One-hand operation for sleep-deprived parents
- Data sovereignty: export/import JSON backup
- Minimal onboarding: name + birth date + gender only
- Trust architecture: no ads, no data selling

## Submission Blockers (user action needed)
1. Apple Team ID + App-Specific Password for EAS credentials
2. App Store screenshots (6.7" iPhone + 6.5" + iPad 12.9")
3. Google Service Account JSON for Play Console
4. Privacy policy page at real URL
5. Create apps in App Store Connect + Play Console

## Out of Scope v1
- Video/audio baby monitor integration
- Cloud sync / multi-device
- Direct doctor integration / FHIR
- Social / community features