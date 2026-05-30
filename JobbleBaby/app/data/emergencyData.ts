// Emergency SOS Data - Offline Crisis Triage Guides
// All content is embedded for offline access

export interface EmergencyGuide {
  id: string;
  titleKey: string;
  icon: string;
  color: string;
  sections: EmergencySection[];
}

export interface EmergencySection {
  titleKey: string;
  content: string;
  urgent?: boolean;
}

export interface EmergencyContact {
  id: string;
  labelKey: string;
  icon: string;
  phone: string;
  descriptionKey: string;
}

// Emergency Contacts - Numbers should be verified for your region
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'pediatrician',
    labelKey: 'emergency.pediatrician',
    icon: '👨‍⚕️',
    phone: '+85223322323', // Placeholder - replace with actual pediatrician
    descriptionKey: 'emergency.pediatricianDesc',
  },
  {
    id: 'poison_control',
    labelKey: 'emergency.poisonControl',
    icon: '☠️',
    phone: '+85227722222', // HK Poison Control Centre
    descriptionKey: 'emergency.poisonControlDesc',
  },
  {
    id: 'hospital',
    labelKey: 'emergency.nearestHospital',
    icon: '🏥',
    phone: '999', // Emergency services
    descriptionKey: 'emergency.hospitalDesc',
  },
];

// Crisis Triage Guides
export const EMERGENCY_GUIDES: EmergencyGuide[] = [
  {
    id: 'fever',
    titleKey: 'emergency.feverTitle',
    icon: '🌡️',
    color: '#e74c3c',
    sections: [
      {
        titleKey: 'emergency.feverWhatIs',
        content: 'Body temperature > 38°C (100.4°F) in babies under 3 months is always serious.',
        urgent: true,
      },
      {
        titleKey: 'emergency.feverSteps',
        content: `1. CHECK: Use rectal thermometer for accuracy\n2. REMOVE: Take off excess clothing\n3. HYDRATE: Offer breastmilk/formula more frequently\n4. MEDS: Paracetamol if >3 months and weight known\n5. MONITOR: Watch for seizures, rash, lethargy\n\n🚨 Go to A&E if:\n• Baby is <3 months old\n• Temperature >40°C\n• Has rash that doesn't fade when pressed\n• Convulsing or jerking\n• Very lethargic or unresponsive\n• Difficulty breathing`,
        urgent: true,
      },
      {
        titleKey: 'emergency.feverWarning',
        content: 'Never give aspirin to children. Never give ibuprofen to babies under 6 months.',
      },
    ],
  },
  {
    id: 'allergy',
    titleKey: 'emergency.allergyTitle',
    icon: '😰',
    color: '#e74c3c',
    sections: [
      {
        titleKey: 'emergency.allergySigns',
        content: `MILD: Hives, flushed skin, mild swelling\nMODERATE: More swelling, wheezing, throat tightness\nSEVERE (Anaphylaxis): Difficulty breathing, collapse, widespread hives\n\n⚠️ Anaphylaxis is life-threatening - act immediately!`,
        urgent: true,
      },
      {
        titleKey: 'emergency.allergySteps',
        content: `FOR MILD/MODERATE:\n1. Remove allergen if known\n2. Give antihistamine (consult doctor first)\n3. Watch closely for 2-4 hours\n\nFOR SEVERE (Anaphylaxis):\n1. CALL 999 IMMEDIATELY\n2. Use EpiPen if prescribed (push into outer thigh)\n3. Lay baby flat, raise legs\n4. If breathing stops, start CPR\n\n⚠️ Time is critical - don't wait to see if it improves!`,
        urgent: true,
      },
    ],
  },
  {
    id: 'seizure',
    titleKey: 'emergency.seizureTitle',
    icon: '⚡',
    color: '#e74c3c',
    sections: [
      {
        titleKey: 'emergency.seizureSigns',
        content: `• Body stiffens or goes rigid\n• Jerking movements\n• Eyes roll back\n• May stop breathing briefly\n• Unresponsive\n• May turn blue around mouth`,
        urgent: true,
      },
      {
        titleKey: 'emergency.seizureDo',
        content: `1. STAY CALM - most seizures last <2 minutes\n2. LAY baby on side on floor\n3. CLEAR area of hard/sharp objects\n4. DO NOT put anything in mouth\n5. TIME the seizure\n6. Loosen tight clothing\n\n🚨 CALL 999 IF:\n• Seizure >5 minutes\n• Baby doesn't wake up after\n• Another seizure follows\n• Baby has difficulty breathing\n• You suspect head injury`,
        urgent: true,
      },
      {
        titleKey: 'emergency.seizureAfter',
        content: 'After seizure: baby may be sleepy/confused. Keep calm, speak softly. Do not give food/water until fully alert.',
      },
    ],
  },
  {
    id: 'sids',
    titleKey: 'emergency.sidsTitle',
    icon: '😴',
    color: '#2ecc71',
    sections: [
      {
        titleKey: 'emergency.sidsWhat',
        content: 'Sudden Infant Death Syndrome - unexplained death during sleep. Peak age: 2-4 months.',
      },
      {
        titleKey: 'emergency.sidsPrevention',
        content: `✓ ALWAYS: Place baby on back to sleep\n✓ ALWAYS: Use firm mattress, nothing soft in crib\n✓ ALWAYS: Room-share (same room, different bed) until 6-12 months\n✓ AVOID: Smoking during pregnancy or after birth\n✓ AVOID: Co-sleeping on sofa/armchair\n✓ AVOID: Overheating (room at comfortable temp, no hats indoors)\n✓ CONSIDER: Pacifier at sleep time (reduces SIDS risk)\n\n🚨 No sleeping on stomach until baby can roll both ways`,
        urgent: true,
      },
    ],
  },
  {
    id: 'choking',
    titleKey: 'emergency.chokingTitle',
    icon: '窒息',
    color: '#e74c3c',
    sections: [
      {
        titleKey: 'emergency.chokingSigns',
        content: `• Can't cry or make sounds\n• Weak or ineffective cough\n• Soft/high-pitched sounds\n• Skin, lips or nails turning blue\n• Panic, wide eyes\n\n⚠️ If baby can cough - encourage them to keep coughing`,
        urgent: true,
      },
      {
        titleKey: 'emergency.chokingAction',
        content: `FOR BABIES UNDER 1 YEAR:\n\n1. BACK BLOWS:\n   - Lay baby face-down on your forearm\n   - Support head\n   - Give 5 firm back blows between shoulder blades\n\n2. CHEST THRUSTS:\n   - Turn baby face-up\n   - 2 fingers on breastbone (below nipples)\n   - Give 5 quick thrusts down\n\n3. REPEAT until object comes out or baby becomes unconscious\n\n🚨 IF BABY BECOMES UNCONSCIOUS: Call 999 and start CPR`,
        urgent: true,
      },
    ],
  },
  {
    id: 'cpr',
    titleKey: 'emergency.cprTitle',
    icon: '❤️',
    color: '#e74c3c',
    sections: [
      {
        titleKey: 'emergency.cprWhen',
        content: 'Baby is unresponsive and not breathing normally.',
        urgent: true,
      },
      {
        titleKey: 'emergency.cprSteps',
        content: `1. CALL 999 (put on speaker)\n2. Give 30 COMPRESSIONS:\n   - 2 fingers center of chest\n   - Push 4cm deep\n   - Fast rate (100-120/min)\n\n3. GIVE 2 RESCUE BREATHS:\n   - Tilt head back slightly\n   - Cover mouth AND nose with your mouth\n   - Blow gently until chest rises\n\n4. CONTINUE: 30 compressions → 2 breaths\n\n5. DON'T STOP until help arrives or baby recovers`,
        urgent: true,
      },
    ],
  },
];

// Baby info for display on SOS screen
export interface BabyInfoCard {
  name: string;
  ageMonths: number;
  ageText: string;
  weightKg: number | null;
  weightLbs: number | null;
}

// Calculate dosage info (always consult doctor first)
export function getDoseInfo(
  ageMonths: number,
  weightKg: number | null
): { paracetamol: string; ibuprofen: string } {
  const weight = weightKg || 5; // Default estimate if no weight

  const paracetamolDose = (weight * 10).toFixed(0); // 10-15mg/kg
  const ibuprofenDose = (weight * 5).toFixed(0); // 5-10mg/kg

  return {
    paracetamol: `${paracetamolDose}mg (max 4 doses/24h)`,
    ibuprofen: `${ibuprofenDose}mg (max 3 doses/24h)`,
  };
}