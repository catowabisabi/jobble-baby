# Spark Concept Cycle 264
# From keywords: vestibular_calibration, labyrinthine_maturation, head_righting, tilt_sensitivity, postural_security

concept_title = "Vestibular Development Assessment"
concept_desc = """
## Concept: Vestibular Development Assessment Tab

### Spark
From keywords: vestibular_calibration + labyrinthine_maturation + head_righting + tilt_sensitivity + postural_security

### Problem
The vestibular system (inner ear) is the body's "balance center" and is critical for infant motor development. Parents have no structured way to track their baby's vestibular development — when to expect head righting, roll reflex integration, tilt sensitivity responses, and postural security milestones. Delays in vestibular development can predict later motor and coordination issues.

### UX Flow
1. **Baby Profile Setup**: Get birth date to calculate age-relative developmental windows
2. **Vestibular Milestone Timeline**: Visual timeline (0-12 months) showing expected vestibular milestones:
   - 0-2mo: Tilt sensitivity (response to position changes)
   - 1-3mo: Head righting (lifts head when pulled to sit)
   - 2-4mo: Labyrinthine righting (body adjusts to maintain head position)
   - 3-5mo: Roll reflex integration (controlled rolling)
   - 4-8mo: Postural security (sits steadily, reaches without falling)
   - 6-12mo: Vestibular-proprioceptive integration (cruises, stands with support)
3. **Milestone Check-in**: Log observed behaviors per milestone with date and notes
4. **Red Flag Alerts**: Alert if expected milestones are significantly delayed (>2 months past expected window)
5. **Activity Suggestions**: Context-aware activities to stimulate vestibular development:
   - Tummy time variations (inclined surfaces)
   - Gentle rocking in arms
   - Supported sitting practice
   - Babywearing for vestibular input
6. **Progress Dashboard**: Show coverage of all vestibular windows, highlight at-risk periods

### Data Model
- @jobble/baby_birthdate: ISO date string (shared with critical-periods)
- @jobble/vestibular_entries: JSON { [milestone_id]: [{ date, observed_behavior, notes }] }

### Technical Requirements
- Use existing theme: COLORS from ../theme, useTheme hook, useLanguage hook
- AsyncStorage keys: @jobble/baby_birthdate, @jobble/vestibular_entries
- Follow existing tab patterns (like reflex-tracker.tsx, milestones.tsx)
- i18n: add keys to en.json and zh.json under vestibularAssessment
- TSC 0 errors required
- Register in app/(tabs)/_layout.tsx
"""