import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PINCEVIC_KEY = STORAGE_KEYS.PINCER_EVENTS;
const READINESS_KEY = STORAGE_KEYS.FEEDING_READINESS;
const PROFILE_KEY = '@jobble_baby_profile';

const PINCER_BLUE = '#3B82F6';
const PINCER_GREEN = '#10B981';
const PINCER_AMBER = '#F59E0B';
const PINCER_RED = '#EF4444';
const PINCER_PURPLE = '#8B5CF6';

interface PincerEvent {
  id: string;
  date: string;
  precision_score: number;
  food_type: string;
  grasp_method: 'radical' | 'precise';
  duration_sec: number;
  notes?: string;
  timestamp: string;
  babyAgeMonths: number;
}

interface FeedingReadinessScore {
  id: string;
  date: string;
  pincer_score: number;
  finger_strength: number;
  oral_motor: number;
  sitting_balance: number;
  overall_score: number;
  timestamp: string;
}

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

function getPrecisionLabel(score: number, t: (k: string) => string): string {
  if (score >= 5) return t('pincerGrasp.precisionExcellent');
  if (score >= 4) return t('pincerGrasp.precisionGood');
  if (score >= 3) return t('pincerGrasp.precisionModerate');
  if (score >= 2) return t('pincerGrasp.precisionFair');
  return t('pincerGrasp.precisionPoor');
}

function getPrecisionColor(score: number): string {
  if (score >= 5) return PINCER_GREEN;
  if (score >= 4) return PINCER_BLUE;
  if (score >= 3) return PINCER_AMBER;
  return PINCER_RED;
}

export default function PincerGraspScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [events, setEvents] = useState<PincerEvent[]>([]);
  const [readinessScore, setReadinessScore] = useState<FeedingReadinessScore | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [activeSection, setActiveSection] = useState('logger');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [precisionScore, setPrecisionScore] = useState(3);
  const [foodType, setFoodType] = useState('');
  const [graspMethod, setGraspMethod] = useState<'radical' | 'precise'>('precise');
  const [durationSec, setDurationSec] = useState('');
  const [notes, setNotes] = useState('');

  // Readiness form state
  const [showReadinessForm, setShowReadinessForm] = useState(false);
  const [pincerScore, setPincerScore] = useState(3);
  const [fingerStrength, setFingerStrength] = useState(3);
  const [oralMotor, setOralMotor] = useState(3);
  const [sittingBalance, setSittingBalance] = useState(3);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, readyRaw, profileRaw] = await Promise.all([
        safeGetItem(PINCEVIC_KEY),
        safeGetItem(READINESS_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (raw) setEvents(JSON.parse(raw));
      if (readyRaw) setReadinessScore(JSON.parse(readyRaw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const openForm = () => {
    setPrecisionScore(3);
    setFoodType('');
    setGraspMethod('precise');
    setDurationSec('');
    setNotes('');
    setShowForm(true);
  };

  const saveEntry = async () => {
    if (!foodType.trim()) return;

    const entry: PincerEvent = {
      id: Date.now().toString(),
      date: getDateStr(),
      precision_score: precisionScore,
      food_type: foodType.trim(),
      grasp_method: graspMethod,
      duration_sec: parseInt(durationSec) || 0,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
      babyAgeMonths,
    };

    const updated = [entry, ...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setEvents(updated);
    setShowForm(false);

    try {
      await safeSetItem(PINCEVIC_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveReadinessEntry = async () => {
    const overall = (pincerScore + fingerStrength + oralMotor + sittingBalance) / 4;
    const entry: FeedingReadinessScore = {
      id: Date.now().toString(),
      date: getDateStr(),
      pincer_score: pincerScore,
      finger_strength: fingerStrength,
      oral_motor: oralMotor,
      sitting_balance: sittingBalance,
      overall_score: overall,
      timestamp: new Date().toISOString(),
    };
    setReadinessScore(entry);
    setShowReadinessForm(false);
    try {
      await safeSetItem(READINESS_KEY, JSON.stringify(entry));
    } catch {}
  };

  const SECTIONS = [
    { key: 'logger', label: 'milestoneLogger', icon: 'hand-back-left' },
    { key: 'readiness', label: 'feedingReadinessIndex', icon: 'chart-bell-curve' },
    { key: 'timeline', label: 'foodProgression', icon: 'food' },
    { key: 'spoon', label: 'spoonReadiness', icon: 'silverware-fork-knife' },
    { key: 'handoff', label: 'selfFeedingHandoff', icon: 'hand-pointing-up' },
  ];

  const precisionOptions = [1, 2, 3, 4, 5];
  const scoreOptions = [1, 2, 3, 4, 5];

  // Food progression stages
  const FOOD_STAGES = [
    { stage: 1, label: 'meltableSolids', age: 'meltableSolidsMo', minMo: 6, maxMo: 7, examples: 'Baby puffs, crackers' },
    { stage: 2, label: 'softCubed', age: 'softCubedMo', minMo: 7, maxMo: 8, examples: 'Soft banana, avocado' },
    { stage: 3, label: 'fingerFoods', age: 'fingerFoodsMo', minMo: 8, maxMo: 9, examples: 'Cooked veggies, pasta' },
    { stage: 4, label: 'pincerRequired', age: 'pincerRequiredMo', minMo: 9, maxMo: 12, examples: 'Small berries, cheerios' },
  ];

  const getCurrentFoodStage = (): number => {
    if (events.length > 0) {
      const latestAge = events[0].babyAgeMonths;
      for (const s of FOOD_STAGES) {
        if (latestAge >= s.minMo && latestAge <= s.maxMo) return s.stage;
      }
      if (latestAge > 12) return 4;
    }
    if (babyAgeMonths >= 9) return 4;
    if (babyAgeMonths >= 8) return 3;
    if (babyAgeMonths >= 7) return 2;
    if (babyAgeMonths >= 6) return 1;
    return 0;
  };

  // Spoon readiness stages
  const SPOON_STAGES = [
    { stage: 1, label: 'spoonOnly', age: 'spoonOnlyMo', minMo: 12 },
    { stage: 2, label: 'spoonFork', age: 'spoonForkMo', minMo: 13 },
    { stage: 3, label: 'proficientSpoon', age: 'proficientSpoonMo', minMo: 15 },
  ];

  const getCurrentSpoonStage = (): number => {
    if (babyAgeMonths >= 15) return 3;
    if (babyAgeMonths >= 13) return 2;
    if (babyAgeMonths >= 12) return 1;
    return 0;
  };

  // Mastery calculation
  const calculateMasterySlope = (): { slope: number; predictedMonths: number; confidence: string } => {
    if (events.length < 2) {
      return { slope: 0, predictedMonths: 0, confidence: 'low' };
    }
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const n = sortedEvents.length;
    const xMean = (n - 1) / 2;
    const yMean = sortedEvents.reduce((sum, e) => sum + e.precision_score, 0) / n;

    let numerator = 0;
    let denominator = 0;
    sortedEvents.forEach((e, i) => {
      numerator += (i - xMean) * (e.precision_score - yMean);
      denominator += (i - xMean) * (i - xMean);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const currentScore = sortedEvents[n - 1].precision_score;
    const monthsToMastery = slope > 0 ? (5 - currentScore) / slope : 999;
    const predictedMonths = Math.max(0, Math.round(monthsToMastery * 10) / 10);

    let confidence = 'low';
    if (n >= 5 && Math.abs(slope) > 0.3) confidence = 'high';
    else if (n >= 3) confidence = 'medium';

    return { slope, predictedMonths, confidence };
  };

  const mastery = calculateMasterySlope();
  const currentFoodStage = getCurrentFoodStage();
  const currentSpoonStage = getCurrentSpoonStage();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    sectionBtnActive: { backgroundColor: PINCER_BLUE, borderColor: PINCER_BLUE },
    sectionBtnText: { fontSize: 11, color: C.muted, fontWeight: '500' },
    sectionBtnTextActive: { color: '#fff' },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    // Logger
    eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    eventIcon: { fontSize: 22, marginRight: 10 },
    eventInfo: { flex: 1 },
    eventType: { fontSize: 14, fontWeight: '600', color: C.text },
    eventNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    eventScore: { fontSize: 14, fontWeight: '700', color: PINCER_BLUE },
    eventTime: { fontSize: 12, color: C.muted },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PINCER_BLUE, borderRadius: 12, padding: 14, marginTop: 8 },
    addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 24 },
    // Form
    formCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: PINCER_BLUE },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    formLabel: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
    formInput: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, fontSize: 14, color: C.text, marginBottom: 12 },
    scoreRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    scoreOption: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    scoreOptionSelected: { borderColor: PINCER_BLUE, backgroundColor: PINCER_BLUE },
    scoreOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    scoreOptionTextSelected: { color: '#fff' },
    graspRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    graspOption: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    graspOptionSelected: { borderColor: PINCER_GREEN, backgroundColor: PINCER_GREEN },
    graspOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    graspOptionTextSelected: { color: '#fff' },
    formBtnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: PINCER_BLUE, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    // Readiness
    readinessCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    readinessHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    readinessIcon: { fontSize: 28, marginRight: 12 },
    readinessTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    readinessSubtitle: { fontSize: 13, color: C.muted },
    readinessBar: { backgroundColor: C.border, borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 6 },
    readinessFill: { borderRadius: 8, height: 12 },
    readinessPct: { fontSize: 12, color: C.muted, textAlign: 'right' },
    readinessFactor: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    readinessFactorLabel: { flex: 1, fontSize: 13, color: C.muted },
    readinessFactorValue: { fontSize: 13, fontWeight: '700', color: C.text },
    overallScore: { fontSize: 24, fontWeight: '700', color: PINCER_BLUE, textAlign: 'center', marginTop: 8 },
    // Bridge
    bridgeCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    bridgeTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    bridgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    bridgeStep: { flex: 1, backgroundColor: C.background, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    bridgeStepActive: { borderColor: PINCER_GREEN, backgroundColor: '#ECFDF5' },
    bridgeStepText: { fontSize: 12, fontWeight: '600', color: C.muted, textAlign: 'center' },
    bridgeStepTextActive: { color: PINCER_GREEN },
    bridgeStepAge: { fontSize: 10, color: C.muted, marginTop: 2 },
    bridgeArrow: { fontSize: 16, color: C.muted },
    bridgeExamples: { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' },
    // Handoff
    handoffCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    handoffTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    handoffRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    handoffLabel: { fontSize: 13, color: C.muted },
    handoffValue: { fontSize: 13, fontWeight: '600', color: C.text },
    handoffValueHigh: { color: PINCER_GREEN },
    handoffValueMedium: { color: PINCER_AMBER },
    handoffValueLow: { color: PINCER_RED },
    masteryBadge: { backgroundColor: PINCER_BLUE, borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12 },
    masteryBadgeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    // Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modal: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    fieldLabel: { fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 6, fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    // Info
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: PINCER_BLUE },
    infoTitle: { fontSize: 13, fontWeight: '700', color: PINCER_BLUE, marginBottom: 6 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('pincerGrasp.greeting')}</Text>
          <Text style={styles.title}>✋ {t('pincerGrasp.title')}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} ${t('landau.monthsOld') || 'months old'} · ${t('pincerGrasp.subtitle')}`
              : t('pincerGrasp.subtitle')}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('pincerGrasp.title')}</Text>
          <Text style={styles.infoText}>
            Pincer grasp is the ability to pick up small objects using thumb and forefinger. Typically develops between 8-12 months and is a key milestone for self-feeding.
          </Text>
        </View>

        <View style={styles.sectionNav}>
          {SECTIONS.map(s => (
            <TouchableOpacity
              accessibilityLabel={`${t('pincerGrasp.' + s.label)} section`}
              key={s.key}
              style={[styles.sectionBtn, activeSection === s.key && styles.sectionBtnActive]}
              onPress={() => setActiveSection(s.key)}
            >
              <MaterialCommunityIcons name={s.icon as any} size={12} color={activeSection === s.key ? '#fff' : C.muted} />
              <Text style={[styles.sectionBtnText, activeSection === s.key && styles.sectionBtnTextActive]}>
                {t('pincerGrasp.' + s.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 1: Milestone Logger */}
        {activeSection === 'logger' && (
          <>
            <TouchableOpacity accessibilityLabel={t('pincerGrasp.logEvent')} style={styles.addBtn} onPress={openForm}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>{t('pincerGrasp.logEvent')}</Text>
            </TouchableOpacity>

            {events.length === 0 && (
              <Text style={styles.emptyText}>{t('pincerGrasp.noEvents')}</Text>
            )}

            {events.slice(0, 10).map((entry, i) => (
              <View key={entry.id} style={[styles.card, i === Math.min(events.length, 10) - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.eventRow}>
                  <MaterialCommunityIcons name="hand-back-left" size={22} color={getPrecisionColor(entry.precision_score)} style={styles.eventIcon} accessibilityLabel="pincer event icon" />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventType}>
                      {getPrecisionLabel(entry.precision_score, t)} · {entry.food_type}
                    </Text>
                    <Text style={styles.eventNote}>
                      {entry.grasp_method === 'precise' ? t('pincerGrasp.graspMethodPrecise') : t('pincerGrasp.graspMethodRadical')}
                      {entry.duration_sec > 0 ? ` · ${entry.duration_sec}s` : ''}
                    </Text>
                    {entry.notes && <Text style={styles.eventNote}>{entry.notes}</Text>}
                  </View>
                  <Text style={styles.eventTime}>
                    {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.round(entry.babyAgeMonths)}mo
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Section 2: Feeding Readiness Index */}
        {activeSection === 'readiness' && (
          <>
            <View style={styles.card}>
              <View style={styles.readinessHeader}>
                <MaterialCommunityIcons name="chart-bell-curve" size={28} color={PINCER_BLUE} style={styles.readinessIcon} />
                <View>
                  <Text style={styles.readinessTitle}>{t('pincerGrasp.feedingReadinessIndex')}</Text>
                  <Text style={styles.readinessSubtitle}>{t('pincerGrasp.readinessRadar')}</Text>
                </View>
              </View>

              <View style={styles.readinessBar}>
                <View
                  style={[
                    styles.readinessFill,
                    {
                      width: `${Math.round((readinessScore?.overall_score ?? 0) / 5 * 100)}%`,
                      backgroundColor: getPrecisionColor(readinessScore?.overall_score ?? 0),
                    },
                  ]}
                />
              </View>
              <Text style={styles.readinessPct}>
                {t('pincerGrasp.overallScore')}: {readinessScore ? readinessScore.overall_score.toFixed(1) : '-'} / 5
              </Text>

              {[
                { label: t('pincerGrasp.pincerPrecision'), value: readinessScore?.pincer_score },
                { label: t('pincerGrasp.fingerStrength'), value: readinessScore?.finger_strength },
                { label: t('pincerGrasp.oralMotor'), value: readinessScore?.oral_motor },
                { label: t('pincerGrasp.sittingBalance'), value: readinessScore?.sitting_balance },
              ].map((factor, i) => (
                <View key={i} style={styles.readinessFactor}>
                  <Text style={styles.readinessFactorLabel}>{factor.label}</Text>
                  <Text style={styles.readinessFactorValue}>{factor.value ?? '-'}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity accessibilityLabel={t('pincerGrasp.feedingReadinessIndex')} style={styles.addBtn} onPress={() => setShowReadinessForm(true)}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>{t('pincerGrasp.feedingReadinessIndex')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Section 3: Food Progression Timeline */}
        {activeSection === 'timeline' && (
          <View style={styles.bridgeCard}>
            <Text style={styles.bridgeTitle}>{t('pincerGrasp.foodProgression')}</Text>
            <View style={styles.bridgeRow}>
              {FOOD_STAGES.map((s, idx) => (
                <View key={s.stage} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={[
                      styles.bridgeStep,
                      currentFoodStage >= s.stage && styles.bridgeStepActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="food"
                      size={20}
                      color={currentFoodStage >= s.stage ? PINCER_GREEN : C.muted}
                    />
                    <Text
                      style={[
                        styles.bridgeStepText,
                        currentFoodStage >= s.stage && styles.bridgeStepTextActive,
                      ]}
                    >
                      {t('pincerGrasp.' + s.label)}
                    </Text>
                    <Text style={styles.bridgeStepAge}>{t('pincerGrasp.' + s.age)}</Text>
                  </View>
                  {idx < FOOD_STAGES.length - 1 && (
                    <Text style={styles.bridgeArrow}>→</Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.bridgeExamples}>
              {currentFoodStage > 0 ? FOOD_STAGES[currentFoodStage - 1].examples : t('pincerGrasp.meltableSolids')}
            </Text>
          </View>
        )}

        {/* Section 4: Spoon Readiness Bridge */}
        {activeSection === 'spoon' && (
          <View style={styles.bridgeCard}>
            <Text style={styles.bridgeTitle}>{t('pincerGrasp.spoonReadiness')}</Text>
            <View style={styles.bridgeRow}>
              {SPOON_STAGES.map((s, idx) => (
                <View key={s.stage} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={[
                      styles.bridgeStep,
                      currentSpoonStage >= s.stage && styles.bridgeStepActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="silverware-fork-knife"
                      size={20}
                      color={currentSpoonStage >= s.stage ? PINCER_GREEN : C.muted}
                    />
                    <Text
                      style={[
                        styles.bridgeStepText,
                        currentSpoonStage >= s.stage && styles.bridgeStepTextActive,
                      ]}
                    >
                      {t('pincerGrasp.' + s.label)}
                    </Text>
                    <Text style={styles.bridgeStepAge}>{t('pincerGrasp.' + s.age)}</Text>
                  </View>
                  {idx < SPOON_STAGES.length - 1 && (
                    <Text style={styles.bridgeArrow}>→</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 5: Self-Feeding Handoff */}
        {activeSection === 'handoff' && (
          <View style={styles.handoffCard}>
            <Text style={styles.handoffTitle}>{t('pincerGrasp.selfFeedingHandoff')}</Text>
            <View style={styles.handoffRow}>
              <Text style={styles.handoffLabel}>{t('pincerGrasp.pincerPrecision')}</Text>
              <Text style={styles.handoffValue}>
                {events.length > 0 ? getPrecisionLabel(events[0].precision_score, t) : '-'}
              </Text>
            </View>
            <View style={styles.handoffRow}>
              <Text style={styles.handoffLabel}>{t('pincerGrasp.masteryCurve')}</Text>
              <Text
                style={[
                  styles.handoffValue,
                  mastery.confidence === 'high' && styles.handoffValueHigh,
                  mastery.confidence === 'medium' && styles.handoffValueMedium,
                  mastery.confidence === 'low' && styles.handoffValueLow,
                ]}
              >
                {mastery.slope > 0 ? `+${mastery.slope.toFixed(2)}` : mastery.slope.toFixed(2)} / event
              </Text>
            </View>
            <View style={styles.handoffRow}>
              <Text style={styles.handoffLabel}>{t('pincerGrasp.predictedOnset')}</Text>
              <Text style={styles.handoffValue}>
                {mastery.predictedMonths > 0 && mastery.predictedMonths < 24
                  ? `${mastery.predictedMonths.toFixed(1)} ${t('landau.monthsOld') || 'months'}`
                  : '-'}
              </Text>
            </View>
            <View style={styles.handoffRow}>
              <Text style={styles.handoffLabel}>{t('pincerGrasp.basedOnSlope')}</Text>
              <Text style={styles.handoffValue}>
                {mastery.confidence === 'high' ? 'High' : mastery.confidence === 'medium' ? 'Medium' : 'Low'} confidence
              </Text>
            </View>
            {mastery.confidence !== 'low' && mastery.predictedMonths > 0 && mastery.predictedMonths < 24 && (
              <View style={styles.masteryBadge}>
                <Text style={styles.masteryBadgeText}>
                  🎉 {t('pincerGrasp.selfFeedingReady')} {t('landau.monthsOld') || 'months'}: {Math.round(babyAgeMonths + mastery.predictedMonths)}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Pincer Event Form Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('pincerGrasp.logEvent')}</Text>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.precisionScore')}</Text>
            <View style={styles.scoreRow}>
              {precisionOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`${t('pincerGrasp.precisionScore')} ${opt}`}
                  key={opt}
                  style={[styles.scoreOption, precisionScore === opt && styles.scoreOptionSelected]}
                  onPress={() => setPrecisionScore(opt)}
                >
                  <Text style={[styles.scoreOptionText, precisionScore === opt && styles.scoreOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.foodType')}</Text>
            <TextInput
              style={styles.formInput}
              value={foodType}
              onChangeText={setFoodType}
              placeholder="e.g. cheerios, banana"
              placeholderTextColor={C.muted}
            />

            <Text style={styles.fieldLabel}>{t('pincerGrasp.graspMethod')}</Text>
            <View style={styles.graspRow}>
              <TouchableOpacity
                accessibilityLabel={t('pincerGrasp.graspMethodRadical')}
                style={[styles.graspOption, graspMethod === 'radical' && styles.graspOptionSelected]}
                onPress={() => setGraspMethod('radical')}
              >
                <Text style={[styles.graspOptionText, graspMethod === 'radical' && styles.graspOptionTextSelected]}>
                  {t('pincerGrasp.graspMethodRadical')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('pincerGrasp.graspMethodPrecise')}
                style={[styles.graspOption, graspMethod === 'precise' && styles.graspOptionSelected]}
                onPress={() => setGraspMethod('precise')}
              >
                <Text style={[styles.graspOptionText, graspMethod === 'precise' && styles.graspOptionTextSelected]}>
                  {t('pincerGrasp.graspMethodPrecise')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.durationSec')}</Text>
            <TextInput
              style={styles.formInput}
              value={durationSec}
              onChangeText={setDurationSec}
              keyboardType="number-pad"
              placeholder="e.g. 30"
              placeholderTextColor={C.muted}
            />

            <Text style={styles.fieldLabel}>{t('pincerGrasp.notes')}</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 56 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={t('pincerGrasp.notesPlaceholder')}
              placeholderTextColor={C.muted}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                accessibilityLabel={t('common.cancel')}
                style={styles.cancelBtn}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('common.save')}
                style={styles.saveBtn}
                onPress={saveEntry}
              >
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Readiness Score Form Modal */}
      <Modal visible={showReadinessForm} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('pincerGrasp.feedingReadinessIndex')}</Text>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.pincerPrecision')}</Text>
            <View style={styles.scoreRow}>
              {scoreOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`${t('pincerGrasp.pincerPrecision')} ${opt}`}
                  key={opt}
                  style={[styles.scoreOption, pincerScore === opt && styles.scoreOptionSelected]}
                  onPress={() => setPincerScore(opt)}
                >
                  <Text style={[styles.scoreOptionText, pincerScore === opt && styles.scoreOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.fingerStrength')}</Text>
            <View style={styles.scoreRow}>
              {scoreOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`${t('pincerGrasp.fingerStrength')} ${opt}`}
                  key={opt}
                  style={[styles.scoreOption, fingerStrength === opt && styles.scoreOptionSelected]}
                  onPress={() => setFingerStrength(opt)}
                >
                  <Text style={[styles.scoreOptionText, fingerStrength === opt && styles.scoreOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.oralMotor')}</Text>
            <View style={styles.scoreRow}>
              {scoreOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`${t('pincerGrasp.oralMotor')} ${opt}`}
                  key={opt}
                  style={[styles.scoreOption, oralMotor === opt && styles.scoreOptionSelected]}
                  onPress={() => setOralMotor(opt)}
                >
                  <Text style={[styles.scoreOptionText, oralMotor === opt && styles.scoreOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('pincerGrasp.sittingBalance')}</Text>
            <View style={styles.scoreRow}>
              {scoreOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`${t('pincerGrasp.sittingBalance')} ${opt}`}
                  key={opt}
                  style={[styles.scoreOption, sittingBalance === opt && styles.scoreOptionSelected]}
                  onPress={() => setSittingBalance(opt)}
                >
                  <Text style={[styles.scoreOptionText, sittingBalance === opt && styles.scoreOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                accessibilityLabel={t('common.cancel')}
                style={styles.cancelBtn}
                onPress={() => setShowReadinessForm(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('common.save')}
                style={styles.saveBtn}
                onPress={saveReadinessEntry}
              >
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}