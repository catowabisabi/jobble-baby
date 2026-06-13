dispatch_content = """# Todo #135: Implement Post-Procedure Feeding and Recovery Navigator
# Keywords: post_procedure_feeding, frenotomy_recovery, wound_monitoring, recovery_timeline, medication_dosing

GOAL: Build a new navigator tab for post-procedure infant recovery tracking.

STEP 1 — Create app/(tabs)/procedure-recovery.tsx:
A comprehensive recovery tracking tab with these sections:

1. **Procedure Log Section**
   - procedureType: picker (frenotomy/frenulectomy/ear tubes/hernia repair/other)
   - procedureDate: date input
   - clinic/surgeon: text inputs
   - instructionsPhoto: camera/gallery capture

2. **Feeding Recovery Tracker** (for frenotomy/frenulectomy)
   - latchQuality: 1-5 star rating
   - feedingDuration: minutes
   - bottleAcceptance: accept/partial/refuse
   - painResponse: 1-5 scale
   - Alert if no feeding for 12+ hours

3. **Pain and Comfort Score**
   - painScore: 1-5 slider
   - comfortMeasures: checklist (swaddle/swing/pacifier/medication)

4. **Medication Log**
   - drug: Acetaminophen / Ibuprofen picker
   - doseMg: auto-calculated from weight (acetaminophen: 15mg/kg, ibuprofen: 10mg/kg)
   - weightKg: stored/fetched from profile
   - timestamp

5. **Wound Monitoring**
   - photoCapture: camera for surgical site
   - healingStatus: normal/concerning signs picker
   - notes: text

6. **Recovery Timeline**
   - procedureType-specific expected curve
   - Day 1-3: expect swelling
   - Day 4-7: feeding should improve
   - Week 2: back to baseline
   - Track actual vs expected milestones

7. **Doctor Alert**
   - If pain > 3 for 3+ days → prompt to call doctor
   - If fever > 38°C → prompt to call doctor
   - If no feeding for 24hrs → prompt to call doctor

STEP 2 — Add Tabs.Screen to app/(tabs)/_layout.tsx:
```tsx
<Tabs.Screen
  name="procedure-recovery"
  options={{
    title: t('tabs.procedureRecovery'),
    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />,
  }}
/>
```

STEP 3 — Add i18n keys to app/i18n/en.json + zh.json:
- tabs.procedureRecovery: "Recovery" / "康復"
- procedureRecovery.*: all labels and messages

STEP 4 — Verify: cd JobbleBaby && node ../scripts/pre-submission-audit.js
All checks must PASS.

DONE
ULW"""
print(dispatch_content)
