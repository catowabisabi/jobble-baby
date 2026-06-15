import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY_PROCEDURE = '@jobble/procedure_log';
const STORAGE_KEY_FEEDING = '@jobble/feeding_recovery';
const STORAGE_KEY_MEDICATION = '@jobble/medication_log';
const STORAGE_KEY_WOUND = '@jobble/wound_photo';

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

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [proc, feed, med, wound] = await Promise.all([
        safeGetItem(STORAGE_KEY_PROCEDURE),
        safeGetItem(STORAGE_KEY_FEEDING),
        safeGetItem(STORAGE_KEY_MEDICATION),
        safeGetItem(STORAGE_KEY_WOUND),
      ]);
      if (proc) setProcedure(JSON.parse(proc));
      if (feed) setFeedingLog(JSON.parse(feed));
      if (med) setMedicationLog(JSON.parse(med));
      if (wound) setWoundLog(JSON.parse(wound));
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

  const sections = [
    { key: 'procedure', label: t('procedureRecovery.procedureLog') || 'Procedure' },
    { key: 'feeding', label: t('procedureRecovery.feedingRecovery') || 'Feeding' },
    { key: 'medication', label: t('procedureRecovery.medication') || 'Medication' },
    { key: 'wound', label: t('procedureRecovery.wound') || 'Wound' },
    { key: 'timeline', label: t('procedureRecovery.timeline') || 'Timeline' },
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
