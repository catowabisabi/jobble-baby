#!/usr/bin/env python3
"""Spark concept from cycle 474 keywords"""
import sys
sys.path.insert(0, '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop')
from loop_routine import add_spark

concept = """## Stranger Anxiety + Ear Pressure Navigator

### Problem
At ~7-9 months, babies develop stranger anxiety (neophobic response to unfamiliar faces) AND face increased ear pressure issues during air travel or teething congestion. These two developmental phenomena share a common physiological substrate: trigeminal nerve sensitivity and middle ear pressure regulation. No existing baby app links these together.

### Solution
A combined navigator that tracks:
1. Stranger Anxiety Timeline — maps progression from familiar → wary → distressed responses to unfamiliar people. Links to developmental critical periods tab.
2. Air Travel Ear Comfort Protocol — pre-flight pressure equalization techniques, feeding during descent, congestion assessment before flying
3. Teething Pressure Correlation — tracks ear rubbing, fussiness peaks, links to teething tab
4. Composite Distress Index — combines stranger anxiety intensity + ear pressure + teething pain into one caregiver stress picture

### Features
- Stranger anxiety intensity scale (photos of familiar vs unfamiliar faces)
- Flight readiness checklist (age, congestion, recent ear infection)
- Pressure equalization logging (crying episodes during descent)
- Alert: "Stranger danger phase active — this is developmental NORMAL"

### Technical
- File: app/(tabs)/stranger-danger.tsx (already exists — upgrade it)
- AsyncStorage: @jobble/stranger_anxiety_log, @jobble/flight_pressure_log
- i18n keys: strangerDanger.*
- Links to: critical-periods.tsx, teething.tsx, growth.tsx

Keywords: neophobic_response, auditory_localization, cabin_pressure_equilibrium, stranger_anxiety_timeline, ear_pressure_equalization, developmental_distress_index, flight_readiness, trigeminal_sensitivity, familiar_face_recognition, descent_crying_correlation
"""

result = add_spark(
    title="Stranger Anxiety + Ear Pressure Navigator",
    description=concept,
    keywords="neophobic_response,auditory_localization,cabin_pressure_equilibrium,stranger_anxiety_timeline,ear_pressure_equalization,developmental_distress_index,flight_readiness,trigeminal_sensitivity",
    source="brainstorm_cycle474"
)
print(f"Spark result: {result}")
