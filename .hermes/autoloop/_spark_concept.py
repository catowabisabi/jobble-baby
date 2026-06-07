import sqlite3
from datetime import datetime
DB = 'progress.db'
c = sqlite3.connect(DB)
now = datetime.utcnow().isoformat()

concept_desc = """## Concept: Post-Procedure Feeding & Recovery Navigator

### Spark
From keywords: post_procedure_feeding + bone_age_assessment + skin_conductance

### Problem
After minor infant procedures (frenotomy/tongue-tie release, frenulectomy, ear tube insertion, minor hernia repair), parents receive discharge instructions but have no app to track recovery. They wonder: is baby feeding normally yet? Is the pain level acceptable? When to call the doctor? The gap between discharge and follow-up is a high-anxiety period with no structured support.

### UX Flow
1. **Procedure Log**: Log procedure type, date, surgeon/clinic, post-op instructions (photo-capture of instructions)
2. **Feeding Recovery Tracker**: For frenotomy/frenulectomy — track return to feeding (BF latch quality 1-5, bottle acceptance, feeding duration, pain response during feeds). Alert if no feeding for 12+ hours.
3. **Pain and Comfort Score**: Simple 1-5 scale input. Skin conductance proxy (if wearables available). Correlate with feeding willingness.
4. **Medication Log**: Acetaminophen/ibuprofen dosing with weight-based calculator. Timing reminders. Track response to medication.
5. **Wound Monitoring Guide**: Photo-log surgical site (tongue, lip, ear, groin). Visual comparison: normal healing vs infection signs. Alert thresholds.
6. **Recovery Timeline**: Procedure-specific expected recovery curve. Day 1-3: expect swelling. Day 4-7: feeding should improve. Week 2: back to baseline. Track actual vs expected.
7. **Follow-up Alert**: Set reminder for follow-up appointment. Pre-visit checklist: questions to ask, photos to bring.
8. **Pediatrician Alert**: If pain score stays above 3 for 3+ days, or fever above 38C, or no feeding for 24hrs — prompt to call doctor.

### Data Model
- @jobble/procedure_log: date, procedure_type, clinic, surgeon, photo_instructions
- @jobble/feeding_recovery: date, latch_quality, duration_min, pain_score, notes
- @jobble/medication_log: date, drug, dose_mg, weight_kg, response
- @jobble/wound_photo: date, procedure_type, photo_uri, healing_status
- @jobble/recovery_timeline: procedure_type, day, expected_milestone, actual_status

### Integration
- Links to tongue-tie tab (pre/post frenotomy)
- Links to medicine-dose tab (acetaminophen calculator)
- Links to clinician-portal (procedure info in visit report)
- Links to cry-analyzer (pain crying differentiation)
- Links to growth tab (weight tracking post-procedure)

### Badge
- Recovery Champion: Completed full post-procedure tracking for any procedure
- Feeding Restored: Returned to baseline feeding within expected recovery window

### Design
- Calm, reassuring UI — not clinical or alarming
- Progress timeline with gentle green/amber/red states
- One-handed logging for busy parents
- Clear call doctor escalation path with phone shortcut

### Keywords
post_procedure_feeding,bone_age_assessment,skin_conductance,frenotomy_recovery,feeding_restoration,post_op_pain_management,wound_monitoring,recovery_timeline,follow_up_alert,pediatrician_alert,procedure_log,feeding_recovery_tracker,pain_comfort_score,medication_dosing,healing_curve,discharge_instructions,post_frenulectomy,post_hernia_repair,infant_procedure_recovery,recovery_milestones
"""

cur = c.cursor()
cur.execute("""INSERT INTO concepts(title, description, keywords, status, created_at) VALUES (?, ?, ?, ?, ?)""",
    ("Post-Procedure Feeding and Recovery Navigator",
     concept_desc,
     "post_procedure_feeding,bone_age_assessment,skin_conductance,frenotomy_recovery,feeding_restoration,post_op_pain_management,wound_monitoring,recovery_timeline",
     "draft",
     now))
concept_id = cur.lastrowid
c.commit()
print(f"Created concept #{concept_id}: Post-Procedure Feeding and Recovery Navigator")
print(c.execute("SELECT COUNT(*) FROM concepts").fetchone()[0], "total concepts")
