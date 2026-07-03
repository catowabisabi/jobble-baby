#!/usr/bin/env python3
"""Spark concept from cycle 1101 keywords"""
import sys
sys.path.insert(0, '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop')
from loop_routine import add_spark

concept = """## Lip Seal Competence Navigator — Oral Motor Breathing Development Tracker

### Problem
Lip seal competence (the ability to maintain a closed mouth with proper lip seal) is a critical but overlooked indicator of oral motor development and nasal breathing establishment. Babies who fail to develop adequate lip seal by 6-12 months may have prolonged mouth breathing, which affects sleep quality, facial development, and feeding efficiency. No app tracks lip seal as a discrete developmental milestone.

### Spark
From keywords: lip_seal_competence, cortical_reafferentation, fetal_microbiome_pool

### Solution
A navigator that tracks lip seal development alongside related oral motor milestones, nasal breathing establishment, and feeding efficiency.

### Sections
1. **Lip Seal Assessment** — Weekly log of lip seal quality during sleep and awake states. 3-level scale: sealed (good), partially open (monitor), mouth breathing (refer). Photo capture option.
2. **Nasal Breathing Establishment Timeline** — Track when baby consistently breathes through nose during feeds and sleep. Correlates with lip seal competence.
3. **Feeding Efficiency Overlay** — Does strong lip seal correlate with better bottle latch and fewer air intake events? Link to feeding tab.
4. **Facial Development Milestones** — Track midface development, absence of persistent open mouth posture, tongue resting position.
5. **Alert System** — Flags persistent mouth breathing at 6+ months, lip tie indicators, and referral to pediatric dentist/ENT.

### Technical
- File: app/(tabs)/lip-seal-navigator.tsx
- AsyncStorage: @jobble/lip_seal_log, @jobble/nasal_breathing_timeline
- i18n keys: lipSeal.*, nasalBreathing.*
- Links to: feeding tab, growth tab, suckle-to-chew-bridge tab
- TSC 0 errors

### Keywords
lip_seal_competence, nasal_breathing_establishment, oral_motor_development, mouth_breathing_timeline, facial_development_milestones, lip_tie_assessment, feeding_efficiency_index, tongue_resting_position, midface_development, pediatric_ent_referral
"""

add_spark(concept)
print("Spark added: Lip Seal Competence Navigator")
