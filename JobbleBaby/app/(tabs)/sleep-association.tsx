import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const STORAGE_KEY = '@jobble/sleep_association_entries';

const SLEEP_ASSOC_AMBER = '#F59E0B';
const SLEEP_ASSOC_BLUE = '#3B82F6';
const SLEEP_ASSOC_GREEN = '#22C55E';
const SLEEP_ASSOC_RED = '#EF4444';

export interface SleepAssocEntry {
  id: string;
  date: string;
  associations: string[];
  fallingAsleepMinutes: number;
  nightWakings: number;
  longestStretch: number;
  qualityRating: number;
  notes?: string;
}

const ASSOCIATION_OPTIONS = [
  { id: 'pacifier', icon: 'gamepad-circle-outline', labelKey: 'sleepAssociation.pacifier' },
  { id: 'swaddle', icon: 'swim', labelKey: 'sleepAssociation.swaddle' },
  { id: 'white_noise', icon: 'weather-cloudy', labelKey: 'sleepAssociation.whiteNoise' },
  { id: 'rocking', icon: 'chair-rolling', labelKey: 'sleepAssociation.rocking' },
  { id: 'feeding_to_sleep', icon: 'food-outline', labelKey: 'sleepAssociation.feedingToSleep' },
  { id: 'blackout_curtain', icon: 'blinds-closed', labelKey: 'sleepAssociation.blackout' },
  { id: 'room_dark', icon: 'moon-waning-crescent', labelKey: 'sleepAssociation.roomDark' },
  { id: 'fan', icon: 'fan', labelKey: 'sleepAssociation.fan' },
  { id: 'music', icon: 'music-note', labelKey: 'sleepAssociation.music' },
  { id: 'massage', icon: 'hand-ballistic', labelKey: 'sleepAssociation.massage' },
  { id: 'cuddling', icon: 'heart-outline', labelKey: 'sleepAssociation.cuddling' },
  { id: 'teether', icon: 'toy-brick-outline', labelKey: 'sleepAssociation.teether' },
  { id: 'comforter', icon: 'bed', labelKey: 'sleepAssociation.comforter' },
  { id: 'other', icon: 'dots-horizontal-circle-outline', labelKey: 'sleepAssociation.other' },
];

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function SleepAssociationScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<SleepAssocEntry[]>([]);
  const [selectedAssociations, setSelectedAssociations] = useState<string[]>([]);
  const [fallingAsleepMinutes, setFallingAsleepMinutes] = useState('');
  const [nightWakings, setNightWakings] = useState('');
  const [longestStretch, setLongestStretch] = useState('');
  const [qualityRating, setQualityRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [currentScreen, setCurrentScreen] = useState<'log' | 'chart' | 'fadeout' | 'history'>('log');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch { }
  };

  const getTodayEntry = useCallback((): SleepAssocEntry | null => {
    const today = getDateStr();
    return entries.find(e => e.date === today) || null;
  }, [entries]);

  const getFeedingToSleepPercent = useCallback((): number => {
    if (entries.length === 0) return 0;
    const feedingCount = entries.filter(e => e.associations.includes('feeding_to_sleep')).length;
    return Math.round((feedingCount / entries.length) * 100);
  }, [entries]);

  const toggleAssociation = (id: string) => {
    setSelectedAssociations(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const logEntry = async () => {
    if (selectedAssociations.length === 0) {
      Alert.alert(t('sleepAssociation.selectAtLeastOne') || 'Select at least one association');
      return;
    }

    const entry: SleepAssocEntry = {
      id: Date.now().toString(),
      date: getDateStr(),
      associations: selectedAssociations,
      fallingAsleepMinutes: parseInt(fallingAsleepMinutes) || 0,
      nightWakings: parseInt(nightWakings) || 0,
      longestStretch: parseInt(longestStretch) || 0,
      qualityRating,
      notes: notes.trim() || undefined,
    };

    const today = getDateStr();
    const updated = [entry, ...entries.filter(e => e.date !== today)].slice(0, 100);
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (updated.length >= 7) {
      await awardBadge('sleep_architect');
    }

    setSelectedAssociations([]);
    setFallingAsleepMinutes('');
    setNightWakings('');
    setLongestStretch('');
    setQualityRating(3);
    setNotes('');

    Alert.alert(t('sleepAssociation.loggedSuccess') || 'Entry logged!');
  };

  const getAssociationStats = () => {
    const last14 = getLast14Days();
    const recentEntries = entries.filter(e => last14.includes(e.date));

    const counts: Record<string, number> = {};
    ASSOCIATION_OPTIONS.forEach(opt => { counts[opt.id] = 0; });

    recentEntries.forEach(entry => {
      entry.associations.forEach(assoc => {
        if (counts[assoc] !== undefined) counts[assoc]++;
      });
    });

    const total = recentEntries.length || 1;
    return ASSOCIATION_OPTIONS.map(opt => ({
      ...opt,
      count: counts[opt.id],
      percent: Math.round((counts[opt.id] / total) * 100),
    })).sort((a, b) => b.count - a.count);
  };

  const getWakingCorrelation = () => {
    const assocWakings: Record<string, { total: number; count: number }> = {};
    ASSOCIATION_OPTIONS.forEach(opt => {
      assocWakings[opt.id] = { total: 0, count: 0 };
    });

    entries.forEach(entry => {
      entry.associations.forEach(assoc => {
        if (assocWakings[assoc]) {
          assocWakings[assoc].total += entry.nightWakings;
          assocWakings[assoc].count += 1;
        }
      });
    });

    return ASSOCIATION_OPTIONS.map(opt => {
      const data = assocWakings[opt.id];
      const avg = data.count > 0 ? (data.total / data.count) : 0;
      return { ...opt, avgWakings: Math.round(avg * 10) / 10, entries: data.count };
    }).filter(a => a.entries > 0).sort((a, b) => a.avgWakings - b.avgWakings);
  };

  const feedingPercent = getFeedingToSleepPercent();
  const showFadeOut = feedingPercent > 60;
  const todayEntry = getTodayEntry();
  const assocStats = getAssociationStats();
  const wakingCorr = getWakingCorrelation();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    tabButtonActive: { backgroundColor: SLEEP_ASSOC_AMBER, borderColor: SLEEP_ASSOC_AMBER },
    tabButtonText: { fontSize: 11, fontWeight: '600', color: C.muted },
    tabButtonTextActive: { color: '#fff' },
    alertBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: SLEEP_ASSOC_AMBER,
    },
    alertIcon: { fontSize: 20, marginRight: 10 },
    alertText: { fontSize: 13, color: '#92400E', flex: 1, lineHeight: 18 },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    assocGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    assocChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    assocChipSelected: { backgroundColor: SLEEP_ASSOC_BLUE, borderColor: SLEEP_ASSOC_BLUE },
    assocChipIcon: { fontSize: 16 },
    assocChipText: { fontSize: 12, color: C.muted },
    assocChipTextSelected: { color: '#fff', fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    inputLabel: { fontSize: 14, color: C.muted, width: 120 },
    inputField: {
      flex: 1, backgroundColor: C.background, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border,
      fontSize: 14, color: C.text,
    },
    starsRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    starBtn: { padding: 4 },
    starIcon: { fontSize: 28 },
    logButton: {
      backgroundColor: SLEEP_ASSOC_AMBER, borderRadius: 16, padding: 16,
      alignItems: 'center', marginTop: 8,
    },
    logButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    barChartContainer: { marginBottom: 16 },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    barLabel: { fontSize: 11, color: C.muted, width: 80 },
    barBg: { flex: 1, backgroundColor: C.border, borderRadius: 4, height: 18, overflow: 'hidden' },
    barFill: { backgroundColor: SLEEP_ASSOC_BLUE, borderRadius: 4, height: 18 },
    barValue: { fontSize: 11, color: C.text, width: 40, textAlign: 'right', marginLeft: 6 },
    corrCard: {
      backgroundColor: C.card, borderRadius: 12, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    corrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    corrIcon: { fontSize: 16, marginRight: 8 },
    corrName: { fontSize: 13, color: C.text, flex: 1 },
    corrWakings: { fontSize: 12, color: SLEEP_ASSOC_GREEN, fontWeight: '700' },
    corrEntries: { fontSize: 10, color: C.muted },
    fadeoutCard: {
      backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16,
      marginBottom: 16, borderWidth: 1, borderColor: SLEEP_ASSOC_AMBER,
    },
    fadeoutTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 12 },
    fadeoutStep: {
      flexDirection: 'row', alignItems: 'center', marginBottom: 10,
      backgroundColor: '#fff', borderRadius: 10, padding: 12,
    },
    stepNumber: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: SLEEP_ASSOC_AMBER,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    stepNumberText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    stepText: { fontSize: 13, color: '#92400E', flex: 1 },
    stepArrow: { fontSize: 16, color: '#92400E', marginHorizontal: 8 },
    historySection: { marginBottom: 16 },
    historyDate: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 8 },
    historyCard: {
      backgroundColor: C.card, borderRadius: 12, padding: 12,
      marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    historyAssocs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
    historyChip: { backgroundColor: SLEEP_ASSOC_BLUE, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    historyChipText: { fontSize: 10, color: '#fff', fontWeight: '600' },
    historyStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    historyStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyStatText: { fontSize: 11, color: C.muted },
    historyStatValue: { fontSize: 12, fontWeight: '600', color: C.text },
    qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 40 },
    notesInput: {
      backgroundColor: C.background, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: C.border, minHeight: 60, marginTop: 8,
    },
    notesText: { fontSize: 14, color: C.text },
  });

  const renderLogScreen = () => (
    <View>
      {todayEntry ? (
        <View style={[styles.card, { borderColor: SLEEP_ASSOC_GREEN }]}>
          <Text style={styles.cardTitle}>Today's Log</Text>
          <View style={styles.historyAssocs}>
            {todayEntry.associations.map(assoc => (
              <View key={assoc} style={styles.historyChip}>
                <Text style={styles.historyChipText}>{assoc}</Text>
              </View>
            ))}
          </View>
          <View style={styles.historyStats}>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatText}>Fall asleep:</Text>
              <Text style={styles.historyStatValue}>{todayEntry.fallingAsleepMinutes}m</Text>
            </View>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatText}>Wakings:</Text>
              <Text style={styles.historyStatValue}>{todayEntry.nightWakings}x</Text>
            </View>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatText}>Longest:</Text>
              <Text style={styles.historyStatValue}>{todayEntry.longestStretch}h</Text>
            </View>
          </View>
          <View style={styles.qualityRow}>
            {[1,2,3,4,5].map(n => (
              <Text key={n} style={{ fontSize: 18, color: n <= todayEntry.qualityRating ? SLEEP_ASSOC_AMBER : C.border }}>★</Text>
            ))}
          </View>
          <TouchableOpacity style={{ marginTop: 12 }} onPress={() => {
            setSelectedAssociations(todayEntry.associations);
            setFallingAsleepMinutes(todayEntry.fallingAsleepMinutes.toString());
            setNightWakings(todayEntry.nightWakings.toString());
            setLongestStretch(todayEntry.longestStretch.toString());
            setQualityRating(todayEntry.qualityRating);
            setNotes(todayEntry.notes || '');
          }}>
            <Text style={{ fontSize: 13, color: SLEEP_ASSOC_BLUE, fontWeight: '600' }}>Edit Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {showFadeOut && (
            <View style={styles.alertBanner}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertText}>{t('sleepAssociation.alertDependency')}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('sleepAssociation.todaysLog')}</Text>

            <Text style={[styles.cardTitle, { marginTop: 8 }]}>{t('sleepAssociation.associations')}</Text>
            <View style={styles.assocGrid}>
              {ASSOCIATION_OPTIONS.map(opt => {
                const selected = selectedAssociations.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.assocChip, selected && styles.assocChipSelected]}
                    onPress={() => toggleAssociation(opt.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={16}
                      color={selected ? '#fff' : C.muted}
                      style={styles.assocChipIcon}
                    />
                    <Text style={[styles.assocChipText, selected && styles.assocChipTextSelected]}>
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>{t('sleepAssociation.fallingAsleepMin')}</Text>
              <TextInput
                style={styles.inputField}
                placeholder="0"
                keyboardType="numeric"
                value={fallingAsleepMinutes}
                onChangeText={setFallingAsleepMinutes}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>{t('sleepAssociation.nightWakings')}</Text>
              <TextInput
                style={styles.inputField}
                placeholder="0"
                keyboardType="numeric"
                value={nightWakings}
                onChangeText={setNightWakings}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>{t('sleepAssociation.longestStretch')}</Text>
              <TextInput
                style={styles.inputField}
                placeholder="0"
                keyboardType="numeric"
                value={longestStretch}
                onChangeText={setLongestStretch}
              />
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>{t('sleepAssociation.quality')}</Text>
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} style={styles.starBtn} onPress={() => setQualityRating(n)}>
                    <Text style={styles.starIcon}>{n <= qualityRating ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.notesInput} onPress={() => {
              Alert.prompt ? Alert.prompt('Notes', '', (text) => setNotes(text || '')) : null;
            }}>
              <Text style={styles.notesText}>{notes || t('sleepAssociation.noteOptional')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logButton} onPress={logEntry} activeOpacity={0.7}>
              <Text style={styles.logButtonText}>✓ {t('sleepAssociation.logEntry')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderChartScreen = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('sleepAssociation.assocFrequency')}</Text>
        <View style={styles.barChartContainer}>
          {assocStats.slice(0, 10).map(stat => (
            <View key={stat.id} style={styles.barRow}>
              <Text style={styles.barLabel}>{t(stat.labelKey)}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${stat.percent}%` }]} />
              </View>
              <Text style={styles.barValue}>{stat.percent}%</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('sleepAssociation.wakingCorrelation')}</Text>
        {wakingCorr.length === 0 ? (
          <Text style={styles.emptyText}>{t('sleepAssociation.noCorrData')}</Text>
        ) : (
          wakingCorr.slice(0, 6).map(corr => (
            <View key={corr.id} style={styles.corrCard}>
              <View style={styles.corrRow}>
                <Ionicons name={corr.icon as any} size={18} color={SLEEP_ASSOC_BLUE} style={styles.corrIcon} />
                <Text style={styles.corrName}>{t(corr.labelKey)}</Text>
                <Text style={styles.corrWakings}>{corr.avgWakings}x</Text>
              </View>
              <Text style={styles.corrEntries}>{corr.entries} entries · Avg night wakings</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderFadeoutScreen = () => (
    <View>
      <View style={styles.fadeoutCard}>
        <Text style={styles.fadeoutTitle}>☁️ {t('sleepAssociation.fadeOutPlan')}</Text>
        <Text style={{ fontSize: 13, color: '#92400E', marginBottom: 16, lineHeight: 18 }}>
          {t('sleepAssociation.fadeOutDesc')}
        </Text>
        <View style={styles.fadeoutStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
          <Text style={styles.stepText}>{t('sleepAssociation.fadeOutStep1')}</Text>
          <Text style={styles.stepArrow}>→</Text>
        </View>
        <View style={styles.fadeoutStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
          <Text style={styles.stepText}>{t('sleepAssociation.fadeOutStep2')}</Text>
          <Text style={styles.stepArrow}>→</Text>
        </View>
        <View style={styles.fadeoutStep}>
          <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
          <Text style={styles.stepText}>{t('sleepAssociation.fadeOutStep3')}</Text>
          <Text style={styles.stepArrow}>✓</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('sleepAssociation.currentUsage')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: C.border, borderRadius: 8, height: 16, overflow: 'hidden' }}>
            <View style={{ width: `${feedingPercent}%`, backgroundColor: SLEEP_ASSOC_AMBER, height: 16 }} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: SLEEP_ASSOC_AMBER, marginLeft: 12 }}>{feedingPercent}%</Text>
        </View>
        <Text style={{ fontSize: 12, color: C.muted }}>
          {t('sleepAssociation.feedingUsage', { count: entries.filter(e => e.associations.includes('feeding_to_sleep')).length, total: entries.length })}
        </Text>
      </View>
    </View>
  );

  const renderHistoryScreen = () => {
    const grouped = entries.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, SleepAssocEntry[]>);

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
      <View>
        {dates.length === 0 ? (
          <Text style={styles.emptyText}>{t('sleepAssociation.noHistory')}</Text>
        ) : (
          dates.map(date => (
            <View key={date} style={styles.historySection}>
              <Text style={styles.historyDate}>{formatDate(date)}</Text>
              {grouped[date].map(entry => (
                <View key={entry.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyAssocs}>
                      {entry.associations.map(assoc => (
                        <View key={assoc} style={styles.historyChip}>
                          <Text style={styles.historyChipText}>{assoc}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatText}>Fall:</Text>
                      <Text style={styles.historyStatValue}>{entry.fallingAsleepMinutes}m</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatText}>Wakings:</Text>
                      <Text style={styles.historyStatValue}>{entry.nightWakings}x</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatText}>Longest:</Text>
                      <Text style={styles.historyStatValue}>{entry.longestStretch}h</Text>
                    </View>
                  </View>
                  <View style={styles.qualityRow}>
                    {[1,2,3,4,5].map(n => (
                      <Text key={n} style={{ fontSize: 14, color: n <= entry.qualityRating ? SLEEP_ASSOC_AMBER : C.border }}>★</Text>
                    ))}
                  </View>
                  {entry.notes && (
                    <Text style={{ fontSize: 12, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>{entry.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('sleepAssociation.greeting')}</Text>
          <Text style={styles.title}>☁️ {t('sleepAssociation.title')}</Text>
          <Text style={styles.subtitle}>{t('sleepAssociation.subtitle')}</Text>
        </View>

        <View style={styles.tabBar}>
          {(['log', 'chart', 'fadeout', 'history'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, currentScreen === tab && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => setCurrentScreen(tab)}
            >
              <Text style={[styles.tabButtonText, currentScreen === tab && styles.tabButtonTextActive]}>
                {tab === 'log' ? '📋' : tab === 'chart' ? '📊' : tab === 'fadeout' ? '☁️' : '📓'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentScreen === 'log' && renderLogScreen()}
        {currentScreen === 'chart' && renderChartScreen()}
        {currentScreen === 'fadeout' && renderFadeoutScreen()}
        {currentScreen === 'history' && renderHistoryScreen()}
      </ScrollView>
    </SafeAreaView>
  );
}