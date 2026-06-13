const fs = require('fs');
const { execSync } = require('child_process');

const projectDir = '/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby';
process.chdir(projectDir);

const path = 'app/(tabs)/procedure-recovery.tsx';

const content = `import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const PROCEDURE_TYPES = ['frenotomy', 'frenulectomy', 'ear_tubes', 'hernia_repair', 'other'];
const HEALING_STATUSES = ['normal', 'mild_swelling', 'infection_signs', 'bleeding', 'other'];
const BOTTLE_OPTIONS = ['accept', 'partial', 'refuse'];

export default function ProcedureRecoveryScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const colors = COLORS[theme];
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
        AsyncStorage.getItem(STORAGE_KEY_PROCEDURE),
        AsyncStorage.getItem(STORAGE_KEY_FEEDING),
        AsyncStorage.getItem(STORAGE_KEY_MEDICATION),
        AsyncStorage.getItem(STORAGE_KEY_WOUND),
      ]);
      if (proc) setProcedure(JSON.parse(proc));
      if (feed) setFeedingLog(JSON.parse(feed));
      if (med) setMedicationLog(JSON.parse(med));
      if (wound) setWoundLog(JSON.parse(wound));
    } catch (e) { console.error('loadAll error', e); }
  }

  async function saveProcedure() {
    const entry: ProcedureEntry = { id: Date.now().toString(), date: procedureDate, procedureType, clinic, surgeon };
    setProcedure(entry);
    await AsyncStorage.setItem(STORAGE_KEY_PROCEDURE, JSON.stringify(entry));
    Alert.alert(t('procedureRecovery.saved') || 'Saved', t('procedureRecovery.procedureSaved') || 'Procedure logged');
  }

  async function saveFeeding() {
    const entry: FeedingEntry = {
      id: Date.now().toString(), date: new Date().toISOString(),
      latchQuality, durationMin: parseInt(feedingDuration) || 0, bottleAcceptance, painResponse, notes: feedingNotes,
    };
    const updated = [entry, ...feedingLog].slice(0, 100);
    setFeedingLog(updated);
    await AsyncStorage.setItem(STORAGE_KEY_FEEDING, JSON.stringify(updated));
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
    await AsyncStorage.setItem(STORAGE_KEY_MEDICATION, JSON.stringify(updated));
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('procedureRecovery.title') || 'Post-Procedure Recovery'}</Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{t('procedureRecovery.subtitle') || 'Track recovery after infant procedures'}</Text>
        </View>
        <View style={styles.sectionTabs}>
          {sections.map(s => (
            <TouchableOpacity key={s.key} style={[styles.sectionTab, activeSection === s.key && { backgroundColor: colors.primary }]} onPress={() => setActiveSection(s.key)}>
              <Text style={[styles.sectionTabText, { color: activeSection === s.key ? '#fff' : colors.text }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeSection === 'procedure' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('procedureRecovery.procedureLog') || 'Procedure Log'}</Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.procedureType') || 'Procedure Type'}</Text>
            <View style={styles.optionRow}>
              {PROCEDURE_TYPES.map(pt => (
                <TouchableOpacity key={pt} style={[styles.optionChip, procedureType === pt && { backgroundColor: colors.primary }]} onPress={() => setProcedureType(pt)}>
                  <Text style={[styles.optionChipText, { color: procedureType === pt ? '#fff' : colors.text }]}>{t('procedureRecovery.' + pt) || pt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.date') || 'Date'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={procedureDate} onChangeText={setProcedureDate} placeholder="YYYY-MM-DD" />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.clinic') || 'Clinic'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={clinic} onChangeText={setClinic} placeholder={t('procedureRecovery.clinicPlaceholder') || 'Clinic name'} />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.surgeon') || 'Surgeon'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={surgeon} onChangeText={setSurgeon} placeholder={t('procedureRecovery.surgeonPlaceholder') || 'Surgeon name'} />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={saveProcedure}>
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'feeding' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('procedureRecovery.feedingRecovery') || 'Feeding Recovery'}</Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.latchQuality') || 'Latch Quality (1-5)'}</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(n => <TouchableOpacity key={n} onPress={() => setLatchQuality(n)}><Text style={[styles.ratingStar, { color: n <= latchQuality ? '#F59E0B' : '#D1D5DB' }]}>*</Text></TouchableOpacity>)}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.duration') || 'Duration (min)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={feedingDuration} onChangeText={setFeedingDuration} keyboardType="numeric" placeholder="0" />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.bottleAcceptance') || 'Bottle Acceptance'}</Text>
            <View style={styles.optionRow}>
              {BOTTLE_OPTIONS.map(ba => (
                <TouchableOpacity key={ba} style={[styles.optionChip, bottleAcceptance === ba && { backgroundColor: colors.primary }]} onPress={() => setBottleAcceptance(ba)}>
                  <Text style={[styles.optionChipText, { color: bottleAcceptance === ba ? '#fff' : colors.text }]}>{t('procedureRecovery.' + ba) || ba}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.painResponse') || 'Pain Response (1-5)'}</Text>
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(n => <TouchableOpacity key={n} onPress={() => setPainResponse(n)}><Text style={[styles.ratingStar, { color: n <= painResponse ? '#EF4444' : '#D1D5DB' }]}>*</Text></TouchableOpacity>)}
            </View>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={feedingNotes} onChangeText={setFeedingNotes} placeholder={t('procedureRecovery.notesPlaceholder') || 'Notes'} multiline />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={saveFeeding}>
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
            {feedingLog.length > 0 && (
              <View style={styles.logList}>
                <Text style={[styles.logTitle, { color: colors.text }]}>{t('procedureRecovery.recentFeeding') || 'Recent'}</Text>
                {feedingLog.slice(0, 5).map(entry => (
                  <View key={entry.id} style={[styles.logEntry, { borderColor: colors.border }]}>
                    <Text style={[styles.logText, { color: colors.text }]}>*{entry.latchQuality} | {entry.durationMin}min | {entry.bottleAcceptance}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeSection === 'medication' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('procedureRecovery.medication') || 'Medication Log'}</Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.weight') || 'Baby Weight (kg)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="0" onBlur={calculateDose} />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.drug') || 'Drug'}</Text>
            <View style={styles.optionRow}>
              {['acetaminophen','ibuprofen'].map(d => (
                <TouchableOpacity key={d} style={[styles.optionChip, drug === d && { backgroundColor: colors.primary }]} onPress={() => setDrug(d)}>
                  <Text style={[styles.optionChipText, { color: drug === d ? '#fff' : colors.text }]}>{t('procedureRecovery.' + d) || d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.dose') || 'Dose (mg)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} value={doseMg} onChangeText={setDoseMg} keyboardType="numeric" placeholder="0" />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={saveMedication}>
              <Text style={styles.saveButtonText}>{t('common.save') || 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSection === 'wound' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('procedureRecovery.wound') || 'Wound Monitoring'}</Text>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('procedureRecovery.healingStatus') || 'Healing Status'}</Text>
            <View style={styles.optionRow}>
              {HEALING_STATUSES.map(hs => (
                <TouchableOpacity key={hs} style={[styles.optionChip, { backgroundColor: '#F3F4F6' }]}>
                  <Text style={[styles.optionChipText, { color: colors.text }]}>{t('procedureRecovery.' + hs) || hs}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.note, { color: colors.secondaryText }]}>{t('procedureRecovery.photoNote') || 'Photo capture coming soon'}</Text>
          </View>
        )}

        {activeSection === 'timeline' && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t('procedureRecovery.timeline') || 'Recovery Timeline'}</Text>
            <View style={styles.timeline}>
              <View style={[styles.timelineStep, { borderLeftColor: colors.primary }]}>
                <Text style={[styles.timelineDay, { color: colors.primary }]}>Day 1-3</Text>
                <Text style={[styles.timelineText, { color: colors.text }]}>{t('procedureRecovery.day13') || 'Expect swelling, manage pain'}</Text>
              </View>
              <View style={[styles.timelineStep, { borderLeftColor: colors.primary }]}>
                <Text style={[styles.timelineDay, { color: colors.primary }]}>Day 4-7</Text>
                <Text style={[styles.timelineText, { color: colors.text }]}>{t('procedureRecovery.day47') || 'Feeding should improve'}</Text>
              </View>
              <View style={[styles.timelineStep, { borderLeftColor: colors.primary }]}>
                <Text style={[styles.timelineDay, { color: colors.primary }]}>Week 2</Text>
                <Text style={[styles.timelineText, { color: colors.text }]}>{t('procedureRecovery.week2') || 'Back to baseline expected'}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.alertButton, { backgroundColor: '#EF4444' }]} onPress={checkDoctorAlerts}>
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
`;

fs.writeFileSync(path, content);
console.log('procedure-recovery.tsx written (' + content.split('\n').length + ' lines)');

const enPath = 'app/i18n/en.json';
const zhPath = 'app/i18n/zh.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

const keys = {
  'tabs.procedureRecovery': 'Recovery',
  'procedureRecovery.title': 'Post-Procedure Recovery',
  'procedureRecovery.subtitle': 'Track recovery after infant procedures',
  'procedureRecovery.procedureLog': 'Procedure',
  'procedureRecovery.feedingRecovery': 'Feeding',
  'procedureRecovery.medication': 'Medication',
  'procedureRecovery.wound': 'Wound',
  'procedureRecovery.timeline': 'Timeline',
  'procedureRecovery.procedureType': 'Procedure Type',
  'procedureRecovery.frenotomy': 'Frenotomy',
  'procedureRecovery.frenulectomy': 'Frenulectomy',
  'procedureRecovery.ear_tubes': 'Ear Tubes',
  'procedureRecovery.hernia_repair': 'Hernia Repair',
  'procedureRecovery.other': 'Other',
  'procedureRecovery.date': 'Date',
  'procedureRecovery.clinic': 'Clinic',
  'procedureRecovery.clinicPlaceholder': 'Clinic name',
  'procedureRecovery.surgeon': 'Surgeon',
  'procedureRecovery.surgeonPlaceholder': 'Surgeon name',
  'procedureRecovery.latchQuality': 'Latch Quality (1-5)',
  'procedureRecovery.duration': 'Duration (min)',
  'procedureRecovery.bottleAcceptance': 'Bottle Acceptance',
  'procedureRecovery.accept': 'Accept',
  'procedureRecovery.partial': 'Partial',
  'procedureRecovery.refuse': 'Refuse',
  'procedureRecovery.painResponse': 'Pain Response (1-5)',
  'procedureRecovery.notesPlaceholder': 'Notes',
  'procedureRecovery.recentFeeding': 'Recent Entries',
  'procedureRecovery.weight': 'Baby Weight (kg)',
  'procedureRecovery.drug': 'Drug',
  'procedureRecovery.acetaminophen': 'Acetaminophen',
  'procedureRecovery.ibuprofen': 'Ibuprofen',
  'procedureRecovery.dose': 'Dose (mg)',
  'procedureRecovery.healingStatus': 'Healing Status',
  'procedureRecovery.normal': 'Normal',
  'procedureRecovery.mild_swelling': 'Mild Swelling',
  'procedureRecovery.infection_signs': 'Infection Signs',
  'procedureRecovery.bleeding': 'Bleeding',
  'procedureRecovery.photoNote': 'Photo capture coming soon',
  'procedureRecovery.day13': 'Expect swelling, manage pain',
  'procedureRecovery.day47': 'Feeding should improve',
  'procedureRecovery.week2': 'Back to baseline expected',
  'procedureRecovery.checkAlerts': 'Check Doctor Alerts',
  'procedureRecovery.saved': 'Saved',
  'procedureRecovery.procedureSaved': 'Procedure logged',
  'procedureRecovery.alert': 'Alert',
  'procedureRecovery.noFeeding12h': 'No feeding recorded for 12+ hours',
  'procedureRecovery.callDoctor': 'Call Doctor',
  'procedureRecovery.painAlert': 'Pain score above 3 for 3+ days',
};

for (const [k, v] of Object.entries(keys)) {
  en[k] = v;
  zh[k] = v;
}
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(zhPath, JSON.stringify(zh, null, 2));
console.log('i18n keys added: ' + Object.keys(keys).length);

const layoutPath = 'app/(tabs)/_layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');
if (!layoutContent.includes('procedure-recovery')) {
  const entry = `
      <Tabs.Screen
        name="procedure-recovery"
        options={{
          title: t('tabs.procedureRecovery'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />,
        }}
      />`;
  layoutContent = layoutContent.replace(/<Tabs\.Screen\s+name="profile"/, entry + '\n      <Tabs.Screen name="profile"');
  fs.writeFileSync(layoutPath, layoutContent);
  console.log('_layout.tsx updated');
}

try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('TSC: PASS');
} catch (e) {
  console.log('TSC: FAIL');
}
console.log('DONE');
