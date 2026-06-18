import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const LANDAU_KEY = '@jobble/landau_events';
const CORRELATION_KEY = '@jobble/landau_correlations';
const TUMMY_TIME_KEY = STORAGE_KEYS.TUMMY_TIME_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

const Landau_BLUE = '#3B82F6';
const Landau_GREEN = '#10B981';
const Landau_AMBER = '#F59E0B';
const Landau_RED = '#EF4444';

type RollingMilestone = 'prone_to_supine' | 'supine_to_prone' | 'both_directions' | 'none';

interface LandauEvent {
  id: string;
  date: string;
  duration_sec: number;
  quality_score: number;
  head_lift_cm: number;
  notes?: string;
  timestamp: string;
  babyAgeMonths: number;
}

interface LandauCorrelation {
  id: string;
  date: string;
  tummy_time_duration: number;
  rolling_milestone: RollingMilestone;
  landau_quality: number;
  timestamp: string;
}

interface TummyTimeEntry {
  id: string;
  durationSeconds: number;
  date: string;
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

function getRollingMilestoneFromQuality(quality: number, ageMonths: number): RollingMilestone {
  if (quality >= 4 && ageMonths >= 4 && ageMonths <= 6) return 'prone_to_supine';
  if (quality >= 4 && ageMonths >= 5 && ageMonths <= 7) return 'supine_to_prone';
  if (quality >= 5 && ageMonths >= 6) return 'both_directions';
  return 'none';
}

function getMilestoneLabel(key: RollingMilestone, t: (k: string) => string): string {
  switch (key) {
    case 'prone_to_supine': return t('landau.proneToSupine');
    case 'supine_to_prone': return t('landau.supineToProne');
    case 'both_directions': return t('landau.bothDirections');
    default: return t('landau.noMilestone');
  }
}

function getMilestoneColor(milestone: RollingMilestone): string {
  switch (milestone) {
    case 'prone_to_supine': return Landau_BLUE;
    case 'supine_to_prone': return Landau_GREEN;
    case 'both_directions': return Landau_AMBER;
    default: return '#8b9bb4';
  }
}

function getQualityLabel(score: number, t: (k: string) => string): string {
  if (score >= 5) return t('landau.qualityExcellent');
  if (score >= 4) return t('landau.qualityGood');
  if (score >= 3) return t('landau.qualityModerate');
  if (score >= 2) return t('landau.qualityWeak');
  return t('landau.qualityVeryWeak');
}

function getQualityColor(score: number): string {
  if (score >= 5) return Landau_RED;
  if (score >= 4) return Landau_AMBER;
  if (score >= 3) return Landau_GREEN;
  return Landau_BLUE;
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export default function LandauReflexScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [events, setEvents] = useState<LandauEvent[]>([]);
  const [correlations, setCorrelations] = useState<LandauCorrelation[]>([]);
  const [tummyTimeEntries, setTummyTimeEntries] = useState<TummyTimeEntry[]>([]);
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [durationSec, setDurationSec] = useState('');
  const [qualityScore, setQualityScore] = useState(3);
  const [headLiftCm, setHeadLiftCm] = useState('');
  const [notes, setNotes] = useState('');
  const [newBadge, setNewBadge] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, corrRaw, tummyRaw, profileRaw] = await Promise.all([
        safeGetItem(LANDAU_KEY),
        safeGetItem(CORRELATION_KEY),
        safeGetItem(TUMMY_TIME_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (raw) setEvents(JSON.parse(raw));
      if (corrRaw) setCorrelations(JSON.parse(corrRaw));
      if (tummyRaw) setTummyTimeEntries(JSON.parse(tummyRaw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const latestEvent = events.length > 0 ? events[0] : null;
  const latestQuality = latestEvent?.quality_score ?? 0;
  const isAlert = babyAgeMonths > 5 && latestQuality >= 4;

  const currentMilestone = latestEvent
    ? getRollingMilestoneFromQuality(latestQuality, babyAgeMonths)
    : 'none';

  const avgTummyTimePerDay = (() => {
    if (tummyTimeEntries.length === 0) return 0;
    const uniqueDays = new Set(tummyTimeEntries.map((e) => e.date));
    const totalSec = tummyTimeEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
    return totalSec / Math.max(uniqueDays.size, 1);
  })();

  const openForm = () => {
    setDurationSec('');
    setQualityScore(3);
    setHeadLiftCm('');
    setNotes('');
    setShowForm(true);
  };

  const saveEntry = async () => {
    const dur = parseInt(durationSec || '0', 10);
    const hl = parseFloat(headLiftCm || '0');
    if (dur <= 0) return;

    const entry: LandauEvent = {
      id: Date.now().toString(),
      date: getDateStr(),
      duration_sec: dur,
      quality_score: qualityScore,
      head_lift_cm: hl || 0,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
      babyAgeMonths,
    };

    const milestone = getRollingMilestoneFromQuality(qualityScore, babyAgeMonths);

    const correlationEntry: LandauCorrelation = {
      id: Date.now().toString(),
      date: getDateStr(),
      tummy_time_duration: Math.round(avgTummyTimePerDay),
      rolling_milestone: milestone,
      landau_quality: qualityScore,
      timestamp: new Date().toISOString(),
    };

    const updatedEvents = [entry, ...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const updatedCorrelations = [correlationEntry, ...correlations].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setEvents(updatedEvents);
    setCorrelations(updatedCorrelations);
    setShowForm(false);

    try {
      await Promise.all([
        safeSetItem(LANDAU_KEY, JSON.stringify(updatedEvents)),
        safeSetItem(CORRELATION_KEY, JSON.stringify(updatedCorrelations)),
      ]);
      if (updatedEvents.length >= 3 && !newBadge) {
        await awardBadge('landau_tracker');
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 4000);
      }
    } catch {}
  };

  const qualityOptions = [1, 2, 3, 4, 5];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    alertBanner: {
      backgroundColor: '#FEE2E2',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: Landau_RED,
      borderLeftWidth: 4,
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: Landau_RED, marginBottom: 4 },
    alertText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
    integrationCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    integrationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    integrationIcon: { fontSize: 28, marginRight: 12 },
    integrationTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    integrationSubtitle: { fontSize: 13, color: C.muted },
    integrationBar: { backgroundColor: C.border, borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 6 },
    integrationFill: { borderRadius: 8, height: 12 },
    integrationPct: { fontSize: 12, color: C.muted, textAlign: 'right' },
    milestoneCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    milestoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    milestoneIcon: { fontSize: 24, marginRight: 10 },
    milestoneName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
    milestoneAge: { fontSize: 12, color: Landau_AMBER, fontWeight: '600' },
    milestoneDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
    milestoneTag: { backgroundColor: Landau_BLUE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
    milestoneTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    bridgeCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    bridgeTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    bridgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    bridgeStep: { flex: 1, backgroundColor: C.background, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    bridgeStepActive: { borderColor: Landau_GREEN, backgroundColor: '#ECFDF5' },
    bridgeStepText: { fontSize: 12, fontWeight: '600', color: C.muted },
    bridgeStepTextActive: { color: Landau_GREEN },
    bridgeArrow: { fontSize: 16, color: C.muted },
    historyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    entryIcon: { fontSize: 22, marginRight: 10 },
    entryInfo: { flex: 1 },
    entryType: { fontSize: 14, fontWeight: '600', color: C.text },
    entryNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryDuration: { fontSize: 14, fontWeight: '700', color: Landau_BLUE },
    entryTime: { fontSize: 12, color: C.muted },
    formCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: Landau_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    formLabel: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6 },
    formInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      color: C.text,
      marginBottom: 12,
    },
    qualityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    qualityOption: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    qualityOptionSelected: { borderColor: Landau_BLUE, backgroundColor: Landau_BLUE },
    qualityOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    qualityOptionTextSelected: { color: '#fff' },
    formBtnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: Landau_BLUE, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    emptyState: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
    badgeBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Landau_AMBER, gap: 8 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Landau_BLUE },
    infoTitle: { fontSize: 13, fontWeight: '700', color: Landau_BLUE, marginBottom: 6 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
    correlationCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    correlationTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 8 },
    correlationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    correlationLabel: { fontSize: 13, color: C.muted },
    correlationValue: { fontSize: 13, fontWeight: '600', color: C.text },
  });

  const integrationPct = Math.min(Math.max(((babyAgeMonths - 3) / (4 - 3)) * 100, 0), 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('landau.greeting') || 'Primitive Reflex'}</Text>
          <Text style={styles.title}>{t('landau.title') || 'Landau Reflex'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} ${t('landau.monthsOld') || 'months old'} · ${t('landau.subtitle')}`
              : t('landau.subtitle')}
          </Text>
        </View>

        {newBadge && (
          <View style={styles.badgeBanner}>
            <MaterialCommunityIcons name="trophy" size={20} color="#92400E" />
            <Text style={styles.badgeBannerText}>{t('landau.badgeEarned') || 'Badge earned!'}</Text>
          </View>
        )}

        {isAlert && (
          <View style={styles.alertBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <MaterialCommunityIcons name="alert" size={16} color={Landau_RED} />
              <Text style={styles.alertTitle}>{t('landau.alertTitle') || 'Reflex Persistence Alert'}</Text>
            </View>
            <Text style={styles.alertText}>
              {t('landau.alertBody') || 'Landau reflex still strong beyond expected integration window. Consult your pediatrician.'}
            </Text>
          </View>
        )}

        {events.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="human-handsup" size={48} color={C.muted} />
            <Text style={styles.emptyTitle}>{t('landau.emptyTitle') || 'Track Landau Reflex'}</Text>
            <Text style={styles.emptyText}>
              {t('landau.emptyBody') || 'Log prone extension events to monitor trunk strength development and rolling milestones.'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('landau.aboutTitle') || 'About the Landau Reflex'}</Text>
          <Text style={styles.infoText}>
            {t('landau.aboutText') || 'The Landau reflex is the extension of the spine and head when the infant is held in prone position, indicating trunk muscle development. Typically emerges 3-4 months and integrates by 6-12 months.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('landau.integrationProgress') || 'Integration Progress'}</Text>
        <View style={styles.integrationCard}>
          <View style={styles.integrationHeader}>
            <MaterialCommunityIcons name="chart-line" size={28} color={Landau_BLUE} style={styles.integrationIcon} />
            <View>
              <Text style={styles.integrationTitle}>{t('landau.expectedIntegration') || 'Expected Integration'}</Text>
              <Text style={styles.integrationSubtitle}>3-4 {t('landau.months') || 'months'}</Text>
            </View>
          </View>
          <View style={styles.integrationBar}>
            <View
              style={[
                styles.integrationFill,
                { width: `${integrationPct}%`, backgroundColor: babyAgeMonths > 5 && latestQuality >= 4 ? Landau_RED : Landau_GREEN },
              ]}
            />
          </View>
          <Text style={styles.integrationPct}>
            {Math.round(integrationPct)}% {t('landau.integrated') || 'integrated'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t('landau.rollingBridge') || 'Rolling Bridge'}</Text>
        <View style={styles.bridgeCard}>
          <Text style={styles.bridgeTitle}>{t('landau.proneExtensionBridge') || 'Prone Extension Rolling Milestones'}</Text>
          <View style={styles.bridgeRow}>
            <View style={[styles.bridgeStep, currentMilestone === 'prone_to_supine' || currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? styles.bridgeStepActive : {}]}>
              <MaterialCommunityIcons name="arrow-down-bold" size={20} color={currentMilestone === 'prone_to_supine' || currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? Landau_GREEN : C.muted} />
              <Text style={[styles.bridgeStepText, currentMilestone === 'prone_to_supine' || currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? styles.bridgeStepTextActive : {}]}>
                {t('landau.proneToSupine') || 'Prone to Supine'}
              </Text>
              <Text style={{ fontSize: 10, color: C.muted }}>4-6 {t('landau.mo') || 'mo'}</Text>
            </View>
            <Text style={styles.bridgeArrow}>→</Text>
            <View style={[styles.bridgeStep, currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? styles.bridgeStepActive : {}]}>
              <MaterialCommunityIcons name="arrow-up-bold" size={20} color={currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? Landau_GREEN : C.muted} />
              <Text style={[styles.bridgeStepText, currentMilestone === 'supine_to_prone' || currentMilestone === 'both_directions' ? styles.bridgeStepTextActive : {}]}>
                {t('landau.supineToProne') || 'Supine to Prone'}
              </Text>
              <Text style={{ fontSize: 10, color: C.muted }}>5-7 {t('landau.mo') || 'mo'}</Text>
            </View>
            <Text style={styles.bridgeArrow}>→</Text>
            <View style={[styles.bridgeStep, currentMilestone === 'both_directions' ? styles.bridgeStepActive : {}]}>
              <MaterialCommunityIcons name="swap-horizontal-bold" size={20} color={currentMilestone === 'both_directions' ? Landau_GREEN : C.muted} />
              <Text style={[styles.bridgeStepText, currentMilestone === 'both_directions' ? styles.bridgeStepTextActive : {}]}>
                {t('landau.bothDirections') || 'Both'}
              </Text>
              <Text style={{ fontSize: 10, color: C.muted }}>6-8 {t('landau.mo') || 'mo'}</Text>
            </View>
          </View>
          {latestEvent && (
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getQualityColor(latestQuality) }} />
              <Text style={{ fontSize: 12, color: C.muted }}>
                {t('landau.latestQuality') || 'Latest quality'}: {getQualityLabel(latestQuality, t)} ({latestQuality}/5)
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('landau.trunkStrength') || 'Trunk Strength Correlation'}</Text>
        <View style={styles.correlationCard}>
          <Text style={styles.correlationTitle}>{t('landau.tummyTimeCorrelation') || 'Tummy Time Correlation'}</Text>
          <View style={styles.correlationRow}>
            <Text style={styles.correlationLabel}>{t('landau.avgDailyTummyTime') || 'Avg daily tummy time'}</Text>
            <Text style={styles.correlationValue}>{formatDuration(Math.round(avgTummyTimePerDay))}</Text>
          </View>
          <View style={styles.correlationRow}>
            <Text style={styles.correlationLabel}>{t('landau.landauQuality') || 'Landau quality'}</Text>
            <Text style={styles.correlationValue}>{latestEvent ? `${latestQuality}/5` : '-'}</Text>
          </View>
          <View style={styles.correlationRow}>
            <Text style={styles.correlationLabel}>{t('landau.rollingMilestone') || 'Rolling milestone'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getMilestoneColor(currentMilestone) }} />
              <Text style={[styles.correlationValue, { color: getMilestoneColor(currentMilestone) }]}>
                {getMilestoneLabel(currentMilestone, t)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('landau.timeline') || 'Landau Timeline'}</Text>
        <TouchableOpacity
          accessibilityLabel={t('landau.addEventA11y') || 'Add Landau event'}
          style={{ backgroundColor: Landau_BLUE, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 }}
          activeOpacity={0.7}
          onPress={openForm}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
            + {t('landau.logEvent') || 'Log Prone Extension Event'}
          </Text>
        </TouchableOpacity>

        {events.length === 0 ? (
          <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 16 }}>
            {t('landau.noEvents') || 'No events logged yet'}
          </Text>
        ) : (
          <View style={styles.historyCard}>
            {events.slice(0, 10).map((entry, i) => (
              <View key={entry.id} style={[styles.entryRow, i === Math.min(events.length, 10) - 1 && { borderBottomWidth: 0 }]}>
                <MaterialCommunityIcons name="human-handsup" size={22} color={getQualityColor(entry.quality_score)} style={styles.entryIcon} />
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>
                    {getQualityLabel(entry.quality_score, t)} · {formatDuration(entry.duration_sec)}
                    {entry.head_lift_cm > 0 ? ` · ${entry.head_lift_cm}cm` : ''}
                  </Text>
                  {entry.notes && <Text style={styles.entryNote}>{entry.notes}</Text>}
                </View>
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.round(entry.babyAgeMonths)}mo
                </Text>
              </View>
            ))}
          </View>
        )}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('landau.logEvent') || 'Log Prone Extension Event'}</Text>

            <Text style={styles.formLabel}>{t('landau.durationSec') || 'Duration (seconds)'}</Text>
            <TextInput
              style={styles.formInput}
              value={durationSec}
              onChangeText={setDurationSec}
              keyboardType="number-pad"
              placeholder={t('landau.durationPlaceholder') || 'e.g. 30'}
              placeholderTextColor={C.muted}
            />

            <Text style={styles.formLabel}>{t('landau.qualityScore') || 'Quality Score (1-5)'}</Text>
            <View style={styles.qualityRow}>
              {qualityOptions.map((opt) => (
                <TouchableOpacity
                  accessibilityLabel={`Quality score ${opt}`}
                  key={opt}
                  style={[styles.qualityOption, qualityScore === opt && styles.qualityOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setQualityScore(opt)}
                >
                  <Text style={[styles.qualityOptionText, qualityScore === opt && styles.qualityOptionTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('landau.headLiftCm') || 'Head Lift (cm, optional)'}</Text>
            <TextInput
              style={styles.formInput}
              value={headLiftCm}
              onChangeText={setHeadLiftCm}
              keyboardType="decimal-pad"
              placeholder={t('landau.headLiftPlaceholder') || 'e.g. 8'}
              placeholderTextColor={C.muted}
            />

            <Text style={styles.formLabel}>{t('landau.notes') || 'Notes (optional)'}</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 56 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder={t('landau.notesPlaceholder') || 'Any observations...'}
              placeholderTextColor={C.muted}
            />

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                accessibilityLabel={t('landau.cancelA11y') || 'Cancel'}
                style={styles.cancelBtn}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={t('landau.saveA11y') || 'Save Landau event'}
                style={styles.saveBtn}
                onPress={saveEntry}
              >
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}