import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const LANDAU_KEY = STORAGE_KEYS.LANDAU_EVENTS;
const CORRELATIONS_KEY = STORAGE_KEYS.LANDAU_CORRELATIONS;
const TUMMY_TIME_KEY = STORAGE_KEYS.TUMMY_TIME_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

interface LandauEvent {
  id: string;
  date: string;
  durationSec: number;
  qualityScore: number;
  headLiftCm: number;
  notes?: string;
  timestamp: string;
  babyAgeMonths: number;
}

interface LandauCorrelation {
  id: string;
  date: string;
  tummyTimeDuration: number;
  rollingMilestone: 'prone_to_supine' | 'supine_to_prone' | 'both' | 'none';
  landauQuality: number;
  timestamp: string;
}

interface TummyTimeEntry {
  id: string;
  durationSeconds: number;
  date: string;
  timestamp: string;
}

const LANDAU_BLUE = '#3B82F6';
const LANDAU_GREEN = '#10B981';
const LANDAU_AMBER = '#F59E0B';
const LANDAU_RED = '#EF4444';
const LANDAU_PURPLE = '#8B5CF6';

const ROLLING_MILESTONES = [
  { id: 'none', labelKey: 'landau.rollingNone' },
  { id: 'prone_to_supine', labelKey: 'landau.proneToSupine' },
  { id: 'supine_to_prone', labelKey: 'landau.supineToProne' },
  { id: 'both', labelKey: 'landau.rollingBoth' },
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

function getQualityColor(score: number): string {
  if (score <= 2) return LANDAU_GREEN;
  if (score <= 3) return LANDAU_AMBER;
  return LANDAU_RED;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function getRollingLabel(milestone: LandauCorrelation['rollingMilestone'], t: (key: string) => string): string {
  const found = ROLLING_MILESTONES.find(r => r.id === milestone);
  return found ? t(found.labelKey) : milestone;
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
  const [showCorrelationForm, setShowCorrelationForm] = useState(false);
  const [correlationRolling, setCorrelationRolling] = useState<LandauCorrelation['rollingMilestone']>('none');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rawEvents, rawCorrelations, rawTummy, profileRaw] = await Promise.all([
        safeGetItem(LANDAU_KEY),
        safeGetItem(CORRELATIONS_KEY),
        safeGetItem(TUMMY_TIME_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (rawEvents) setEvents(JSON.parse(rawEvents));
      if (rawCorrelations) setCorrelations(JSON.parse(rawCorrelations));
      if (rawTummy) setTummyTimeEntries(JSON.parse(rawTummy));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch {}
  };

  const saveEvent = async () => {
    const duration = parseInt(durationSec, 10);
    const headLift = parseFloat(headLiftCm);

    if (!duration || duration <= 0) {
      Alert.alert(t('common.error') || 'Error', t('landau.durationRequired') || 'Duration is required');
      return;
    }

    const entry: LandauEvent = {
      id: Date.now().toString(),
      date: getDateStr(),
      durationSec: duration,
      qualityScore,
      headLiftCm: headLift || 0,
      notes: notes.trim() || undefined,
      timestamp: new Date().toISOString(),
      babyAgeMonths,
    };

    const updated = [entry, ...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(updated);
    setShowForm(false);
    resetForm();

    try {
      await safeSetItem(LANDAU_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveCorrelation = async () => {
    const latestTummy = tummyTimeEntries[0];
    const tummyDuration = latestTummy ? latestTummy.durationSeconds : 0;

    const entry: LandauCorrelation = {
      id: Date.now().toString(),
      date: getDateStr(),
      tummyTimeDuration: tummyDuration,
      rollingMilestone: correlationRolling,
      landauQuality: qualityScore,
      timestamp: new Date().toISOString(),
    };

    const updated = [entry, ...correlations].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setCorrelations(updated);
    setShowCorrelationForm(false);

    try {
      await safeSetItem(CORRELATIONS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const resetForm = () => {
    setDurationSec('');
    setQualityScore(3);
    setHeadLiftCm('');
    setNotes('');
  };

  const latestEvent = events[0];
  const isIntegrating = babyAgeMonths >= 3 && babyAgeMonths <= 4;
  const isAlert = babyAgeMonths > 5 && latestEvent && latestEvent.qualityScore >= 4;

  const totalTummyTimeSeconds = tummyTimeEntries.reduce((sum, e) => sum + e.durationSeconds, 0);
  const avgTummyTimeMinutes = tummyTimeEntries.length > 0
    ? Math.round(totalTummyTimeSeconds / tummyTimeEntries.length / 60)
    : 0;

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
      borderColor: LANDAU_RED,
      borderLeftWidth: 4,
    },
    alertTitle: { fontSize: 14, fontWeight: '700', color: LANDAU_RED, marginBottom: 4 },
    alertText: { fontSize: 13, color: '#7F1D1D', lineHeight: 18 },
    infoCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: LANDAU_BLUE },
    infoTitle: { fontSize: 13, fontWeight: '700', color: LANDAU_BLUE, marginBottom: 6 },
    infoText: { fontSize: 13, color: '#1E40AF', lineHeight: 18 },
    progressCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    progressIcon: { fontSize: 32, marginRight: 12 },
    progressTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    progressSubtitle: { fontSize: 13, color: C.muted },
    statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    integratingBadge: { backgroundColor: LANDAU_AMBER },
    alertBadge: { backgroundColor: LANDAU_RED },
    integratedBadge: { backgroundColor: LANDAU_GREEN },
    eventCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
    },
    eventCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    eventIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    eventInfo: { flex: 1 },
    eventName: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    eventMeta: { fontSize: 12, color: C.muted },
    qualityIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
    formCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: LANDAU_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 14 },
    formRow: { marginBottom: 14 },
    formLabel: { fontSize: 12, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    formInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      fontSize: 14,
      color: C.text,
    },
    scoreRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    scoreOption: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    scoreOptionSelected: { borderColor: LANDAU_BLUE, backgroundColor: LANDAU_BLUE },
    scoreOptionText: { fontSize: 13, fontWeight: '600', color: C.muted },
    scoreOptionTextSelected: { color: '#fff' },
    rollingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    rollingOption: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    rollingOptionSelected: { borderColor: LANDAU_PURPLE, backgroundColor: LANDAU_PURPLE },
    rollingOptionText: { fontSize: 12, fontWeight: '600', color: C.muted },
    rollingOptionTextSelected: { color: '#fff' },
    formBtnRow: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: LANDAU_BLUE, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    addBtn: {
      backgroundColor: LANDAU_BLUE,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    historySection: {
      backgroundColor: C.background,
      borderTopWidth: 1,
      borderTopColor: C.border,
      padding: 12,
    },
    historyTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    historyEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    historyText: { fontSize: 13, color: C.text, flex: 1 },
    historyDate: { fontSize: 11, color: C.muted },
    emptyState: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6 },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
    correlationCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: LANDAU_PURPLE,
    },
    correlationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    correlationIcon: { fontSize: 20, marginRight: 8, color: LANDAU_PURPLE },
    correlationTitle: { fontSize: 14, fontWeight: '700', color: C.text },
    correlationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    correlationLabel: { fontSize: 12, color: C.muted },
    correlationValue: { fontSize: 12, fontWeight: '600', color: C.text },
    trunkCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: LANDAU_GREEN,
    },
    trunkTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 },
    trunkStat: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('landau.greeting') || 'Neurological Development'}</Text>
          <Text style={styles.title}>🦴 {t('landau.title') || 'Landau Reflex'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('landau.monitorLandau')}`
              : t('landau.subtitle')}
          </Text>
        </View>

        {isAlert && (
          <View style={styles.alertBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
              <MaterialCommunityIcons name="alert" size={16} color={LANDAU_RED} />
              <Text style={styles.alertTitle}>{t('landau.alertTitle') || 'Reflex Persistence Alert'}</Text>
            </View>
            <Text style={styles.alertText}>
              {t('landau.alertBody') || 'Landau reflex still strong beyond 5 months. Consult your pediatrician.'}
            </Text>
          </View>
        )}

        {events.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🦴</Text>
            <Text style={styles.emptyTitle}>{t('landau.emptyTitle') || 'Track Prone Extension'}</Text>
            <Text style={styles.emptyText}>
              {t('landau.emptyBody') || 'Record prone extension events to monitor Landau reflex integration progress.'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('landau.aboutTitle') || 'About the Landau Reflex'}</Text>
          <Text style={styles.infoText}>
            {t('landau.aboutText') || 'The Landau reflex emerges around 3-4 months when baby lifts head and chest while prone, then integrates by 4-6 months as voluntary movement develops.'}
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressIcon}>📈</Text>
            <View>
              <Text style={styles.progressTitle}>{t('landau.integrationProgress') || 'Integration Progress'}</Text>
              <Text style={styles.progressSubtitle}>
                {t('landau.expectedWindow') || 'Expected: 3-4 months'}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              isAlert ? styles.alertBadge : isIntegrating ? styles.integratingBadge : styles.integratedBadge
            ]}>
              <Text style={styles.statusBadgeText}>
                {isAlert
                  ? t('landau.statusAlert')
                  : babyAgeMonths > 4
                  ? t('landau.statusIntegrated')
                  : t('landau.statusIntegrating')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.trunkCard}>
          <Text style={styles.trunkTitle}>{t('landau.trunkStrength') || 'Trunk Strength Correlation'}</Text>
          <View style={styles.trunkStat}>
            <Text style={styles.correlationLabel}>{t('landau.avgTummyTime') || 'Avg Tummy Time'}</Text>
            <Text style={styles.correlationValue}>{avgTummyTimeMinutes}m</Text>
          </View>
          <View style={styles.trunkStat}>
            <Text style={styles.correlationLabel}>{t('landau.totalEntries') || 'Tummy Time Entries'}</Text>
            <Text style={styles.correlationValue}>{tummyTimeEntries.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('landau.rollingBridge') || 'Rolling Milestone Bridge'}</Text>
        {correlations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔄</Text>
            <Text style={styles.emptyTitle}>{t('landau.noCorrelations') || 'No rolling data yet'}</Text>
            <Text style={styles.emptyText}>{t('landau.addCorrelation') || 'Log prone extension with rolling milestones'}</Text>
          </View>
        ) : (
          correlations.slice(0, 5).map((corr) => (
            <View key={corr.id} style={styles.correlationCard}>
              <View style={styles.correlationHeader}>
                <MaterialCommunityIcons name="rotate-3d-variant" size={20} color={LANDAU_PURPLE} style={styles.correlationIcon} />
                <Text style={styles.correlationTitle}>{getRollingLabel(corr.rollingMilestone, t)}</Text>
              </View>
              <View style={styles.correlationRow}>
                <Text style={styles.correlationLabel}>{t('landau.date') || 'Date'}</Text>
                <Text style={styles.correlationValue}>{corr.date}</Text>
              </View>
              <View style={styles.correlationRow}>
                <Text style={styles.correlationLabel}>{t('landau.tummyDuration') || 'Tummy Duration'}</Text>
                <Text style={styles.correlationValue}>{formatDuration(corr.tummyTimeDuration)}</Text>
              </View>
              <View style={styles.correlationRow}>
                <Text style={styles.correlationLabel}>{t('landau.landauQuality') || 'Landau Quality'}</Text>
                <Text style={styles.correlationValue}>{corr.landauQuality}/5</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>{t('landau.timeline') || 'Prone Extension Timeline'}</Text>

        {!showForm && !showCorrelationForm && (
          <View style={{ gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.7}
              onPress={() => setShowForm(true)}
              accessibilityLabel="Add Landau event"
            >
              <Text style={styles.addBtnText}>+ {t('landau.logEvent') || 'Log Prone Extension'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: LANDAU_PURPLE }]}
              activeOpacity={0.7}
              onPress={() => setShowCorrelationForm(true)}
              accessibilityLabel="Add rolling correlation"
            >
              <Text style={styles.addBtnText}>+ {t('landau.logRolling') || 'Log Rolling Milestone'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('landau.logEvent') || 'Log Prone Extension'}</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('landau.duration') || 'Duration (seconds)'}</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        t('landau.enterDuration') || 'Enter duration',
                        t('landau.durationHint') || 'Seconds',
                        [
                          { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => setShowForm(false) },
                          { text: t('common.save') || 'Save', onPress: (v?: string) => setDurationSec(v || '') },
                        ],
                        'plain-text',
                        durationSec
                      )
                    : null;
                }}
              >
                <Text style={{ color: durationSec ? C.text : C.muted }}>
                  {durationSec || t('landau.durationPlaceholder') || 'Tap to enter...'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>{t('landau.qualityScore') || 'Quality Score (1-5)'}</Text>
            <View style={styles.scoreRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <TouchableOpacity
                  key={score}
                  style={[styles.scoreOption, qualityScore === score && styles.scoreOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setQualityScore(score)}
                  accessibilityLabel={`Quality score ${score}`}
                >
                  <Text style={[styles.scoreOptionText, qualityScore === score && styles.scoreOptionTextSelected]}>
                    {score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('landau.headLift') || 'Head Lift (cm)'}</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        t('landau.enterHeadLift') || 'Enter head lift',
                        t('landau.headLiftHint') || 'Centimeters',
                        [
                          { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => setShowForm(false) },
                          { text: t('common.save') || 'Save', onPress: (v?: string) => setHeadLiftCm(v || '') },
                        ],
                        'plain-text',
                        headLiftCm
                      )
                    : null;
                }}
              >
                <Text style={{ color: headLiftCm ? C.text : C.muted }}>
                  {headLiftCm || t('landau.headLiftPlaceholder') || 'Tap to enter...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{t('landau.notes') || 'Notes'}</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        t('landau.addNotes') || 'Add notes',
                        '',
                        [
                          { text: t('common.cancel') || 'Cancel', style: 'cancel', onPress: () => setShowForm(false) },
                          { text: t('common.save') || 'Save', onPress: (v?: string) => setNotes(v || '') },
                        ],
                        'plain-text',
                        notes
                      )
                    : null;
                }}
              >
                <Text style={{ color: notes ? C.text : C.muted }}>
                  {notes || t('landau.notesPlaceholder') || 'Tap to add notes...'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEvent}>
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showCorrelationForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('landau.logRolling') || 'Log Rolling Milestone'}</Text>

            <Text style={styles.formLabel}>{t('landau.rollingMilestone') || 'Rolling Milestone'}</Text>
            <View style={styles.rollingRow}>
              {ROLLING_MILESTONES.map((milestone) => (
                <TouchableOpacity
                  key={milestone.id}
                  style={[styles.rollingOption, correlationRolling === milestone.id && styles.rollingOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setCorrelationRolling(milestone.id as LandauCorrelation['rollingMilestone'])}
                  accessibilityLabel={t(milestone.labelKey)}
                >
                  <Text style={[styles.rollingOptionText, correlationRolling === milestone.id && styles.rollingOptionTextSelected]}>
                    {t(milestone.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCorrelationForm(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: LANDAU_PURPLE }]} onPress={saveCorrelation}>
                <Text style={styles.saveBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {events.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventCardHeader}>
              <View style={styles.eventIcon}>
                <MaterialCommunityIcons name="human-handsup" size={22} color={LANDAU_BLUE} />
              </View>
              <View style={styles.eventInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <View style={[styles.qualityIndicator, { backgroundColor: getQualityColor(event.qualityScore) }]} />
                  <Text style={styles.eventName}>{t('landau.proneExtension') || 'Prone Extension'}</Text>
                </View>
                <Text style={styles.eventMeta}>
                  {formatDuration(event.durationSec)} · {event.headLiftCm}cm · {event.qualityScore}/5
                </Text>
              </View>
              <Text style={styles.eventMeta}>
                {new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Math.round(event.babyAgeMonths)}mo
              </Text>
            </View>
            {event.notes && (
              <View style={styles.historySection}>
                <Text style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{event.notes}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
