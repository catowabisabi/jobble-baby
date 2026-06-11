import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const CUP_FEEDING_KEY = '@jobble/cup_feeding_entries';
const PROFILE_KEY = '@jobble_baby_profile';

const STAGES = [
  { id: 'stage1', labelKey: 'cupFeeding.stage1', icon: 'cup-outline', minMonths: 6, maxMonths: 7 },
  { id: 'stage2', labelKey: 'cupFeeding.stage2', icon: 'straw', minMonths: 7, maxMonths: 9 },
  { id: 'stage3', labelKey: 'cupFeeding.stage3', icon: 'glass-cocktail', minMonths: 9, maxMonths: 12 },
] as const;

const CUP_TYPES = [
  { id: 'soft_spout', label: 'Soft Spout Trainer Cup', stages: ['stage1'] },
  { id: 'straw_cup', label: 'Straw Cup', stages: ['stage2'] },
  { id: 'open_cup', label: 'Open Cup', stages: ['stage3'] },
] as const;

interface CupFeedingEntry {
  id: string;
  date: string;
  timestamp: string;
  durationMinutes: number;
  cupType: string;
  sipSuccess: number;
  spillLevel: number;
  notes?: string;
  babyAgeMonths: number;
}

const CUP_GREEN = '#10B981';
const CUP_BLUE = '#3B82F6';
const CUP_AMBER = '#F59E0B';

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

function getStageForAge(ageMonths: number): string {
  if (ageMonths < 6) return 'pre_stage';
  if (ageMonths < 7) return 'stage1';
  if (ageMonths < 9) return 'stage2';
  return 'stage3';
}

function getDaysInStage(entries: CupFeedingEntry[], stageId: string): number {
  const stageStages: Record<string, number> = {
    stage1: 30,
    stage2: 60,
    stage3: 90,
  };
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (stageStages[stageId] || 30));
  const stageEntries = entries.filter(
    (e) => e.date >= startDate.toISOString().split('T')[0] && e.cupType === stageId
  );
  const uniqueDays = new Set(stageEntries.map((e) => e.date));
  return uniqueDays.size;
}

function isStrawMastered(entries: CupFeedingEntry[]): boolean {
  const strawEntries = entries.filter((e) => e.cupType === 'straw_cup');
  if (strawEntries.length < 14) return false;
  const uniqueDays = new Set(strawEntries.map((e) => e.date));
  return uniqueDays.size >= 14;
}

function isFirstOpenCupSuccess(entries: CupFeedingEntry[]): boolean {
  const openCupEntries = entries.filter((e) => e.cupType === 'open_cup' && e.sipSuccess >= 3);
  return openCupEntries.length > 0;
}

function computeAvgSipSuccess(entries: CupFeedingEntry[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, e) => acc + e.sipSuccess, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

function computeAvgSpillLevel(entries: CupFeedingEntry[]): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, e) => acc + e.spillLevel, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

const READINESS_CHECKS = [
  { id: 'head_control', labelKey: 'cupFeeding.readinessHeadControl', icon: 'human-handsup' },
  { id: 'sitting_support', labelKey: 'cupFeeding.readinessSittingSupport', icon: 'seat' },
  { id: 'hand_mouth', labelKey: 'cupFeeding.readinessHandMouth', icon: 'hand-back-right' },
  { id: 'tongue_thrust', labelKey: 'cupFeeding.readinessTongueThrust', icon: 'tongue' },
  { id: 'interest', labelKey: 'cupFeeding.readinessInterest', icon: 'cup' },
] as const;

type ReadinessCheckId = typeof READINESS_CHECKS[number]['id'];

export default function CupFeedingScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<CupFeedingEntry[]>([]);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [showLogForm, setShowLogForm] = useState(false);
  const [duration, setDuration] = useState('');
  const [selectedCupType, setSelectedCupType] = useState('');
  const [sipSuccess, setSipSuccess] = useState(3);
  const [spillLevel, setSpillLevel] = useState(3);
  const [notes, setNotes] = useState('');
  const [readinessChecks, setReadinessChecks] = useState<Set<ReadinessCheckId>>(new Set());
  const [newBadge, setNewBadge] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(CUP_FEEDING_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (raw) setEntries(JSON.parse(raw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const toggleReadinessCheck = (checkId: ReadinessCheckId) => {
    setReadinessChecks((prev) => {
      const next = new Set(prev);
      if (next.has(checkId)) next.delete(checkId);
      else next.add(checkId);
      return next;
    });
  };

  const isReady = babyAgeMonths >= 4 && readinessChecks.size >= 3;
  const currentStage = getStageForAge(babyAgeMonths);
  const stageIndex = STAGES.findIndex((s) => s.id === currentStage);
  const strawMastered = isStrawMastered(entries);
  const firstOpenCup = isFirstOpenCupSuccess(entries);
  const avgSipSuccess = computeAvgSipSuccess(entries);
  const avgSpillLevel = computeAvgSpillLevel(entries);

  const logPractice = async () => {
    if (!selectedCupType) {
      Alert.alert(t('cupFeeding.selectCupTypeTitle') || 'Select Cup Type', t('cupFeeding.selectCupTypeBody') || 'Please select a cup type');
      return;
    }
    const durationNum = parseInt(duration || '0', 10);
    if (durationNum <= 0) {
      Alert.alert(t('cupFeeding.enterDurationTitle') || 'Enter Duration', t('cupFeeding.enterDurationBody') || 'Please enter practice duration');
      return;
    }

    const newEntry: CupFeedingEntry = {
      id: `${Date.now()}`,
      date: getDateStr(),
      timestamp: new Date().toISOString(),
      durationMinutes: durationNum,
      cupType: selectedCupType,
      sipSuccess,
      spillLevel,
      notes: notes.trim() || undefined,
      babyAgeMonths,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    setDuration('');
    setSelectedCupType('');
    setSipSuccess(3);
    setSpillLevel(3);
    setNotes('');
    setShowLogForm(false);

    try {
      await AsyncStorage.setItem(CUP_FEEDING_KEY, JSON.stringify(updated));
      if (updated.length >= 5 && !newBadge) {
        await awardBadge('cup_feeding_tracked');
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 4000);
      }
      if (firstOpenCup === false && isFirstOpenCupSuccess(updated)) {
        await awardBadge('first_open_cup');
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 4000);
      }
    } catch {}
  };

  const getCupTypeLabel = (cupId: string): string => {
    const cup = CUP_TYPES.find((c) => c.id === cupId);
    return cup ? cup.label : cupId;
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.text, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.text, marginTop: 4 },
    sectionTitle: { fontSize: 12, fontWeight: '600', color: C.text, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    summaryIcon: { fontSize: 28, marginRight: 12 },
    summaryTextBlock: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    summarySubtitle: { fontSize: 13, color: C.muted },
    stageProgressContainer: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    stageProgressTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 16 },
    stageProgressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    stageStep: { flex: 1, alignItems: 'center' },
    stageStepCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    stageStepCircleActive: { backgroundColor: CUP_BLUE },
    stageStepCircleComplete: { backgroundColor: CUP_GREEN },
    stageStepLabel: { fontSize: 10, color: C.muted, textAlign: 'center' },
    stageStepLabelActive: { color: CUP_BLUE, fontWeight: '600' },
    stageStepLabelComplete: { color: CUP_GREEN, fontWeight: '600' },
    progressLine: { flex: 1, height: 3, backgroundColor: C.border, marginHorizontal: 4 },
    progressLineActive: { backgroundColor: CUP_BLUE },
    progressLineComplete: { backgroundColor: CUP_GREEN },
    stageInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    stageInfoLabel: { fontSize: 12, color: C.muted },
    stageInfoValue: { fontSize: 12, fontWeight: '600', color: C.text },
    readinessCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    readinessTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
    readinessDesc: { fontSize: 12, color: C.muted, marginBottom: 12 },
    readinessGrid: { gap: 8 },
    readinessItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
      minHeight: 44,
    },
    readinessItemSelected: { backgroundColor: CUP_GREEN, borderColor: CUP_GREEN },
    readinessText: { fontSize: 13, color: C.muted, flex: 1 },
    readinessTextSelected: { color: '#fff' },
    readinessStatus: { fontSize: 12, fontWeight: '600', marginTop: 12 },
    readinessStatusReady: { color: CUP_GREEN },
    readinessStatusNotReady: { color: CUP_AMBER },
    cupRecCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    cupRecTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
    cupRecItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    cupRecIcon: { fontSize: 20 },
    cupRecLabel: { fontSize: 13, color: C.text, flex: 1 },
    cupRecStage: { fontSize: 11, color: C.muted },
    logBtn: {
      backgroundColor: CUP_BLUE,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    logBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    formCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: CUP_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    cupTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    cupTypeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
      minHeight: 44,
    },
    cupTypeChipSelected: { backgroundColor: CUP_BLUE, borderColor: CUP_BLUE },
    cupTypeChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
    cupTypeChipTextSelected: { color: '#fff' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    sliderLabel: { fontSize: 14, color: C.muted, width: 120 },
    sliderValue: { fontSize: 16, fontWeight: '700', color: CUP_BLUE, width: 30, textAlign: 'center' },
    sliderButtons: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
    sliderBtnText: { fontSize: 16, fontWeight: '600', color: C.text },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    durationInput: {
      flex: 1,
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 16,
      color: C.text,
      minHeight: 44,
    },
    durationLabel: { fontSize: 14, color: C.muted, width: 80 },
    noteInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      color: C.text,
      minHeight: 60,
      marginBottom: 12,
    },
    formButtonRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, minHeight: 44, justifyContent: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: CUP_GREEN, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    hydrationCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    hydrationTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
    hydrationDesc: { fontSize: 12, color: C.muted, marginBottom: 12 },
    hydrationBar: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: C.border, marginBottom: 8 },
    hydrationSegment: { height: '100%' },
    hydrationLegend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
    hydrationLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    hydrationLegendDot: { width: 8, height: 8, borderRadius: 4 },
    hydrationLegendText: { fontSize: 11, color: C.muted },
    milestoneCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    milestoneTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 12 },
    milestoneItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    milestoneIcon: { fontSize: 18 },
    milestoneText: { fontSize: 13, color: C.text, flex: 1 },
    milestoneBadge: { fontSize: 11, fontWeight: '600', color: CUP_GREEN },
    milestonePending: { fontSize: 11, color: C.muted },
    tipCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: CUP_AMBER, borderLeftWidth: 4, borderLeftColor: CUP_AMBER },
    tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
    tipText: { fontSize: 13, color: '#78350F', lineHeight: 18 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700', color: CUP_BLUE },
    statLabel: { fontSize: 11, color: C.muted, marginTop: 4 },
    historyCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    entryIcon: { fontSize: 20, marginRight: 10, color: CUP_BLUE },
    entryInfo: { flex: 1 },
    entryCupType: { fontSize: 14, fontWeight: '600', color: C.text },
    entryNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
    entryBadge: { backgroundColor: CUP_BLUE, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
    entryBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    entryTime: { fontSize: 12, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    badgeBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: CUP_AMBER, gap: 8 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
    navLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
    navLinkText: { fontSize: 13, color: CUP_BLUE, flex: 1 },
    formNoteLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('cupFeeding.feedingJourney')}</Text>
          <Text style={styles.title}>🥤 {t('cupFeeding.title')}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('cupFeeding.subtitle')}`
              : t('cupFeeding.subtitle')}
          </Text>
        </View>

        {newBadge && (
          <View style={styles.badgeBanner}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={styles.badgeBannerText}>{t('cupFeeding.badgeEarned') || 'Badge earned!'}</Text>
          </View>
        )}

        <View style={styles.stageProgressContainer}>
          <Text style={styles.stageProgressTitle}>{t('cupFeeding.currentStage')}</Text>
          <View style={styles.stageProgressBar}>
            {STAGES.map((stage, idx) => {
              const isComplete = stageIndex > idx;
              const isActive = stageIndex === idx;
              return (
                <View key={stage.id} style={styles.stageStep}>
                  <View style={[
                    styles.stageStepCircle,
                    isActive && styles.stageStepCircleActive,
                    isComplete && styles.stageStepCircleComplete,
                  ]}>
                    {isComplete ? (
                      <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    ) : (
                      <MaterialCommunityIcons name={stage.icon as any} size={18} color={isActive ? '#fff' : C.muted} />
                    )}
                  </View>
                  <Text style={[
                    styles.stageStepLabel,
                    isActive && styles.stageStepLabelActive,
                    isComplete && styles.stageStepLabelComplete,
                  ]}>
                    {idx + 1}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.stageInfo}>
            <Text style={styles.stageInfoLabel}>{t(STAGES[Math.max(0, stageIndex)]?.labelKey ?? '')}</Text>
            <Text style={styles.stageInfoValue}>
              {stageIndex >= 0 ? `${getDaysInStage(entries, STAGES[stageIndex].id)} days` : '-'}
            </Text>
          </View>
        </View>

        {babyAgeMonths < 6 && (
          <View style={styles.readinessCard}>
            <Text style={styles.readinessTitle}>{t('cupFeeding.readinessTitle')}</Text>
            <Text style={styles.readinessDesc}>{t('cupFeeding.readinessDesc')}</Text>
            <View style={styles.readinessGrid}>
              {READINESS_CHECKS.map((check) => (
                <TouchableOpacity
                  key={check.id}
                  style={[styles.readinessItem, readinessChecks.has(check.id) && styles.readinessItemSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleReadinessCheck(check.id)}
                  accessibilityLabel={`${readinessChecks.has(check.id) ? 'Uncheck' : 'Check'} ${t(check.labelKey)}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: readinessChecks.has(check.id) }}
                >
                  <MaterialCommunityIcons
                    name={check.icon as any}
                    size={16}
                    color={readinessChecks.has(check.id) ? '#fff' : C.muted}
                  />
                  <Text style={[styles.readinessText, readinessChecks.has(check.id) && styles.readinessTextSelected]}>
                    {t(check.labelKey)}
                  </Text>
                  {readinessChecks.has(check.id) && (
                    <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.readinessStatus, isReady ? styles.readinessStatusReady : styles.readinessStatusNotReady]}>
              {isReady ? `✓ ${t('cupFeeding.ready')}` : `${t('cupFeeding.notReady')} (${readinessChecks.size}/5 checks)`}
            </Text>
          </View>
        )}

        <View style={styles.cupRecCard}>
          <Text style={styles.cupRecTitle}>{t('cupFeeding.cupRecommendations')}</Text>
          <View style={styles.cupRecItem}>
            <Text style={styles.cupRecIcon}>🍼</Text>
            <View>
              <Text style={styles.cupRecLabel}>{t('cupFeeding.softSpoutTrainerCup')}</Text>
              <Text style={styles.cupRecStage}>{t('cupFeeding.stage1')} · e.g., Munchkin 360 Trainer</Text>
            </View>
          </View>
          <View style={styles.cupRecItem}>
            <Text style={styles.cupRecIcon}>🥤</Text>
            <View>
              <Text style={styles.cupRecLabel}>{t('cupFeeding.strawCup')}</Text>
              <Text style={styles.cupRecStage}>{t('cupFeeding.stage2')} · e.g., Take & Toss, .zipZorb</Text>
            </View>
          </View>
          <View style={styles.cupRecItem}>
            <Text style={styles.cupRecIcon}>🥛</Text>
            <View>
              <Text style={styles.cupRecLabel}>{t('cupFeeding.openCup')}</Text>
              <Text style={styles.cupRecStage}>{t('cupFeeding.stage3')} · e.g., ezp-0, haakaa</Text>
            </View>
          </View>
        </View>

        {entries.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgSipSuccess}</Text>
              <Text style={styles.statLabel}>{t('cupFeeding.successRate')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{avgSpillLevel}</Text>
              <Text style={styles.statLabel}>{t('cupFeeding.spillFreq')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{entries.length}</Text>
              <Text style={styles.statLabel}>{t('cupFeeding.sessions')}</Text>
            </View>
          </View>
        )}

        <View style={styles.hydrationCard}>
          <Text style={styles.hydrationTitle}>{t('cupFeeding.hydrationTitle')}</Text>
          <Text style={styles.hydrationDesc}>{t('cupFeeding.hydrationDesc')}</Text>
          <View style={styles.hydrationBar}>
            <View style={[styles.hydrationSegment, { flex: 4, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.hydrationSegment, { flex: 3, backgroundColor: '#EC4899' }]} />
            <View style={[styles.hydrationSegment, { flex: 3, backgroundColor: CUP_BLUE }]} />
          </View>
          <View style={styles.hydrationLegend}>
            <View style={styles.hydrationLegendItem}>
              <View style={[styles.hydrationLegendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.hydrationLegendText}>{t('cupFeeding.bottle')} 40%</Text>
            </View>
            <View style={styles.hydrationLegendItem}>
              <View style={[styles.hydrationLegendDot, { backgroundColor: '#EC4899' }]} />
              <Text style={styles.hydrationLegendText}>{t('cupFeeding.breast')} 30%</Text>
            </View>
            <View style={styles.hydrationLegendItem}>
              <View style={[styles.hydrationLegendDot, { backgroundColor: CUP_BLUE }]} />
              <Text style={styles.hydrationLegendText}>{t('cupFeeding.cup')} 30%</Text>
            </View>
          </View>
        </View>

        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTitle}>{t('cupFeeding.milestones')}</Text>
          <View style={styles.milestoneItem}>
            <Text style={styles.milestoneIcon}>🏆</Text>
            <Text style={styles.milestoneText}>{t('cupFeeding.firstOpenCup')}</Text>
            {firstOpenCup ? (
              <Text style={styles.milestoneBadge}>✓ Achieved</Text>
            ) : (
              <Text style={styles.milestonePending}>{t('cupFeeding.pending')}</Text>
            )}
          </View>
          <View style={styles.milestoneItem}>
            <Text style={styles.milestoneIcon}>🥤</Text>
            <Text style={styles.milestoneText}>{t('cupFeeding.strawMastered')}</Text>
            {strawMastered ? (
              <Text style={styles.milestoneBadge}>✓ Achieved</Text>
            ) : (
              <Text style={styles.milestonePending}>{t('cupFeeding.pending')}</Text>
            )}
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MaterialCommunityIcons name="lightbulb" size={16} color="#F59E0B" />
            <Text style={styles.tipTitle}>{t('cupFeeding.tipTitle')}</Text>
          </View>
          <Text style={styles.tipText}>{t('cupFeeding.dentalTip')}</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <MaterialCommunityIcons name="food-apple" size={16} color="#F59E0B" />
            <Text style={styles.tipTitle}>{t('cupFeeding.gastrocolicTip')}</Text>
          </View>
          <Text style={styles.tipText}>{t('cupFeeding.correlationTip')}</Text>
        </View>

        <Link href="/oral-motor" style={styles.navLink} asChild>
          <TouchableOpacity accessibilityLabel="Go to oral motor assessment" accessibilityRole="link">
            <MaterialCommunityIcons name="brain" size={18} color={CUP_BLUE} />
            <Text style={styles.navLinkText}>{t('cupFeeding.oralMotorAssessmentLink')}</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/tracking" style={styles.navLink} asChild>
          <TouchableOpacity accessibilityLabel="Go to feeding tracking" accessibilityRole="link">
            <MaterialCommunityIcons name="chart-line" size={18} color={CUP_BLUE} />
            <Text style={styles.navLinkText}>{t('cupFeeding.feedingTrackingLink')}</Text>
          </TouchableOpacity>
        </Link>

        {!showLogForm ? (
          <TouchableOpacity
            style={styles.logBtn}
            activeOpacity={0.7}
            onPress={() => setShowLogForm(true)}
            accessibilityLabel={t('cupFeeding.addPractice')}
            accessibilityRole="button"
          >
            <Text style={styles.logBtnText}>+ {t('cupFeeding.addPractice')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('cupFeeding.addPractice')}</Text>

            <Text style={styles.sectionTitle}>{t('cupFeeding.cupType')}</Text>
            <View style={styles.cupTypeGrid}>
              {CUP_TYPES.map((cup) => (
                <TouchableOpacity
                  key={cup.id}
                  style={[styles.cupTypeChip, selectedCupType === cup.id && styles.cupTypeChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCupType(cup.id)}
                  accessibilityLabel={`Select ${cup.label} cup type`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedCupType === cup.id }}
                >
                  <Text style={[styles.cupTypeChipText, selectedCupType === cup.id && styles.cupTypeChipTextSelected]}>
                    {cup.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('cupFeeding.duration')}</Text>
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>{t('cupFeeding.duration')}</Text>
              <TouchableOpacity
                accessibilityLabel="Enter practice duration in minutes"
                style={[styles.durationInput, { alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        t('cupFeeding.duration') || 'Duration',
                        t('cupFeeding.duration') || 'Enter in minutes',
                        [
                          { text: t('cupFeeding.cancel') || 'Cancel', style: 'cancel' },
                          { text: t('cupFeeding.save') || 'Save', onPress: (_v?: string) => setDuration(_v || '') },
                        ],
                        'plain-text',
                        duration,
                        'number-pad'
                      )
                    : Alert.alert(
                        t('cupFeeding.duration') || 'Duration',
                        t('cupFeeding.duration') || 'Enter in minutes',
                        [
                          { text: t('cupFeeding.cancel') || 'Cancel', style: 'cancel' },
                          { text: t('cupFeeding.save') || 'Save', onPress: (_v?: string) => setDuration(_v || '') },
                        ]
                      );
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: duration ? C.text : C.muted }}>
                  {duration ? `${duration}m` : 'Tap to enter...'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('cupFeeding.sipSuccess')}</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{t('cupFeeding.sipSuccess')}</Text>
              <Text style={styles.sliderValue}>{sipSuccess}</Text>
              <View style={styles.sliderButtons}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.sliderBtn, sipSuccess === val && { backgroundColor: CUP_BLUE }]}
                    onPress={() => setSipSuccess(val)}
                    accessibilityLabel={`Set sip success to ${val}`}
                  >
                    <Text style={[styles.sliderBtnText, sipSuccess === val && { color: '#fff' }]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t('cupFeeding.spillLevel')}</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>{t('cupFeeding.spillLevel')}</Text>
              <Text style={styles.sliderValue}>{spillLevel}</Text>
              <View style={styles.sliderButtons}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.sliderBtn, spillLevel === val && { backgroundColor: CUP_AMBER }]}
                    onPress={() => setSpillLevel(val)}
                    accessibilityLabel={`Set spill level to ${val}`}
                  >
                    <Text style={[styles.sliderBtnText, spillLevel === val && { color: '#fff' }]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.formNoteLabel}>{t('cupFeeding.notes')}</Text>
            <TouchableOpacity
              accessibilityLabel="Add optional notes about practice session"
              style={styles.noteInput}
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt(
                      t('cupFeeding.notes') || 'Notes',
                      '',
                      [
                        { text: t('cupFeeding.cancel') || 'Cancel', style: 'cancel' },
                        { text: t('cupFeeding.save') || 'Save', onPress: (_v?: string) => setNotes(_v || '') },
                      ],
                      'plain-text',
                      notes
                    )
                  : null;
              }}
            >
              <Text style={{ fontSize: 14, color: notes ? C.text : C.muted }}>
                {notes || 'Tap to add notes...'}
              </Text>
            </TouchableOpacity>

            <View style={styles.formButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowLogForm(false);
                  setDuration('');
                  setSelectedCupType('');
                  setSipSuccess(3);
                  setSpillLevel(3);
                  setNotes('');
                }}
                accessibilityLabel="Cancel and close form"
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>{t('cupFeeding.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={logPractice} accessibilityLabel="Save practice session" accessibilityRole="button">
                <Text style={styles.saveBtnText}>{t('cupFeeding.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {entries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t('cupFeeding.history')} ({entries.length})
            </Text>
            <View style={styles.historyCard}>
              {entries.slice(0, 50).map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <MaterialCommunityIcons name="cup" size={20} color={CUP_BLUE} style={styles.entryIcon} />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryCupType}>{getCupTypeLabel(entry.cupType)}</Text>
                    {entry.notes && <Text style={styles.entryNote}>{entry.notes}</Text>}
                    <View style={styles.entryMeta}>
                      <View style={styles.entryBadge}>
                        <Text style={styles.entryBadgeText}>{entry.babyAgeMonths > 0 ? `${Math.round(entry.babyAgeMonths)}mo` : ''}</Text>
                      </View>
                      <Text style={styles.entryTime}>
                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: CUP_GREEN }}>{entry.durationMinutes}m</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {entries.length === 0 && (
          <Text style={styles.emptyText}>{t('cupFeeding.noData')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}