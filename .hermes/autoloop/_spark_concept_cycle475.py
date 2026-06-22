#!/usr/bin/env python3
"""Spark concept cycle 475"""
import sqlite3, os, sys
from datetime import datetime

DB = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/.hermes/autoloop/progress.db'
now = datetime.utcnow().isoformat()

concept_title = "Cortisol Shadow + Terahertz Skin Navigator + Tongue-Tie Reassessment"
concept_desc = """
## Cortisol Shadow + Terahertz Skin Navigator + Tongue-Tie Reassessment

### Problem
Parents often miss early signs of skin inflammation, stress hormone patterns (cortisol shadow), and functional oral restrictions (tongue-tie) that compound into feeding difficulties, sleep disruption, and developmental delays. No existing baby app integrates these three into one correlative dashboard.

### Solution
A combined navigator that tracks:
1. Cortisol Shadow Timeline — tracks fussiness peaks, skin flushing, HPA-axis activation markers correlated with stress
2. Terahertz Skin Imaging Navigator — captures parent-observed skin changes as early inflammatory signals
3. Tongue-Tie Reassessment Protocol — periodic functional assessment of oral mobility, feeding efficiency, and referral triggers

### Features
- Cortisol proxy indicators: sleep fragmentation, feeding strikes, skin flushing scores
- Skin change log: photo + text observations with timeline view
- Tongue-tie functional screen: 5-question assessment → referral recommendation
- Composite Stress-Inflammation Index combining all three domains

### Technical
- New file: app/(tabs)/cortisol-skin-navigator.tsx
- AsyncStorage: @jobble/cortisol_log, @jobble/skin_change_log, @jobble/tongue_tie_assessment
- i18n keys: cortisolSkin.*
- Links to: sleep-architecture.tsx, feeding-progression.tsx, growth.tsx

Keywords: terahertz_skin_imaging, cortisol_shadow, tongue_tie_reassessment, hpa_axis_activation, skin_flushing_score, feeding_efficiency_index, inflammatory_early_warning, oral_mobility_assessment, stress_composite_index, referral_trigger_protocol
"""

keywords = "terahertz_skin_imaging,cortisol_shadow,tongue_tie_reassessment,hpa_axis_activation,skin_flushing_score,feeding_efficiency_index"

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Insert idea
cur.execute("""INSERT INTO ideas(title, description, keywords, source, status, priority, created_at)
    VALUES (?, ?, ?, ?, 'new', 2, ?)""",
    (concept_title, concept_desc, keywords, 'brainstorm_cycle475', now))
idea_id = cur.lastrowid

# Insert todo linked to idea
cur.execute("""INSERT INTO todos(title, description, status, priority, from_idea_id, created_at)
    VALUES (?, ?, 'new', 2, ?, ?)""",
    (f"Implement {concept_title}", concept_desc, idea_id, now))

conn.commit()
print(f"Created idea #{idea_id}: {concept_title}")
print(f"Created todo from idea #{idea_id}")
conn.close()
