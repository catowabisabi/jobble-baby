import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY_PROCEDURE = '@jobble/procedure_log';
const STORAGE_KEY_FEEDING = '@jobble/feeding_recovery';
const STORAGE_KEY_MEDICATION = '@jobble/medication_log';
const STORAGE_KEY_WOUND = '@jobble/wound_photo';
const STORAGE_KEY_PAIN = '@jobble/procedure_pain_log';
const STORAGE_KEY_INTEROCEPTIVE = '@jobble/interoceptive_log';
const STORAGE_KEY_MORO = '@jobble/moro_reflex_log';
const STORAGE_KEY_ANALGESIA = '@jobble/analgesia_log';

interface ProcedureEntry {
  id: string; date: string; procedureType: string; clinic: string; surgeon: string;
}
interface FeedingEntry {
  id: string; date: string; latchQuality: number; durationMin: number;
  bottleAcceptance: string; painResponse: number; notes: string;
}
interface MedicationEntry {
  id: string; date: string; drug: string; doseMg: number; weightKg: number;
}
interface WoundEntry {
  id: string; date: string; healingStatus: string; notes: string;
}
interface PainEntry {
  id: string; date: string; procedureType: string;
  painPre: number; pain15min: number; pain1hr: number; pain4hr: number; pain24hr: number;
  painTrigger: string; notes: string;
}
interface InteroceptiveEntry {
  id: string; date: string; hunger: number; thirst: number; temperature: number;
  bladder: number; gut: number; fatigue: number; notes: string;
}
interface MoroEntry {
  id: string; date: string; intensity: number; durationSec: number;
  recoverySec: number; integrationStatus: string;
}
interface AnalgesiaEntry {
  id: string; date: string; method: string; prePain: number; postPain: number;
  onsetMin: number; durationHrs: number; sideEffects: string;
}

const PROCEDURE_TYPES = [
  { value: 'frenotomy', labelKey: 'procedureRecovery.procedureTypes.frenotomy' },
  { value: 'frenulectomy', labelKey: 'procedureRecovery.procedureTypes.frenulectomy' },
  { value: 'ear_tubes', labelKey: 'procedureRecovery.procedureTypes.ear_tubes' },
  { value: 'hernia_repair', labelKey: 'procedureRecovery.procedureTypes.hernia_repair' },
  { value: 'other', labelKey: 'procedureRecovery.procedureTypes.other' },
];
const HEALING_STATUSES = [
  { value: 'normal', labelKey: 'procedureRecovery.healingStatuses.normal' },
  { value: 'mild_swelling', labelKey: 'procedureRecovery.healingStatuses.mild_swelling' },
  { value: 'infection_signs', labelKey: 'procedureRecovery.healingStatuses.infection_signs' },
  { value: 'bleeding', labelKey: 'procedureRecovery.healingStatuses.bleeding' },
  { value: 'other', labelKey: 'procedureRecovery.healingStatuses.other' },
];
const BOTTLE_OPTIONS = [
  { value: 'accept', labelKey: 'procedureRecovery.bottleOptions.accept' },
  { value: 'partial', labelKey: 'procedureRecovery.bottleOptions.partial' },
  { value: 'refuse', labelKey: 'procedureRecovery.bottleOptions.refuse' },
];
const PAIN_PROCEDURE_TYPES = [
  { value: 'vaccination', labelKey: 'procedureRecovery.painTracker.procedureTypes.vaccination' },
  { value: 'blood_draw', labelKey: 'procedureRecovery.painTracker.procedureTypes.blood_draw' },
  { value: 'lumbar_puncture', labelKey: 'procedureRecovery.painTracker.procedureTypes.lumbar_puncture' },
  { value: 'catheter', labelKey: 'procedureRecovery.painTracker.procedureTypes.catheter' },
  { value: 'eye_exam', labelKey: 'procedureRecovery.painTracker.procedureTypes.eye_exam' },
];
const PAIN_TRIGGERS = [
  { value: 'needle', labelKey: 'procedureRecovery.painTracker.triggers.needle' },
  { value: 'positioning', labelKey: 'procedureRecovery.painTracker.triggers.positioning' },
  { value: 'restraint', labelKey: 'procedureRecovery.painTracker.triggers.restraint' },
  { value: 'fasting', labelKey: 'procedureRecovery.painTracker.triggers.fasting' },
  { value: 'anesthesia_wearoff', labelKey: 'procedureRecovery.painTracker.triggers.anesthesia_wearoff' },
];
const MORO_STATUS_OPTIONS = [
  { value: 'present', labelKey: 'procedureRecovery.moroReflexLog.statusOptions.present' },
  { value: 'diminished', labelKey: 'procedureRecovery.moroReflexLog.statusOptions.diminished' },
  { value: 'absent', labelKey: 'procedureRecovery.moroReflexLog.statusOptions.absent' },
  { value: 'exaggerated', labelKey: 'procedureRecovery.moroReflexLog.statusOptions.exaggerated' },
];
const ANALGESIA_METHODS = [
  { value: 'sucrose', labelKey: 'procedureRecovery.analgesiaLog.methods.sucrose' },
  { value: 'breastfeeding', labelKey: 'procedureRecovery.analgesiaLog.methods.breastfeeding' },
  { value: 'skin_to_skin', labelKey: 'procedureRecovery.analgesiaLog.methods.skin_to_skin' },
  { value: 'swaddling', labelKey: 'procedureRecovery.analgesiaLog.methods.swaddling' },
  { value: 'acetaminophen', labelKey: 'procedureRecovery.analgesiaLog.methods.acetaminophen' },
  { value: 'ibuprofen', labelKey: 'procedureRecovery.analgesiaLog.methods.ibuprofen' },
  { value: 'holistic', labelKey: 'procedureRecovery.analgesiaLog.methods.holistic' },
  { value: 'none', labelKey: 'procedureRecovery.analgesiaLog.methods.none' },
];
const SIDE_EFFECTS = [
  { value: 'none', labelKey: 'procedureRecovery.analgesiaLog.effects.none' },
  { value: 'drowsiness', labelKey: 'procedureRecovery.analgesiaLog.effects.drowsiness' },
  { value: 'vomiting', labelKey: 'procedureRecovery.analgesiaLog.effects.vomiting' },
  { value: 'rash', labelKey: 'procedureRecovery.analgesiaLog.effects.rash' },
];

export default function ProcedureRecoveryScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const [procedure, setProcedure] = useState<ProcedureEntry | null>(null);
  const [feedingLog, setFeedingLog] = useState<FeedingEntry[]>([]);
  const [medicationLog, setMedicationLog] = useState<MedicationEntry[]>([]);
  const [woundLog, setWoundLog] = useState<WoundEntry[]>([]);
  const [activeSection, setActiveSection] = useState('procedure');
  const [procedureType, setProcedureType] = useState('frenotomy');
  const [procedureDate, setProcedureDate] = useState(new Date().toISOString().split('T')[0]);
  const [clinic, setClinic] = useState('');
  const [surgeon, setSurgeon] = useState('');
  const [latchQuality, setLatchQuality] = useState(3);
  const [feedingDuration, setFeedingDuration] = useState('');
  const [bottleAcceptance, setBottleAcceptance] = useState('accept');
  const [painResponse, setPainResponse] = useState(3);
  const [feedingNotes, setFeedingNotes] = useState('');
  const [drug, setDrug] = useState('acetaminophen');
  const [doseMg, setDoseMg] = useState('');
  const [weightKg, setWeightKg] = useState('');
  // Section A: Pain Tracker
  const [painLog, setPainLog] = useState<PainEntry[]>([]);
  const [painProcedureType, setPainProcedureType] = useState('vaccination');
  const [painPre, setPainPre] = useState(0);
  const [pain15min, setPain15min] = useState(0);
  const [pain1hr, setPain1hr] = useState(0);
  const [pain4hr, setPain4hr] = useState(0);
  const [pain24hr, setPain24hr] = useState(0);
  const [painTrigger, setPainTrigger] = useState('needle');
  const [painNotes, setPainNotes] = useState('');
  // Section B: Interoceptive
  const [interoLog, setInteroLog] = useState<InteroceptiveEntry[]>([]);
  const [hunger, setHunger] = useState(0);
  const [thirst, setThirst] = useState(0);
  const [tempSig, setTempSig] = useState(0);
  const [bladder, setBladder] = useState(0);
  const [gut, setGut] = useState(0);
  const [fatigue, setFatigue] = useState(0);
  const [interoNotes, setInteroNotes] = useState('');
  // Section C: Moro Reflex
  const [moroLog, setMoroLog] = useState<MoroEntry[]>([]);
  const [moroIntensity, setMoroIntensity] = useState(0);
  const [moroDuration, setMoroDuration] = useState('');
  const [moroRecovery, setMoroRecovery] = useState('');
  const [moroStatus, setMoroStatus] = useState('present');
  // Section D: Analgesia
  const [analgesiaLog, setAnalgesiaLog] = useState<AnalgesiaEntry[]>([]);
  const [analgesiaMethod, setAnalgesiaMethod] = useState('none');
  const [analgesiaPrePain, setAnalgesiaPrePain] = useState(0);
  const [analgesiaPostPain, setAnalgesiaPostPain] = useState(0);
  const [analgesiaOnset, setAnalgesiaOnset] = useState('');
  const [analgesiaDuration, setAnalgesiaDuration] = useState('');
  const [analgesiaSideEffects, setAnalgesiaSideEffects] = useState('none');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [proc, feed, med, wound, pain, intero, moro, analgesia] = await Promise.all([
        safeGetItem(STORAGE_KEY_PROCEDURE),
        safeGetItem(STORAGE_KEY_FEEDING),
        safeGetItem(STORAGE_KEY_MEDICATION),
        safeGetItem(STORAGE_KEY_WOUND),
        safeGetItem(STORAGE_KEY_PAIN),
        safeGetItem(STORAGE_KEY_INTEROCEPTIVE),
        safeGetItem(STORAGE_KEY_MORO),
        safeGetItem(STORAGE_KEY_ANALGESIA),
      ]);
      if (proc) setProcedure(JSON.parse(proc));
      if (feed) setFeedingLog(JSON.parse(feed));
      if (med) setMedicationLog(JSON.parse(med));
      if (wound) setWoundLog(JSON.parse(wound));
      if (pain) setPainLog(JSON.parse(pain));
      if (intero) setInteroLog(JSON.parse(intero));
      if (moro) setMoroLog(JSON.parse(moro));
      if (analgesia) setAnalgesiaLog(JSON.parse(analgesia));
    } catch (_) { /* silent fail */ }
  }

  async function saveProcedure() {
    const entry: ProcedureEntry = { id: Date.now().toString(), date: procedureDate, procedureType, clinic, surgeon };
    setProcedure(entry);
    await safeSetItem(STORAGE_KEY_PROCEDURE, JSON.stringify(entry));
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.procedureSaved') || 'Procedure logged');
  }

  async function saveFeeding() {
    const entry: FeedingEntry = {
      id: Date.now().toString(), date: new Date().toISOString(),
      latchQuality, durationMin: parseInt(feedingDuration) || 0, bottleAcceptance, painResponse, notes: feedingNotes,
    };
    const updated = [entry, ...feedingLog].slice(0, 100);
    setFeedingLog(updated);
    await safeSetItem(STORAGE_KEY_FEEDING, JSON.stringify(updated));
    setFeedingNotes('');
    if ((Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60) > 12) {
      Alert.alert(t('procedureRecovery.alert') || 'Alert', t('procedureRecovery.noFeeding12h') || 'No feeding for 12+ hours');
    }
  }

  async function saveMedication() {
    const w = parseFloat(weightKg) || 0;
    const d = parseFloat(doseMg) || 0;
    const entry: MedicationEntry = { id: Date.now().toString(), date: new Date().toISOString(), drug, doseMg: d, weightKg: w };
    const updated = [entry, ...medicationLog].slice(0, 100);
    setMedicationLog(updated);
    await safeSetItem(STORAGE_KEY_MEDICATION, JSON.stringify(updated));
    setDoseMg('');
  }

  function calculateDose() {
    const w = parseFloat(weightKg) || 0;
    if (w > 0) setDoseMg(drug === 'acetaminophen' ? String(Math.round(w * 15)) : String(Math.round(w * 10)));
  }

  function checkDoctorAlerts() {
    const highPainDays = feedingLog.filter(e => e.painResponse > 3).length;
    if (highPainDays >= 3) Alert.alert(t('procedureRecovery.callDoctor') || 'Call Doctor', t('procedureRecovery.painAlert') || 'Pain > 3 for 3+ days');
  }

  async function savePain() {
    const entry: PainEntry = {
      id: Date.now().toString(), date: new Date().toISOString(), procedureType: painProcedureType,
      painPre: painPre, pain15min: pain15min, pain1hr: pain1hr, pain4hr: pain4hr, pain24hr: pain24hr,
      painTrigger, notes: painNotes,
    };
    const updated = [entry, ...painLog].slice(0, 100);
    setPainLog(updated);
    await safeSetItem(STORAGE_KEY_PAIN, JSON.stringify(updated));
    setPainNotes('');
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.painTracker.savePain') || 'Pain log saved');
  }

  async function saveIntero() {
    const entry: InteroceptiveEntry = {
      id: Date.now().toString(), date: new Date().toISOString(),
      hunger, thirst, temperature: tempSig, bladder, gut, fatigue, notes: interoNotes,
    };
    const updated = [entry, ...interoLog].slice(0, 100);
    setInteroLog(updated);
    await safeSetItem(STORAGE_KEY_INTEROCEPTIVE, JSON.stringify(updated));
    setInteroNotes('');
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.interoceptiveLog.saveSession') || 'Session saved');
  }

  async function saveMoro() {
    const entry: MoroEntry = {
      id: Date.now().toString(), date: new Date().toISOString(),
      intensity: moroIntensity, durationSec: parseInt(moroDuration) || 0,
      recoverySec: parseInt(moroRecovery) || 0, integrationStatus: moroStatus,
    };
    const updated = [entry, ...moroLog].slice(0, 100);
    setMoroLog(updated);
    await safeSetItem(STORAGE_KEY_MORO, JSON.stringify(updated));
    setMoroDuration('');
    setMoroRecovery('');
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.moroReflexLog.saveReflex') || 'Reflex log saved');
  }

  async function saveAnalgesia() {
    const entry: AnalgesiaEntry = {
      id: Date.now().toString(), date: new Date().toISOString(), method: analgesiaMethod,
      prePain: analgesiaPrePain, postPain: analgesiaPostPain,
      onsetMin: parseInt(analgesiaOnset) || 0, durationHrs: parseFloat(analgesiaDuration) || 0,
      sideEffects: analgesiaSideEffects,
    };
    const updated = [entry, ...analgesiaLog].slice(0, 100);
    setAnalgesiaLog(updated);
    await safeSetItem(STORAGE_KEY_ANALGESIA, JSON.stringify(updated));
    setAnalgesiaOnset('');
    setAnalgesiaDuration('');
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.analgesiaLog.saveAnalgesia') || 'Analgesia log saved');
  }

  const sections = [
    { key: 'procedure', label: t('procedureRecovery.procedureLog') || 'Procedure' },
    { key: 'feeding', label: t('procedureRecovery.feedingRecovery') || 'Feeding' },
    { key: 'medication', label: t('procedureRecovery.medication') || 'Medication' },
    { key: 'wound', label: t('procedureRecovery.wound') || 'Wound' },
    { key: 'timeline', label: t('procedureRecovery.timeline') || 'Timeline' },
    { key: 'pain', label: t('procedureRecovery.painTracker.title') || 'Pain' },
    { key: 'interoceptive', label: t('procedureRecovery.interoceptiveLog.title') || 'Interoceptive' },
    { key: 'reflex', label: t('procedureRecovery.moroReflexLog.title') || 'Reflex' },
    { key: 'analgesia', label: t('procedureRecovery.analgesiaLog.title') || 'Analgesia' },
    { key: 'comfort', label: t('procedureRecovery.comfortTips.title') || 'Comfort Tips' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('procedureRecovery.title') || 'Post-Procedure Recovery'}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('procedureRecovery.subtitle') || 'Track recovery after infant procedures'}</Text>
        </View>
        <View style={styles.sectionTabs}>
          {sections.map(s => (
            <TouchableOpacity key={s.key} style={[styles.sectionTab, activeSection === s.key && { backgroundColor: C.accent }]} onPress={() => setActiveSection(s.key)} accessibilityLabel={s.label} accessibilityRole="button">
              <Text style={[styles.sectionTabText, { color: activeSection === s.key ? '#fff' : C.text }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'procedure' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.procedureLog') || 'Procedure Log'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.procedureType') || 'Procedure Type'}</Text>
            <View style={styles.optionRow}>
              {PROCEDURE_TYPES.map(pt => (
                <TouchableOpacity key={pt.value} style={[styles.optionChip, procedureType === pt.value && { backgroundColor: C.accent }]} onPress={() => setProcedureType(pt.value)} accessibilityLabel={t(pt.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: procedureType === pt.value ? '#fff' : C.text }]}>{t(pt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.date') || 'Date'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={procedureDate} onChangeText={setProcedureDate} placeholder="YYYY-MM-DD" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.clinic') || 'Clinic'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={clinic} onChangeText={setClinic} placeholder={t('procedureRecovery.clinicPlaceholder') || 'Clinic name'} />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.surgeon') || 'Surgeon'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={surgeon} onChangeText={setSurgeon} placeholder={t('procedureRecovery.surgeonPlaceholder') || 'Surgeon name'} />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveProcedure} accessibilityLabel={t('common.save') || 'Save procedure'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'feeding' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.feedingRecovery') || 'Feeding Recovery'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.latchQuality') || 'Latch Quality (1-5)'}</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(n => <TouchableOpacity key={n} onPress={() => setLatchQuality(n)} accessibilityLabel={`${t('procedureRecovery.latchQuality') || 'Latch quality'} ${n}`} accessibilityRole="button"><Text style={[styles.ratingStar, { color: n <= latchQuality ? '#F59E0B' : '#D1D5DB' }]}>*</Text></TouchableOpacity>)}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.duration') || 'Duration (min)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={feedingDuration} onChangeText={setFeedingDuration} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.bottleAcceptance') || 'Bottle Acceptance'}</Text>
            <View style={styles.optionRow}>
              {BOTTLE_OPTIONS.map(ba => (
                <TouchableOpacity key={ba.value} style={[styles.optionChip, bottleAcceptance === ba.value && { backgroundColor: C.accent }]} onPress={() => setBottleAcceptance(ba.value)} accessibilityLabel={t(ba.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: bottleAcceptance === ba.value ? '#fff' : C.text }]}>{t(ba.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painResponse') || 'Pain Response (1-5)'}</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(n => <TouchableOpacity key={n} onPress={() => setPainResponse(n)} accessibilityLabel={`${t('procedureRecovery.painResponse') || 'Pain response'} ${n}`} accessibilityRole="button"><Text style={[styles.ratingStar, { color: n <= painResponse ? '#EF4444' : '#D1D5DB' }]}>*</Text></TouchableOpacity>)}
            </View>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={feedingNotes} onChangeText={setFeedingNotes} placeholder={t('procedureRecovery.notesPlaceholder') || 'Notes'} multiline />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveFeeding} accessibilityLabel={t('procedureRecovery.saveFeeding') || 'Save feeding log'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
            {feedingLog.length > 0 && (
              <View style={styles.logList}>
                <Text style={[styles.logTitle, { color: C.text }]}>{t('procedureRecovery.recentFeeding') || 'Recent'}</Text>
                {feedingLog.slice(0, 5).map(entry => (
                  <View key={entry.id} style={[styles.logEntry, { borderColor: C.border }]}>
                    <Text style={[styles.logText, { color: C.text }]}>*{entry.latchQuality} | {entry.durationMin}min | {entry.bottleAcceptance}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeSection === 'medication' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.medication') || 'Medication Log'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.weight') || 'Baby Weight (kg)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="0" onBlur={calculateDose} />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.drug') || 'Drug'}</Text>
            <View style={styles.optionRow}>
              {['acetaminophen','ibuprofen'].map(d => (
                <TouchableOpacity key={d} style={[styles.optionChip, drug === d && { backgroundColor: C.accent }]} onPress={() => setDrug(d)} accessibilityLabel={t('procedureRecovery.' + d) || d} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: drug === d ? '#fff' : C.text }]}>{t('procedureRecovery.' + d) || d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.dose') || 'Dose (mg)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={doseMg} onChangeText={setDoseMg} keyboardType="numeric" placeholder="0" />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveMedication} accessibilityLabel={t('procedureRecovery.saveMedication') || 'Save medication log'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'wound' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.wound') || 'Wound Monitoring'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.healingStatus') || 'Healing Status'}</Text>
            <View style={styles.optionRow}>
              {HEALING_STATUSES.map(hs => (
                <TouchableOpacity key={hs.value} style={[styles.optionChip, { backgroundColor: '#F3F4F6' }]} accessibilityLabel={t(hs.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: C.text }]}>{t(hs.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.note, { color: C.muted }]}>{t('procedureRecovery.photoNote') || 'Photo capture coming soon'}</Text>
          </View>
        )}

        {activeSection === 'timeline' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.timeline') || 'Recovery Timeline'}</Text>
            <View style={styles.timeline}>
              <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
                <Text style={[styles.timelineDay, { color: C.accent }]}>Day 1-3</Text>
                <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.day13') || 'Expect swelling, manage pain'}</Text>
              </View>
              <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
                <Text style={[styles.timelineDay, { color: C.accent }]}>Day 4-7</Text>
                <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.day47') || 'Feeding should improve'}</Text>
              </View>
              <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
                <Text style={[styles.timelineDay, { color: C.accent }]}>{t('procedureRecovery.week2Label') || 'Week 2'}</Text>
                <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.week2') || 'Back to baseline expected'}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.alertButton, { backgroundColor: '#EF4444' }]} onPress={checkDoctorAlerts} accessibilityLabel={t('procedureRecovery.checkAlerts') || 'Check doctor alerts'} accessibilityRole="button">
              <Text style={styles.alertButtonText}>{t('procedureRecovery.checkAlerts') || 'Check Doctor Alerts'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'pain' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.painTracker.title') || 'Pain Response Tracker'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.procedureTypes.vaccination') || 'Procedure Type'}</Text>
            <View style={styles.optionRow}>
              {PAIN_PROCEDURE_TYPES.map(pt => (
                <TouchableOpacity key={pt.value} style={[styles.optionChip, painProcedureType === pt.value && { backgroundColor: C.accent }]} onPress={() => setPainProcedureType(pt.value)} accessibilityLabel={t(pt.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: painProcedureType === pt.value ? '#fff' : C.text }]}>{t(pt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.painScale') || 'Pain Scale (0-10)'}</Text>
            <View style={styles.ratingRow}>
              {['😄','😐','😟','😣','😖','😰'].map((emoji, i) => (
                <TouchableOpacity key={i} onPress={() => { const val = i * 2; setPainPre(val); setPain15min(val); setPain1hr(val); setPain4hr(val); setPain24hr(val); }} accessibilityLabel={`Pain ${i*2}`} accessibilityRole="button">
                  <Text style={styles.ratingStar}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.preProcedure') || 'Pre-Procedure'}: {painPre}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setPainPre(n)} accessibilityLabel={`Pre pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= painPre ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.post15min') || '15 min post'}: {pain15min}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setPain15min(n)} accessibilityLabel={`15min pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= pain15min ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.post1hr') || '1 hr post'}: {pain1hr}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setPain1hr(n)} accessibilityLabel={`1hr pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= pain1hr ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.post4hr') || '4 hr post'}: {pain4hr}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setPain4hr(n)} accessibilityLabel={`4hr pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= pain4hr ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.post24hr') || '24 hr post'}: {pain24hr}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setPain24hr(n)} accessibilityLabel={`24hr pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= pain24hr ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.painTracker.painTrigger') || 'Pain Trigger'}</Text>
            <View style={styles.optionRow}>
              {PAIN_TRIGGERS.map(pt => (
                <TouchableOpacity key={pt.value} style={[styles.optionChip, painTrigger === pt.value && { backgroundColor: C.accent }]} onPress={() => setPainTrigger(pt.value)} accessibilityLabel={t(pt.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: painTrigger === pt.value ? '#fff' : C.text }]}>{t(pt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={painNotes} onChangeText={setPainNotes} placeholder={t('procedureRecovery.notesPlaceholder') || 'Notes'} multiline />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={savePain} accessibilityLabel={t('procedureRecovery.painTracker.savePain') || 'Save pain log'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'interoceptive' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.title') || 'Interoceptive State'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.hunger') || 'Hunger'}: {hunger}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setHunger(n)} accessibilityLabel={`Hunger ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= hunger ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.thirst') || 'Thirst'}: {thirst}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setThirst(n)} accessibilityLabel={`Thirst ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= thirst ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.temperature') || 'Temperature'}: {tempSig}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setTempSig(n)} accessibilityLabel={`Temperature ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= tempSig ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.bladder') || 'Bladder'}: {bladder}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setBladder(n)} accessibilityLabel={`Bladder ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= bladder ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.gut') || 'Gut'}: {gut}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setGut(n)} accessibilityLabel={`Gut ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= gut ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.interoceptiveLog.fatigue') || 'Fatigue'}: {fatigue}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setFatigue(n)} accessibilityLabel={`Fatigue ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= fatigue ? '#F59E0B' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={interoNotes} onChangeText={setInteroNotes} placeholder={t('procedureRecovery.interoceptiveLog.notesPlaceholder') || 'Notes'} multiline />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveIntero} accessibilityLabel={t('procedureRecovery.interoceptiveLog.saveSession') || 'Save session'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'reflex' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.moroReflexLog.title') || 'Moro Reflex Monitor'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.moroReflexLog.intensity') || 'Intensity (0-4)'}: {moroIntensity}</Text>
            <View style={styles.ratingRow}>
              {[0,1,2,3,4].map(n => (
                <TouchableOpacity key={n} onPress={() => setMoroIntensity(n)} accessibilityLabel={`Intensity ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= moroIntensity ? '#8B5CF6' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.moroReflexLog.duration') || 'Duration (seconds)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={moroDuration} onChangeText={setMoroDuration} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.moroReflexLog.recoveryTime') || 'Recovery Time (seconds)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={moroRecovery} onChangeText={setMoroRecovery} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.moroReflexLog.integrationStatus') || 'Integration Status'}</Text>
            <View style={styles.optionRow}>
              {MORO_STATUS_OPTIONS.map(ms => (
                <TouchableOpacity key={ms.value} style={[styles.optionChip, moroStatus === ms.value && { backgroundColor: C.accent }]} onPress={() => setMoroStatus(ms.value)} accessibilityLabel={t(ms.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: moroStatus === ms.value ? '#fff' : C.text }]}>{t(ms.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveMoro} accessibilityLabel={t('procedureRecovery.moroReflexLog.saveReflex') || 'Save reflex log'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'analgesia' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.title') || 'Analgesia Effectiveness'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.method') || 'Method'}</Text>
            <View style={styles.optionRow}>
              {ANALGESIA_METHODS.map(am => (
                <TouchableOpacity key={am.value} style={[styles.optionChip, analgesiaMethod === am.value && { backgroundColor: C.accent }]} onPress={() => setAnalgesiaMethod(am.value)} accessibilityLabel={t(am.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: analgesiaMethod === am.value ? '#fff' : C.text }]}>{t(am.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.prePain') || 'Pre-Procedure Pain Score'}: {analgesiaPrePain}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setAnalgesiaPrePain(n)} accessibilityLabel={`Pre pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= analgesiaPrePain ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.postPain') || 'Post-Procedure Pain Score'}: {analgesiaPostPain}</Text>
            <View style={styles.ratingRow}>
              {[0,2,4,6,8,10].map(n => (
                <TouchableOpacity key={n} onPress={() => setAnalgesiaPostPain(n)} accessibilityLabel={`Post pain ${n}`} accessibilityRole="button">
                  <Text style={[styles.ratingStar, { color: n <= analgesiaPostPain ? '#EF4444' : '#D1D5DB' }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.onsetTime') || 'Onset Time (minutes)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={analgesiaOnset} onChangeText={setAnalgesiaOnset} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.duration') || 'Duration (hours)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: C.background, color: C.text }]} value={analgesiaDuration} onChangeText={setAnalgesiaDuration} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.analgesiaLog.sideEffects') || 'Side Effects'}</Text>
            <View style={styles.optionRow}>
              {SIDE_EFFECTS.map(se => (
                <TouchableOpacity key={se.value} style={[styles.optionChip, analgesiaSideEffects === se.value && { backgroundColor: C.accent }]} onPress={() => setAnalgesiaSideEffects(se.value)} accessibilityLabel={t(se.labelKey)} accessibilityRole="button">
                  <Text style={[styles.optionChipText, { color: analgesiaSideEffects === se.value ? '#fff' : C.text }]}>{t(se.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: C.accent }]} onPress={saveAnalgesia} accessibilityLabel={t('procedureRecovery.analgesiaLog.saveAnalgesia') || 'Save analgesia log'} accessibilityRole="button">
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'comfort' && (
          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('procedureRecovery.comfortTips.title') || 'Comfort Techniques'}</Text>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.comfortTips.fiveS.title') || "The 5 S's for Procedural Comfort"}</Text>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>Swaddle: {t('procedureRecovery.comfortTips.fiveS.swaddle') || 'Snug wrapping provides security'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>Side/Stomach: {t('procedureRecovery.comfortTips.fiveS.sideStomach') || 'Hold on side or stomach'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>Shush: {t('procedureRecovery.comfortTips.fiveS.shush') || 'White noise or shushing sounds'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>Swing: {t('procedureRecovery.comfortTips.fiveS.swing') || 'Gentle rhythmic motion'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>Suck: {t('procedureRecovery.comfortTips.fiveS.suck') || 'Pacifier or finger for non-nutritive sucking'}</Text>
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.comfortTips.distraction.title') || 'Distraction by Age'}</Text>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.distraction.range03') || '0-3 months: Singing, gentle touch, eye contact'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.distraction.range36') || '3-6 months: Rattles, mirrors, bubbles'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: C.accent }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.distraction.range612') || '6-12 months: Toy peek-a-boo, favorite toy'}</Text>
            </View>
            <Text style={[styles.fieldLabel, { color: C.text }]}>{t('procedureRecovery.comfortTips.whenToCall.title') || 'When to Call the Doctor'}</Text>
            <View style={[styles.timelineStep, { borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.whenToCall.fever') || 'Fever above 38°C'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.whenToCall.excessiveCrying') || 'Excessive crying for more than 3 hours'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.whenToCall.notEating') || 'Refusing to eat for more than 24 hours'}</Text>
            </View>
            <View style={[styles.timelineStep, { borderLeftColor: '#EF4444' }]}>
              <Text style={[styles.timelineText, { color: C.text }]}>{t('procedureRecovery.comfortTips.whenToCall.lethargy') || 'Lethargy or unusual sleepiness'}</Text>
            </View>
            <Text style={[styles.note, { color: C.muted }]}>{t('procedureRecovery.comfortTips.cdcSchedule') || 'CDC Vaccine Schedule: cdc.gov/vaccines/schedules'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  sectionTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sectionTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  sectionTabText: { fontSize: 13, fontWeight: '500' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  optionChipText: { fontSize: 14 },
  saveButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingStar: { fontSize: 28 },
  logList: { marginTop: 16 },
  logTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  logEntry: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 4 },
  logText: { fontSize: 13 },
  note: { fontSize: 13, marginTop: 8 },
  timeline: { marginBottom: 16 },
  timelineStep: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12, marginLeft: 8 },
  timelineDay: { fontSize: 14, fontWeight: '700' },
  timelineText: { fontSize: 14, marginTop: 2 },
  alertButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  alertButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
