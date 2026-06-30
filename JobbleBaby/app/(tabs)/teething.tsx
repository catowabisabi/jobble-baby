import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const SYMPTOMS_KEY = STORAGE_KEYS.TEETHING_SYMPTOMS;
const TEETH_KEY = STORAGE_KEYS.TEETHING_TEETH;
const PROFILE_KEY = '@jobble_baby_profile';

const TEETHING_BLUE = '#60A5FA';
const TEETHING_AMBER = '#F59E0B';

const TOOTH_POSITIONS: Record<number, { toothKey: string; emoji: string; typicalMonths: number; quadrant: 'UR' | 'UL' | 'LL' | 'LR' }> = {
  // Upper Right (UR): teeth 1-5
  1:  { toothKey: 'teething.tooth.upperCentralIncisor',   emoji: '🔼', typicalMonths: 8,  quadrant: 'UR' },
  2:  { toothKey: 'teething.tooth.upperLateralIncisor',  emoji: '🔼', typicalMonths: 10, quadrant: 'UR' },
  3:  { toothKey: 'teething.tooth.upperCanine',          emoji: '🔼', typicalMonths: 18, quadrant: 'UR' },
  4:  { toothKey: 'teething.tooth.upperFirstMolar',      emoji: '🔼', typicalMonths: 14, quadrant: 'UR' },
  5:  { toothKey: 'teething.tooth.upperSecondMolar',     emoji: '🔼', typicalMonths: 24, quadrant: 'UR' },
  // Upper Left (UL): teeth 6-10
  6:  { toothKey: 'teething.tooth.upperCentralIncisor',   emoji: '🔼', typicalMonths: 8,  quadrant: 'UL' },
  7:  { toothKey: 'teething.tooth.upperLateralIncisor',  emoji: '🔼', typicalMonths: 10, quadrant: 'UL' },
  8:  { toothKey: 'teething.tooth.upperCanine',           emoji: '🔼', typicalMonths: 18, quadrant: 'UL' },
  9:  { toothKey: 'teething.tooth.upperFirstMolar',       emoji: '🔼', typicalMonths: 14, quadrant: 'UL' },
  10: { toothKey: 'teething.tooth.upperSecondMolar',      emoji: '🔼', typicalMonths: 24, quadrant: 'UL' },
  // Lower Left (LL): teeth 11-15
  11: { toothKey: 'teething.tooth.lowerCentralIncisor',   emoji: '🔽', typicalMonths: 6,  quadrant: 'LL' },
  12: { toothKey: 'teething.tooth.lowerLateralIncisor',  emoji: '🔽', typicalMonths: 7,  quadrant: 'LL' },
  13: { toothKey: 'teething.tooth.lowerCanine',          emoji: '🔽', typicalMonths: 18, quadrant: 'LL' },
  14: { toothKey: 'teething.tooth.lowerFirstMolar',      emoji: '🔽', typicalMonths: 14, quadrant: 'LL' },
  15: { toothKey: 'teething.tooth.lowerSecondMolar',      emoji: '🔽', typicalMonths: 24, quadrant: 'LL' },
  // Lower Right (LR): teeth 16-20
  16: { toothKey: 'teething.tooth.lowerCentralIncisor',  emoji: '🔽', typicalMonths: 6,  quadrant: 'LR' },
  17: { toothKey: 'teething.tooth.lowerLateralIncisor',  emoji: '🔽', typicalMonths: 7,  quadrant: 'LR' },
  18: { toothKey: 'teething.tooth.lowerCanine',          emoji: '🔽', typicalMonths: 18, quadrant: 'LR' },
  19: { toothKey: 'teething.tooth.lowerFirstMolar',       emoji: '🔽', typicalMonths: 14, quadrant: 'LR' },
  20: { toothKey: 'teething.tooth.lowerSecondMolar',      emoji: '🔽', typicalMonths: 24, quadrant: 'LR' },
};

type SymptomId = 'drooling' | 'gum_swollen' | 'irritable' | 'biting' | 'fever' | 'sleep_disrupted' | 'rash' | 'decreased_appetite';

interface SymptomEntry {
  id: string;
  symptom: SymptomId;
  timestamp: string;
  severity: 1 | 2 | 3;
  note?: string;
}

interface ToothEruption {
  toothId: number;
  eruptingAt?: string;
  order?: number;
}

const SYMPTOMS_DEFINITIONS: Record<SymptomId, { labelKey: string; icon: string; descriptionKey: string }> = {
  drooling:        { labelKey: 'teething.symptomDrooling',         icon: 'water-outline',         descriptionKey: 'teething.symptomDroolingDesc' },
  gum_swollen:     { labelKey: 'teething.symptomGumSwollen',       icon: 'expand-outline',        descriptionKey: 'teething.symptomGumSwollenDesc' },
  irritable:        { labelKey: 'teething.symptomIrritable',        icon: 'alert-circle-outline',  descriptionKey: 'teething.symptomIrritableDesc' },
  biting:          { labelKey: 'teething.symptomBiting',           icon: 'hand-left-outline',     descriptionKey: 'teething.symptomBitingDesc' },
  fever:           { labelKey: 'teething.symptomFever',            icon: 'thermometer-outline',   descriptionKey: 'teething.symptomFeverDesc' },
  sleep_disrupted: { labelKey: 'teething.symptomSleepDisrupted',   icon: 'moon-outline',          descriptionKey: 'teething.symptomSleepDisruptedDesc' },
  rash:           { labelKey: 'teething.symptomRash',              icon: 'bandage-outline',       descriptionKey: 'teething.symptomRashDesc' },
  decreased_appetite: { labelKey: 'teething.symptomAppetite',     icon: 'restaurant-outline',    descriptionKey: 'teething.symptomAppetiteDesc' },
};

const PAIN_RELIEF_METHODS = [
  { id: 'teething_ring',   labelKey: 'teething.teethingRing',     icon: 'circle-outline',   noteKey: 'teething.teethingRingNote' },
  { id: 'cold_washcloth',  labelKey: 'teething.coldWashcloth',    icon: 'water-outline',    noteKey: 'teething.coldWashclothNote' },
  { id: 'gum_massage',     labelKey: 'teething.gumMassage',       icon: 'hand-left-outline', noteKey: 'teething.gumMassageNote' },
  { id: 'chilled_feeder',  labelKey: 'teething.chilledFeeder',   icon: 'cafe-outline',      noteKey: 'teething.chilledFeederNote' },
  { id: 'pain_relief_otc', labelKey: 'teething.painReliefOTC',   icon: 'medical-outline',   noteKey: 'teething.painReliefOTCNote' },
  { id: 'amber_bead',      labelKey: 'teething.amberBead',       icon: 'diamond-outline',   noteKey: 'teething.amberBeadNote' },
];

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return days / 30.44;
  } catch {
    return 0;
  }
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function TeethingScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [babyProfile, setBabyProfile] = useState<{ birthDate?: string; name?: string } | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>([]);
  const [teeth, setTeeth] = useState<ToothEruption[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'chart' | 'tracker' | 'relief' | 'tips'>('chart');
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomId | null>(null);
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [note, setNote] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRaw, symRaw, teethRaw] = await Promise.all([
          safeGetItem(PROFILE_KEY),
          safeGetItem(SYMPTOMS_KEY),
          safeGetItem(TEETH_KEY),
        ]);
        if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
        if (symRaw) setSymptoms(JSON.parse(symRaw));
        if (teethRaw) setTeeth(JSON.parse(teethRaw));
      } catch { }
    };
    load();
  }, []);

  const babyAge = babyProfile?.birthDate ? calculateAgeInMonths(babyProfile.birthDate) : 0;

  const getActiveSymptoms = (): SymptomId[] => {
    const today = getDateStr();
    return symptoms
      .filter((s) => s.timestamp.startsWith(today))
      .map((s) => s.symptom);
  };

  const getSymptomCount = (symptom: SymptomId): number => {
    const today = getDateStr();
    return symptoms.filter((s) => s.timestamp.startsWith(today) && s.symptom === symptom).length;
  };

  const getEruptedCount = (): number => {
    return teeth.filter((t) => t.eruptingAt).length;
  };

  const logSymptom = async () => {
    if (!selectedSymptom) {
      Alert.alert(t('teething.selectSymptom') || 'Select a symptom');
      return;
    }
    const entry: SymptomEntry = {
      id: Date.now().toString(),
      symptom: selectedSymptom,
      timestamp: new Date().toISOString(),
      severity,
      note: note.trim() || undefined,
    };
    const updated = [entry, ...symptoms].slice(0, 100);
    setSymptoms(updated);
    await safeSetItem(SYMPTOMS_KEY, JSON.stringify(updated));
    await awardBadge('first_teething_log');
    setSelectedSymptom(null);
    setNote('');
    setSeverity(2);
  };

  const markToothErupted = async (toothId: number) => {
    const existing = teeth.find((t) => t.toothId === toothId);
    if (existing?.eruptingAt) {
      const updated = teeth.filter((t) => t.toothId !== toothId);
      setTeeth(updated);
      await safeSetItem(TEETH_KEY, JSON.stringify(updated));
    } else {
      const eruption: ToothEruption = { toothId, eruptingAt: getDateStr(), order: getEruptedCount() + 1 };
      const updated = [...teeth.filter((t) => t.toothId !== toothId), eruption];
      setTeeth(updated);
      await safeSetItem(TEETH_KEY, JSON.stringify(updated));
      if (updated.length >= 20) await awardBadge('full_teeth');
    }
  };

  const clearTodaySymptoms = async () => {
    const today = getDateStr();
    const updated = symptoms.filter((s) => !s.timestamp.startsWith(today));
    setSymptoms(updated);
    await safeSetItem(SYMPTOMS_KEY, JSON.stringify(updated));
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: darkMode ? '#0a1628' : C.background },
    container: { flex: 1, backgroundColor: darkMode ? '#0a1628' : C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: darkMode ? '#8b9bb4' : C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: darkMode ? '#F8FAFC' : C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: darkMode ? '#8b9bb4' : C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: darkMode ? '#8b9bb4' : C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: { flex: 1, backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    tabButtonActive: { backgroundColor: TEETHING_BLUE, borderColor: TEETHING_BLUE },
    tabButtonText: { fontSize: 11, fontWeight: '600', color: darkMode ? '#8b9bb4' : C.muted },
    tabButtonTextActive: { color: '#fff' },
    toothGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    toothCard: { width: '23%', backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border, marginBottom: 8 },
    toothCardErupted: { borderColor: TEETHING_BLUE, borderWidth: 2, backgroundColor: darkMode ? '#1a2a4a' : '#EFF6FF' },
    toothHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    toothEmoji: { fontSize: 24, marginRight: 8 },
    toothName: { fontSize: 13, fontWeight: '600', color: darkMode ? '#F8FAFC' : C.text, flex: 1 },
    toothMeta: { fontSize: 12, color: darkMode ? '#8b9bb4' : C.muted },
    toothMetaErupted: { fontSize: 12, color: TEETHING_BLUE, fontWeight: '600' },
    erupting: { fontSize: 11, color: TEETHING_AMBER, fontWeight: '700', marginTop: 4 },
    toothProgress: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    toothProgressBar: { flex: 1, backgroundColor: darkMode ? '#2a3a4a' : C.border, borderRadius: 4, height: 8, overflow: 'hidden' },
    toothProgressFill: { backgroundColor: TEETHING_BLUE, borderRadius: 4, height: 8 },
    toothProgressText: { fontSize: 10, color: darkMode ? '#8b9bb4' : C.muted, marginLeft: 6, width: 40 },
    summaryCard: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    summaryIcon: { fontSize: 32, marginRight: 12 },
    summaryTextBlock: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: darkMode ? '#F8FAFC' : C.text },
    summarySubtitle: { fontSize: 13, color: darkMode ? '#8b9bb4' : C.muted },
    symptomGrid: { gap: 8 },
    symptomCard: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border, flexDirection: 'row', alignItems: 'center' },
    symptomCardSelected: { borderColor: TEETHING_BLUE, borderWidth: 2, backgroundColor: darkMode ? '#1a2a4a' : '#EFF6FF' },
    symptomIcon: { fontSize: 24, marginRight: 12 },
    symptomName: { fontSize: 14, fontWeight: '600', color: darkMode ? '#F8FAFC' : C.text, flex: 1 },
    symptomCount: { backgroundColor: TEETHING_AMBER, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    symptomCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    severityRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    severityButton: { flex: 1, backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    severityButtonActive: { backgroundColor: TEETHING_AMBER, borderColor: TEETHING_AMBER },
    severityText: { fontSize: 12, fontWeight: '600', color: darkMode ? '#F8FAFC' : C.text },
    severityTextActive: { color: '#fff' },
    logButton: { backgroundColor: TEETHING_BLUE, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16 },
    logButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    noteInput: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border, minHeight: 60 },
    noteInputLabel: { fontSize: 13, color: darkMode ? '#8b9bb4' : C.muted, marginBottom: 4 },
    noteInputText: { fontSize: 14, color: darkMode ? '#F8FAFC' : C.text },
    symptomHistoryTitle: { fontSize: 14, fontWeight: '600', color: darkMode ? '#F8FAFC' : C.text, marginTop: 20, marginBottom: 8 },
    symptomHistoryItem: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border, flexDirection: 'row', alignItems: 'center' },
    symptomHistoryIcon: { fontSize: 18, marginRight: 10 },
    symptomHistoryText: { fontSize: 13, color: darkMode ? '#F8FAFC' : C.text, flex: 1 },
    symptomHistoryTime: { fontSize: 11, color: darkMode ? '#8b9bb4' : C.muted },
    reliefCard: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    reliefHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    reliefIcon: { fontSize: 22, marginRight: 10 },
    reliefName: { fontSize: 15, fontWeight: '700', color: darkMode ? '#F8FAFC' : C.text, flex: 1 },
    reliefNote: { fontSize: 13, color: darkMode ? '#8b9bb4' : C.muted, lineHeight: 18 },
    ageWarningBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
    ageWarningText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
    tipCard: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: TEETHING_AMBER, borderLeftWidth: 4, borderLeftColor: TEETHING_AMBER },
    tipTitle: { fontSize: 15, fontWeight: '700', color: darkMode ? '#F8FAFC' : C.text, marginBottom: 6 },
    tipText: { fontSize: 13, color: darkMode ? '#8b9bb4' : C.muted, lineHeight: 18 },
    navRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    navButton: { flex: 1, backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    navButtonText: { fontSize: 13, fontWeight: '600', color: darkMode ? '#F8FAFC' : C.text },
    emptyText: { fontSize: 14, color: darkMode ? '#8b9bb4' : C.muted, textAlign: 'center', paddingVertical: 40 },
    darkToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    darkToggleLabel: { fontSize: 14, color: darkMode ? '#F8FAFC' : C.text, fontWeight: '500' },
    activeSymptomsContainer: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    activeSymptomsTitle: { fontSize: 12, color: TEETHING_AMBER, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    activeSymptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    activeSymptomChip: { backgroundColor: TEETHING_BLUE, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    activeSymptomChipText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    clearButton: { marginTop: 10, alignItems: 'center' },
    clearButtonText: { fontSize: 12, color: '#e74c3c' },
    expectedSoonCard: { backgroundColor: darkMode ? '#1a2a3a' : C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: darkMode ? '#2a3a4a' : C.border },
    expectedSoonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    expectedSoonEmoji: { fontSize: 18, marginRight: 8 },
    expectedSoonName: { fontSize: 13, color: darkMode ? '#F8FAFC' : C.text, flex: 1 },
    expectedSoonAge: { fontSize: 12, color: darkMode ? '#8b9bb4' : C.muted },
    quadrantGrid: { flexDirection: 'row', gap: 8 },
    quadrantColumn: { flex: 1, alignItems: 'center' },
    quadrantLabel: { fontSize: 11, fontWeight: '700', color: TEETHING_BLUE, marginBottom: 8, textAlign: 'center' },
  });

  const eruptedCount = getEruptedCount();
  const nextExpected = Object.values(TOOTH_POSITIONS)
    .filter((t) => t.typicalMonths >= babyAge - 1 && t.typicalMonths <= babyAge + 2)
    .slice(0, 3);
  const activeSymptomIds = getActiveSymptoms();

  const renderChart = () => (
    <View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>🦷</Text>
          <View style={styles.summaryTextBlock}>
            <Text style={styles.summaryTitle}>{eruptedCount} / 20 Teeth</Text>
            <Text style={styles.summarySubtitle}>
              {babyProfile?.birthDate
                ? `${Math.round(babyAge)} ${t('teething.monthsOld')} · ${babyProfile.name || t('teething.baby')}`
                : t('teething.addProfileToTrack')}
            </Text>
          </View>
        </View>
        <View style={styles.toothProgress}>
          <View style={styles.toothProgressBar}>
            <View style={[styles.toothProgressFill, { width: `${(eruptedCount / 20) * 100}%` }]} />
          </View>
          <Text style={styles.toothProgressText}>{Math.round((eruptedCount / 20) * 100)}%</Text>
        </View>
      </View>

      {nextExpected.length > 0 && eruptedCount < 20 && (
        <View style={styles.expectedSoonCard}>
            <Text style={styles.sectionTitle}>{t('teething.expectedSoon')}</Text>
          {nextExpected.map((tooth) => (
            <View key={tooth.typicalMonths} style={styles.expectedSoonRow}>
              <Text style={styles.expectedSoonEmoji}>{tooth.emoji}</Text>
              <Text style={styles.expectedSoonName}>{t(tooth.toothKey)}</Text>
              <Text style={styles.expectedSoonAge}>~{tooth.typicalMonths} mo</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('teething.allBabyTeeth')}</Text>
    <View style={styles.quadrantGrid}>
      {(['UR', 'UL', 'LL', 'LR'] as const).map((quadrant) => (
        <View key={quadrant} style={styles.quadrantColumn}>
          <Text style={styles.quadrantLabel}>{t(`teething.quadrant.${quadrant}`)}</Text>
          {Object.entries(TOOTH_POSITIONS)
            .filter(([, tooth]) => tooth.quadrant === quadrant)
            .map(([numStr, tooth]) => {
              const num = parseInt(numStr, 10);
              const erupted = teeth.find((t) => t.toothId === num);
              return (
                <TouchableOpacity
                  accessibilityLabel={erupted ? `Tooth ${num} already erupted on ${formatDate(erupted.eruptingAt!)}` : `Mark tooth ${num} as erupted, typically appears at ${tooth.typicalMonths} months`}
                  key={num}
                  style={[styles.toothCard, erupted && styles.toothCardErupted]}
                  activeOpacity={0.7}
                  onPress={() => markToothErupted(num)}
                >
                  <View style={styles.toothHeader}>
                    <Text style={styles.toothEmoji}>{tooth.emoji}</Text>
                    <Text style={styles.toothName}>#{num}</Text>
                  </View>
                  <Text style={[styles.toothMeta, erupted && styles.toothMetaErupted]}>
                    {erupted ? `✓ ${formatDate(erupted.eruptingAt!)}` : `~${tooth.typicalMonths} mo`}
                  </Text>
                  {erupted && <Text style={styles.erupting}>{t('teething.erupted')}</Text>}
                </TouchableOpacity>
              );
            })}
        </View>
      ))}
    </View>
    </View>
  );

  const renderTracker = () => {
    const today = getDateStr();
    const todaySymptoms = symptoms.filter((s) => s.timestamp.startsWith(today));
    return (
      <View>
        {activeSymptomIds.length > 0 && (
          <View style={styles.activeSymptomsContainer}>
            <Text style={styles.activeSymptomsTitle}>{t('teething.activeToday')} ({activeSymptomIds.length})</Text>
            <View style={styles.activeSymptomsRow}>
              {activeSymptomIds.map((sid) => (
                <View key={sid} style={styles.activeSymptomChip}>
                  <Text style={styles.activeSymptomChipText}>
                    {SYMPTOMS_DEFINITIONS[sid].icon} {t(SYMPTOMS_DEFINITIONS[sid].labelKey)}
                  </Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={clearTodaySymptoms} accessibilityLabel="Clear all symptoms logged today">
              <Text style={styles.clearButtonText}>{t('teething.clearToday') || 'Clear today'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('teething.logSymptom') || 'Log a Symptom'}</Text>
        <View style={styles.symptomGrid}>
          {(Object.keys(SYMPTOMS_DEFINITIONS) as SymptomId[]).map((symptomId) => {
            const def = SYMPTOMS_DEFINITIONS[symptomId];
            const count = getSymptomCount(symptomId);
            return (
              <TouchableOpacity
                              accessibilityLabel={`${selectedSymptom === symptomId ? 'Deselect' : 'Select'} ${t(def.labelKey)} symptom, logged ${count} times today`}
                key={symptomId}
                style={[styles.symptomCard, selectedSymptom === symptomId && styles.symptomCardSelected]}
                activeOpacity={0.7}
                onPress={() => setSelectedSymptom(selectedSymptom === symptomId ? null : symptomId)}
              >
                <Ionicons name={def.icon as any} size={22} color={TEETHING_BLUE} style={styles.symptomIcon} />
                <Text style={styles.symptomName}>{t(def.labelKey)}</Text>
                {count > 0 && (
                  <View style={styles.symptomCount}>
                    <Text style={styles.symptomCountText}>{count}x</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedSymptom && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('teething.severity') || 'Severity'}</Text>
            <View style={styles.severityRow}>
              {([1, 2, 3] as const).map((sev) => (
                <TouchableOpacity
                              accessibilityLabel={`Set severity to ${sev === 1 ? 'Mild' : sev === 2 ? 'Moderate' : 'Severe'}`}
                  key={sev}
                  style={[styles.severityButton, severity === sev && styles.severityButtonActive]}
                  activeOpacity={0.7}
                  onPress={() => setSeverity(sev)}
                >
                  <Text style={[styles.severityText, severity === sev && styles.severityTextActive]}>
                    {sev === 1 ? `${t('teething.severity.mild')} 😌` : sev === 2 ? `${t('teething.severity.moderate')} 😣` : `${t('teething.severity.severe')} 😫`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.noteInput}>
              <Text style={styles.noteInputLabel}>{t('teething.noteOptional') || 'Note (optional)'}</Text>
              <TouchableOpacity onPress={() => Alert.prompt ? Alert.prompt('Add note', '', (text) => setNote(text || '')) : null}>
                              accessibilityLabel="Add teething entry"
                <Text style={styles.noteInputText}>{note || t('teething.tapToAddNote') || 'Tap to add note...'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.logButton} activeOpacity={0.7} onPress={logSymptom} accessibilityLabel="Log the selected symptom with current severity">
              <Text style={styles.logButtonText}>✓ {t('teething.logSymptom') || 'Log Symptom'}</Text>
            </TouchableOpacity>
          </>
        )}

        {todaySymptoms.length > 0 && (
          <>
            <Text style={styles.symptomHistoryTitle}>{t('teething.todayLog') || "Today's Log"}</Text>
            {todaySymptoms.map((entry) => {
              const def = SYMPTOMS_DEFINITIONS[entry.symptom];
              return (
                <View key={entry.id} style={styles.symptomHistoryItem}>
                  <Ionicons name={def.icon as any} size={18} color={TEETHING_BLUE} style={styles.symptomHistoryIcon} />
                  <Text style={styles.symptomHistoryText}>
                    {t(def.labelKey)} · {entry.severity === 1 ? t('teething.severity.mild') : entry.severity === 2 ? t('teething.severity.moderate') : t('teething.severity.severe')}
                    {entry.note && ` · "${entry.note}"`}
                  </Text>
                  <Text style={styles.symptomHistoryTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </Text>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const renderRelief = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('teething.painReliefMethods') || 'Pain Relief Methods'}</Text>
      {PAIN_RELIEF_METHODS.map((method) => (
        <View key={method.id} style={styles.reliefCard}>
          <View style={styles.reliefHeader}>
            <Ionicons name={method.icon as any} size={22} color={TEETHING_BLUE} style={styles.reliefIcon} />
            <Text style={styles.reliefName}>{t(method.labelKey)}</Text>
          </View>
          <Text style={styles.reliefNote}>{t(method.noteKey)}</Text>
        </View>
      ))}

      <View style={[styles.reliefCard, { borderColor: TEETHING_AMBER, borderWidth: 1 }]}>
        <View style={styles.reliefHeader}>
          <Ionicons name="medical-outline" size={22} color={TEETHING_AMBER} style={styles.reliefIcon} />
          <Text style={styles.reliefName}>{t('teething.otcDosageTitle') || 'OTC Pain Relief'}</Text>
        </View>
        <Text style={styles.reliefNote}>{t('teething.otcDosageNote') || 'Consult your pediatrician before giving any medication.'}</Text>
        {babyAge < 6 && (
          <View style={styles.ageWarningBadge}>
            <Text style={styles.ageWarningText}>⚠️ {t('teething.underSixMonths')}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderTips = () => {
    const tips = [
      { title: t('teething.tipFrozenRingTitle') || 'Frozen Teething Ring', body: t('teething.tipFrozenRingBody') || 'Freeze a silicone teething ring for 30 mins. The cold numbs gums safely. Never freeze gel-filled rings.' },
      { title: t('teething.tipBitingTitle') || 'Biting Everything', body: t('teething.tipBitingBody') || "Baby's gums are inflamed — biting applies counter-pressure. Offer cold washcloths, silicone toys, or wooden teethers." },
      { title: t('teething.tipDroolRashTitle') || 'Drool Rash', body: t('teething.tipDroolRashBody') || 'Excess drool causes chin/neck rash. Pat dry frequently, apply petroleum jelly as barrier, keep a soft bib on.' },
      { title: t('teething.tipFeverTitle') || 'Low-Grade Fever', body: t('teething.tipFeverBody') || 'Teething may cause slight fever (<38°C / 100.4°F). Higher fevers are NOT normal — consult your doctor.' },
      { title: t('teething.tipNightWakingTitle') || 'Night Wakings', body: t('teething.tipNightWakingBody') || 'Teething pain peaks at night. Try cold gum massage before bed, and keep the room cool (68-72°F / 20-22°C).' },
      { title: t('teething.tipFirstToothTitle') || 'First Tooth Care', body: t('teething.tipFirstToothBody') || 'Start brushing when first tooth erupts. Use a tiny smear of fluoride toothpaste on a soft infant toothbrush.' },
    ];
    return (
      <View>
        {tips.map((tip, idx) => (
          <View key={idx} style={styles.tipCard}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipText}>{tip.body}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('teething.greeting') || 'Baby Care'}</Text>
          <Text style={styles.title}>{t('teething.title') || '🦷 Teething'}</Text>
          <Text style={styles.subtitle}>{t('teething.subtitle') || 'Track teeth & comfort symptoms'}</Text>
        </View>

        <View style={styles.darkToggle}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="moon" size={20} color={darkMode ? '#F59E0B' : C.text} style={{ marginRight: 8 }} />
            <Text style={styles.darkToggleLabel}>{t('teething.darkMode') || 'Dark Mode'}</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: C.border, true: TEETHING_BLUE }}
            thumbColor={darkMode ? '#F59E0B' : '#fff'}
          />
        </View>

        <View style={styles.tabBar}>
          {(['chart', 'tracker', 'relief', 'tips'] as const).map((tab) => (
            <TouchableOpacity
                          accessibilityLabel={`Switch to ${tab === 'chart' ? 'tooth chart' : tab === 'tracker' ? 'symptom tracker' : tab === 'relief' ? 'pain relief methods' : 'tips'} tab`}
              key={tab}
              style={[styles.tabButton, currentScreen === tab && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => setCurrentScreen(tab)}
            >
              <Text style={[styles.tabButtonText, currentScreen === tab && styles.tabButtonTextActive]}>
                {tab === 'chart' ? '🦷' : tab === 'tracker' ? '📋' : tab === 'relief' ? '💊' : '💡'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentScreen === 'chart' && renderChart()}
        {currentScreen === 'tracker' && renderTracker()}
        {currentScreen === 'relief' && renderRelief()}
        {currentScreen === 'tips' && renderTips()}
      </ScrollView>
    </SafeAreaView>
  );
}