import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const BOTTLE_REFUSAL_KEY = '@jobble/bottle_refusal_entries';
const PROFILE_KEY = '@jobble_baby_profile';

const SUSPECTED_CAUSES = [
  { id: 'flow_fast', labelKey: 'bottleRefusal.causeFlowFast', icon: 'water' },
  { id: 'flow_slow', labelKey: 'bottleRefusal.causeFlowSlow', icon: 'water-outline' },
  { id: 'temp_wrong', labelKey: 'bottleRefusal.causeTempWrong', icon: 'thermometer' },
  { id: 'position', labelKey: 'bottleRefusal.causePosition', icon: 'human-handsup' },
  { id: 'tongue_tie', labelKey: 'bottleRefusal.causeTongueTie', icon: 'medical-bag' },
  { id: 'oral_thrush', labelKey: 'bottleRefusal.causeOralThrush', icon: 'medical-outline' },
  { id: 'cold_symptoms', labelKey: 'bottleRefusal.causeColdSymptoms', icon: 'weather-snowy' },
  { id: 'distracted', labelKey: 'bottleRefusal.causeDistracted', icon: 'eye-off-outline' },
  { id: 'other', labelKey: 'bottleRefusal.causeOther', icon: 'help-circle-outline' },
] as const;

type CauseId = typeof SUSPECTED_CAUSES[number]['id'];

interface BottleRefusalEntry {
  id: string;
  cause: CauseId;
  durationMinutes: number;
  date: string;
  timestamp: string;
  babyAgeMonths: number;
  note?: string;
}

const BOTTLE_BLUE = '#3B82F6';
const BOTTLE_GREEN = '#10B981';
const BOTTLE_AMBER = '#F59E0B';
const BOTTLE_RED = '#EF4444';

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

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

function formatDurationRefusal(minutes: number): string {
  if (minutes < 1) return '<1m';
  return `${minutes}m`;
}

function getWeeksAgo(weekIndex: number): Date {
  const now = new Date();
  now.setDate(now.getDate() - weekIndex * 7);
  return now;
}

function getEntriesInWeek(entries: BottleRefusalEntry[], weekStart: string): BottleRefusalEntry[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  return entries.filter((e) => e.date >= weekStart && e.date < weekEndStr);
}

function computeCorrelation(entries: BottleRefusalEntry[]): { cause: string; count: number } | null {
  const causeCount: Record<string, number> = {};
  for (const entry of entries) {
    causeCount[entry.cause] = (causeCount[entry.cause] || 0) + 1;
  }
  const sorted = Object.entries(causeCount).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const [topCause, topCount] = sorted[0];
  if (topCount < 2) return null;
  return { cause: topCause, count: topCount };
}

function computeColdCorrelation(entries: BottleRefusalEntry[]): number {
  const coldEntries = entries.filter((e) => e.cause === 'cold_symptoms');
  if (coldEntries.length === 0) return 0;
  const lastColdDate = coldEntries[coldEntries.length - 1].date;
  const twoWeeksAgo = new Date(lastColdDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recentRefusals = entries.filter(
    (e) => e.date > twoWeeksAgo.toISOString().split('T')[0] && e.date <= lastColdDate
  ).length;
  return recentRefusals;
}

export default function BottleRefusalScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<BottleRefusalEntry[]>([]);
  const [selectedCauses, setSelectedCauses] = useState<Set<CauseId>>(new Set());
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [showLogForm, setShowLogForm] = useState(false);
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [newBadge, setNewBadge] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [raw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(BOTTLE_REFUSAL_KEY),
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

  const toggleCause = (causeId: CauseId) => {
    setSelectedCauses((prev) => {
      const next = new Set(prev);
      if (next.has(causeId)) next.delete(causeId);
      else next.add(causeId);
      return next;
    });
  };

  const logRefusal = async () => {
    if (selectedCauses.size === 0) {
      Alert.alert(t('bottleRefusal.selectCauseTitle') || 'Select a Cause', t('bottleRefusal.selectCauseBody') || 'Please select at least one suspected cause');
      return;
    }
    const durationNum = parseInt(duration || '0', 10);
    if (durationNum <= 0) {
      Alert.alert(t('bottleRefusal.enterDurationTitle') || 'Enter Duration', t('bottleRefusal.enterDurationBody') || 'Please enter how long baby refused');
      return;
    }

    const newEntries: BottleRefusalEntry[] = Array.from(selectedCauses).map((cause) => ({
      id: `${Date.now()}_${cause}`,
      cause,
      durationMinutes: durationNum,
      date: getDateStr(),
      timestamp: new Date().toISOString(),
      babyAgeMonths,
      note: note.trim() || undefined,
    }));

    const updated = [...newEntries, ...entries];
    setEntries(updated);
    setSelectedCauses(new Set());
    setDuration('');
    setNote('');
    setShowLogForm(false);

    try {
      await AsyncStorage.setItem(BOTTLE_REFUSAL_KEY, JSON.stringify(updated));
      if (updated.length >= 5 && !newBadge) {
        await awardBadge('bottle_refusal_tracked');
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 4000);
      }
    } catch {}
  };

  const undoEntry = async (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    try {
      await AsyncStorage.setItem(BOTTLE_REFUSAL_KEY, JSON.stringify(updated));
    } catch {}
  };

  const weekLabels: string[] = [];
  const weekCounts: number[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = getWeekStart(getWeeksAgo(i));
    const weekEntries = getEntriesInWeek(entries, weekStart);
    weekCounts.push(weekEntries.length);
    const d = new Date(weekStart);
    weekLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  const maxWeekCount = Math.max(...weekCounts, 1);
  const correlation = computeCorrelation(entries);
  const coldCorr = computeColdCorrelation(entries);

  const todayEntries = entries.filter((e) => e.date === getDateStr());
  const totalToday = todayEntries.length;

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
    summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    summaryIcon: { fontSize: 28, marginRight: 12 },
    summaryTextBlock: { flex: 1 },
    summaryTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    summarySubtitle: { fontSize: 13, color: C.muted },
    summaryBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
    causeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.card,
    },
    causeTagSelected: { backgroundColor: BOTTLE_BLUE, borderColor: BOTTLE_BLUE },
    causeTagText: { fontSize: 12, fontWeight: '600', color: C.muted },
    causeTagTextSelected: { color: '#fff' },
    logBtn: {
      backgroundColor: BOTTLE_BLUE,
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
      borderColor: BOTTLE_BLUE,
    },
    formTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    causeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    causeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.background,
    },
    causeChipSelected: { backgroundColor: BOTTLE_BLUE, borderColor: BOTTLE_BLUE },
    causeChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
    causeChipTextSelected: { color: '#fff' },
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
    cancelBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    saveBtn: { flex: 1, backgroundColor: BOTTLE_GREEN, borderRadius: 12, padding: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    chartCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    chartTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 16 },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, gap: 4 },
    chartBarWrap: { flex: 1, alignItems: 'center' },
    chartBar: { backgroundColor: BOTTLE_BLUE, borderRadius: 4, width: '100%', minHeight: 4 },
    chartBarLabel: { fontSize: 8, color: C.muted, marginTop: 4, textAlign: 'center' },
    chartBarCount: { fontSize: 10, fontWeight: '700', color: C.text, marginTop: 2, textAlign: 'center' },
    insightCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: BOTTLE_AMBER, borderLeftWidth: 4, borderLeftColor: BOTTLE_AMBER },
    insightTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
    insightText: { fontSize: 13, color: '#78350F', lineHeight: 18 },
    historyCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    entryIcon: { fontSize: 20, marginRight: 10, color: BOTTLE_RED },
    entryInfo: { flex: 1 },
    entryCause: { fontSize: 14, fontWeight: '600', color: C.text },
    entryNote: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryMeta: { flexDirection: 'row', gap: 8 },
    entryBadge: { backgroundColor: BOTTLE_BLUE, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
    entryBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    entryDuration: { fontSize: 14, fontWeight: '700', color: BOTTLE_RED },
    entryTime: { fontSize: 12, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    badgeBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: BOTTLE_AMBER, gap: 8 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
    formNoteLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
    formNotePlaceholder: { fontSize: 13, color: C.muted, marginBottom: 12 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('bottleRefusal.greeting') || 'Feeding Hurdles'}</Text>
          <Text style={styles.title}>🍼 {t('bottleRefusal.title') || 'Bottle Refusal'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('bottleRefusal.trackRefusals')}`
              : t('bottleRefusal.subtitle')}
          </Text>
        </View>

        {newBadge && (
          <View style={styles.badgeBanner}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={styles.badgeBannerText}>{t('bottleRefusal.badgeEarned') || 'Badge earned!'}</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>📋</Text>
            <View style={styles.summaryTextBlock}>
              <Text style={styles.summaryTitle}>{t('bottleRefusal.todayRefusals') || "Today's Refusals"}</Text>
              <Text style={styles.summarySubtitle}>{totalToday} {t('bottleRefusal.refusalsCount') || 'refusals today'}</Text>
            </View>
          </View>
          {todayEntries.length > 0 && (
            <View style={styles.summaryBadgeRow}>
              {[...new Set(todayEntries.map((e) => e.cause))].map((causeId) => {
                const cause = SUSPECTED_CAUSES.find((c) => c.id === causeId);
                return (
                  <View key={causeId} style={styles.causeTag}>
                    <MaterialCommunityIcons name={cause?.icon as any ?? 'help'} size={12} color={BOTTLE_BLUE} />
                    <Text style={styles.causeTagText}>{t(cause?.labelKey ?? '')}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {!showLogForm ? (
          <TouchableOpacity style={styles.logBtn} activeOpacity={0.7} onPress={() => setShowLogForm(true)}>
                          accessibilityLabel="Toggle bottle-refusal panel"
            <Text style={styles.logBtnText}>+ {t('bottleRefusal.logRefusal') || 'Log Bottle Refusal'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('bottleRefusal.logRefusal') || 'Log Bottle Refusal'}</Text>

            <Text style={styles.sectionTitle}>{t('bottleRefusal.suspectedCauses') || 'Suspected Causes'}</Text>
            <View style={styles.causeGrid}>
              {SUSPECTED_CAUSES.map((cause) => (
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in bottle-refusal"
                  key={cause.id}
                  style={[styles.causeChip, selectedCauses.has(cause.id) && styles.causeChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleCause(cause.id)}
                >
                  <MaterialCommunityIcons
                    name={cause.icon as any}
                    size={14}
                    color={selectedCauses.has(cause.id) ? '#fff' : C.muted}
                  />
                  <Text style={[styles.causeChipText, selectedCauses.has(cause.id) && styles.causeChipTextSelected]}>
                    {t(cause.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('bottleRefusal.durationRefusal') || 'How long did refusal last?'}</Text>
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>{t('bottleRefusal.minutes') || 'Minutes'}</Text>
              <TouchableOpacity
                              accessibilityLabel="TouchableOpacity in bottle-refusal"
                style={[styles.durationInput, { alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        t('bottleRefusal.enterDurationTitle') || 'Duration',
                        t('bottleRefusal.enterDurationBody') || 'Enter in minutes',
                        [
                          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                          { text: t('common.save') || 'Save', onPress: (_v?: string) => setDuration(_v || '') },
                        ],
                        'plain-text',
                        duration,
                        'number-pad'
                      )
                    : Alert.alert(
                        t('bottleRefusal.enterDurationTitle') || 'Duration',
                        t('bottleRefusal.enterDurationBody') || 'Enter in minutes',
                        [
                          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                          { text: t('common.save') || 'Save', onPress: (_v?: string) => setDuration(_v || '') },
                        ]
                      );
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: duration ? C.text : C.muted }}>
                  {duration ? `${duration}m` : t('bottleRefusal.durationPlaceholder') || 'Tap to enter...'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formNoteLabel}>{t('bottleRefusal.noteOptional') || 'Note (optional)'}</Text>
            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in bottle-refusal"
              style={styles.noteInput}
              onPress={() => {
                Alert.prompt
                  ? Alert.prompt(
                      t('bottleRefusal.addNoteTitle') || 'Add Note',
                      '',
                      [
                        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                        { text: t('common.save') || 'Save', onPress:
                          (_v?: string) => setNote(_v || '') },
                      ],
                      'plain-text',
                      note
                    )
                  : null;
              }}
            >
              <Text style={{ fontSize: 14, color: note ? C.text : C.muted }}>
                {note || t('bottleRefusal.notePlaceholder') || 'Tap to add note...'}
              </Text>
            </TouchableOpacity>

            <View style={styles.formButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowLogForm(false); setSelectedCauses(new Set()); setDuration(''); setNote(''); }}>
                              accessibilityLabel="Toggle bottle-refusal panel"
                <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={logRefusal}>
                              accessibilityLabel="Save bottle-refusal entry"
                <Text style={styles.saveBtnText}>{t('bottleRefusal.saveRefusal') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {weekCounts.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t('bottleRefusal.weeklyFrequency') || 'Refusals per Week (last 8 weeks)'}</Text>
            <View style={styles.chartBars}>
              {weekCounts.map((count, i) => (
                <View key={i} style={styles.chartBarWrap}>
                  <View style={[styles.chartBar, { height: Math.max((count / maxWeekCount) * 80, count > 0 ? 8 : 4) }]} />
                  <Text style={styles.chartBarCount}>{count}</Text>
                  <Text style={styles.chartBarLabel}>{weekLabels[i]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {correlation && (
          <View style={styles.insightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MaterialCommunityIcons name="lightbulb" size={16} color="#F59E0B" />
              <Text style={styles.insightTitle}>{t('bottleRefusal.correlationTitle') || 'Correlation Insight'}</Text>
            </View>
            <Text style={styles.insightText}>
              {t('bottleRefusal.correlationBody', {
                cause: t(SUSPECTED_CAUSES.find((c) => c.id === correlation.cause)?.labelKey ?? '') || correlation.cause,
                count: correlation.count,
              }) || `Most refusals (${correlation.count}x) linked to "${correlation.cause}" — consider adjusting nipple flow or investigating further.`}
            </Text>
          </View>
        )}

        {coldCorr > 2 && (
          <View style={styles.insightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MaterialCommunityIcons name="weather-snowy" size={16} color="#F59E0B" />
              <Text style={styles.insightTitle}>{t('bottleRefusal.coldCorrelationTitle') || 'Cold + Refusal Pattern'}</Text>
            </View>
            <Text style={styles.insightText}>
              {t('bottleRefusal.coldCorrelationBody', { count: coldCorr }) || `${coldCorr} refusals recorded within 2 weeks of cold symptoms. Monitor for oral discomfort during illness.`}
            </Text>
          </View>
        )}

        {entries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t('bottleRefusal.historyTitle') || 'History'} ({entries.length})
            </Text>
            <View style={styles.historyCard}>
              {entries.slice(0, 50).map((entry) => {
                const cause = SUSPECTED_CAUSES.find((c) => c.id === entry.cause);
                return (
                  <View key={entry.id} style={styles.entryRow}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={BOTTLE_RED} style={styles.entryIcon} />
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryCause}>{t(cause?.labelKey ?? '')}</Text>
                      {entry.note && <Text style={styles.entryNote}>{entry.note}</Text>}
                      <View style={styles.entryMeta}>
                        <View style={styles.entryBadge}>
                          <Text style={styles.entryBadgeText}>{entry.babyAgeMonths > 0 ? `${Math.round(entry.babyAgeMonths)}mo` : ''}</Text>
                        </View>
                        <Text style={styles.entryTime}>{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                      </View>
                    </View>
                    <Text style={styles.entryDuration}>{formatDurationRefusal(entry.durationMinutes)}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
