# Jobble Baby — User Intention

## Product Vision
Jobble Baby is an AI-powered job-hunting assistant mobile app (Expo/React Native) targeting Hong Kong fresh graduates and young professionals. The core value proposition: upload your CV → get an instant AI score reveal (Aha Moment) → receive personalized job matches, interview practice, and salary benchmarking → subscribe for premium features.

## Core User Journey
1. **Onboarding**: User launches app for first time → 4-step wizard guides them through CV upload (score reveal = Aha Moment), job preferences, interview tryout, and notification enable
2. **Free tier**: Upload CV, see score/breakdown, basic job matches, salary query
3. **Premium tier (HK$99-299/mo)**: AI interview simulation, CV optimization, push notifications for new matching jobs (recruiter radar)
4. **Retention**: Gamification (achievement badges, milestone celebrations), progress tracking, salary comparator with nudge CTA

## Target Users
- Hong Kong fresh university graduates
- Young professionals (1-3 years experience) looking to switch jobs
- Cantonese-speaking, bilingual (Chinese/English CV)

## Tech Stack
- Frontend: Expo/React Native (file-based routing, TypeScript)
- Backend: Python FastAPI
- Database: SQLite (via SQLAlchemy) — tables: users, cvs, job_alerts, notifications, cv_score_history, milestone_achievements
- Auth: JWT tokens, SecureStore for mobile storage

## MVP Features (M1-M5)
- M1: CV upload, AI scoring (1-10 breakdown), profile screen
- M2: Job listing browsing, explore screen
- M3: Salary query tool with market comparison
- M4: Interview practice with AI feedback, readiness dashboard
- M5: Job alerts, push notifications, premium subscription paywall

## Current State (as of 2026-05-23)
- Onboarding wizard task (#23, new) is the highest priority pending work
- Interview readiness dashboard (todo #22) marked completed
- TypeScript clean build verified
- Premium gate/subscription UI exists (subscription.tsx)
- Job alerts UI exists (job-alerts.tsx) but backend job alert system needs implementation (painpoint #9)
- No push notification backend yet (painpoint #9)
- No subscription backend upgrade endpoint yet (painpoint #10)