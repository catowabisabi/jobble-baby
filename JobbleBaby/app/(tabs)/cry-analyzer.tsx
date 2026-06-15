import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const STORAGE_KEY = STORAGE_KEYS.CRY_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

type BabyProfile = {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
};

type CauseTag = 'hunger' | 'overtired' | 'teething' | 'reflux' | 'separation_anxiety' | 'other';

interface CryEntry {
  id: string;
  timestamp: string;
  duration_minutes: number;
  cause_tag: CauseTag;
  intensity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

const CAUSE_TAGS: { key: CauseTag; labelKey: string }[] = [
  { key: 'hunger', labelKey: 'cryAnalyzer.hunger' },
  { key: 'overtired', labelKey: 'cryAnalyzer.overtired' },
  { key: 'teething', labelKey: 'cryAnalyzer.teething' },
  { key: 'reflux', labelKey: 'cryAnalyzer.reflux' },
  { key: 'separation_anxiety', labelKey: 'cryAnalyzer.separationAnxiety' },
  { key: 'other', labelKey: 'cryAnalyzer.other' },
];

const COLIC_THRESHOLDS: { maxWeeks: number; threshold: number }[] = [
  { maxWeeks: 4, threshold: 120 },
  { maxWeeks: 8, threshold: 180 },
  { maxWeeks: 12, threshold: 150 },
  { maxWeeks: 16, threshold: 90 },
  { maxWeeks: Infinity, threshold: 60 },
];

const getColicThreshold = (ageInWeeks: number): number => {
  for (const tier of COLIC_THRESHOLDS) {
    if (ageInWeeks <= tier.maxWeeks) return tier.threshold;
  }
  return 60;
};

const getAgeInWeeks = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const formatDate = (iso: string) => {
  return iso.split('T')[0];
};

// i18n-derived (no longer hardcoded)
const WEEKDAY_KEYS = (() => {
  const day = require('../i18n/en.json').cryAnalyzer.day as Record<string, string>;
  return day ? Object.keys(day) : [];
})();

const getDayLabel = (dateStr: string, t: (key: string) => string): string => {
  const d = new Date(dateStr);
  return t(`cryAnalyzer.day.${WEEKDAY_KEYS[d.getDay()]}`);
};

const SEVERITY_COLORS = { green: '#2ecc71', yellow: '#f1c40f', red: '#e74c3c' };

export default function CryAnalyzer() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<CryEntry[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [duration, setDuration] = useState('10');
  const [selectedCause, setSelectedCause] = useState<CauseTag>('other');
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [newBadge, setNewBadge] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRaw, profileRaw] = await Promise.all([
        safeGetItem(STORAGE_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (entriesRaw) setEntries(JSON.parse(entriesRaw));
      if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
    } catch {}
  };

  const saveEntries = async (newEntries: CryEntry[]) => {
    setEntries(newEntries);
    try {
      await safeSetItem(STORAGE_KEY, JSON.stringify(newEntries));
    } catch {}
  };

  const handleSave = async () => {
    const entry: CryEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      duration_minutes: Math.max(1, Math.min(120, parseInt(duration, 10) || 10)),
      cause_tag: selectedCause,
      intensity: intensity as 1 | 2 | 3 | 4 | 5,
      notes: notes.trim() || undefined,
    };
    const updated = [entry, ...entries];
    await saveEntries(updated);
    setShowModal(false);
    setDuration('10');
    setSelectedCause('other');
    setIntensity(3);
    setNotes('');
    await checkBadge(updated);
  };

  const checkBadge = async (_allEntries: CryEntry[]) => {
    // Check for 7 consecutive days with at least 1 entry each
    const dates = [...new Set(_allEntries.map((e) => formatDate(e.timestamp)))].sort().reverse();
    if (dates.length < 7) return;

    let consecutive = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const curr = new Date(dates[i]);
      const prev = new Date(dates[i + 1]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        consecutive++;
        if (consecutive >= 7) break;
      } else {
        break;
      }
    }
    if (consecutive >= 7) {
      const awarded = await awardBadge('cry_champion');
      if (awarded) {
        setNewBadge('Cry Champion');
        setTimeout(() => setNewBadge(null), 4000);
      }
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => formatDate(e.timestamp) === todayStr);
  const todayMinutes = todayEntries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const todayEpisodes = todayEntries.length;

  const getSeverity = (): 'green' | 'yellow' | 'red' => {
    if (todayMinutes < 30) return 'green';
    if (todayMinutes <= 90) return 'yellow';
    return 'red';
  };

  const getWeeklyData = (): { date: string; minutes: number }[] => {
    const result: { date: string; minutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayMinutes = entries
        .filter((e) => formatDate(e.timestamp) === dateStr)
        .reduce((sum, e) => sum + e.duration_minutes, 0);
      result.push({ date: dateStr, minutes: dayMinutes });
    }
    return result;
  };

  const getWeeklyAvg = (): number => {
    const weekly = getWeeklyData();
    const daysWithData = weekly.filter((d) => d.minutes > 0);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((s, d) => s + d.minutes, 0) / daysWithData.length);
  };

  const getColicAlert = (): boolean => {
    if (!babyProfile?.birthDate) return false;
    const ageWeeks = getAgeInWeeks(babyProfile.birthDate);
    const threshold = getColicThreshold(ageWeeks);
    return getWeeklyAvg() > threshold;
  };

  const weeklyData = getWeeklyData();
  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 1);
  const colicAlert = getColicAlert();

  const groupedEntries = (() => {
    const groups: { date: string; entries: CryEntry[] }[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      const dateStr = formatDate(entry.timestamp);
      if (!seen.has(dateStr)) {
        seen.add(dateStr);
        groups.push({ date: dateStr, entries: entries.filter((e) => formatDate(e.timestamp) === dateStr) });
      }
    }
    return groups.slice(0, 30);
  })();

  const intensityLabel = (val: number) => {
    if (val <= 1) return t('cryAnalyzer.intensityWhimper');
    if (val >= 5) return t('cryAnalyzer.intensityScreaming');
    return t('cryAnalyzer.intensityMedium');
  };

  const causeLabel = (key: CauseTag) => t(CAUSE_TAGS.find((c) => c.key === key)?.labelKey || 'cryAnalyzer.other');

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 120 },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    badgeBanner: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#f1c40f',
    },
    badgeBannerText: { fontSize: 14, fontWeight: '600', color: '#D97706', flex: 1, marginLeft: 10 },
    summaryCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    summaryTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    summaryRow: { flexDirection: 'row', gap: 24, marginBottom: 12 },
    summaryItem: { flex: 1 },
    summaryValue: { fontSize: 28, fontWeight: 'bold', color: C.text },
    summaryLabel: { fontSize: 12, color: C.muted },
    severityBar: { height: 8, borderRadius: 4, backgroundColor: C.border, marginTop: 8, overflow: 'hidden' },
    severityFill: { height: '100%', borderRadius: 4 },
    colicBanner: {
      backgroundColor: '#EF4444',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colicBannerText: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginLeft: 8 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    chartCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 8 },
    chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    chartBarFill: { width: '100%', borderRadius: 4, minHeight: 4 },
    chartLabel: { fontSize: 10, color: C.muted, marginTop: 4 },
    chartValue: { fontSize: 10, color: C.text, marginBottom: 2 },
    thresholdLine: { height: 1, backgroundColor: '#EF4444', marginTop: 4, marginBottom: 8 },
    thresholdLabel: { fontSize: 10, color: '#EF4444', textAlign: 'right' },
    fabContainer: { position: 'absolute', bottom: 30, alignSelf: 'center' },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
    },
    fabText: { fontSize: 28, color: '#fff', fontWeight: '300' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalCard: {
      backgroundColor: C.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20, textAlign: 'center' },
    modalLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
    modalInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      textAlign: 'center',
    },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    durationBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    durationBtnText: { fontSize: 20, color: '#fff', fontWeight: '600' },
    durationValue: { fontSize: 24, fontWeight: '700', color: C.text, minWidth: 60, textAlign: 'center' },
    durationUnit: { fontSize: 14, color: C.muted },
    causeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    causeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: C.background,
      borderWidth: 1,
      borderColor: C.border,
    },
    causeChipSelected: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    causeChipText: { fontSize: 12, color: C.text },
    causeChipTextSelected: { color: '#fff' },
    intensityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    intensityBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.background,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    intensityBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    intensityValue: { fontSize: 18, fontWeight: '700', color: C.text },
    intensityLabelText: { fontSize: 12, color: C.muted, marginBottom: 4 },
    notesInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    saveBtn: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    cancelBtn: { padding: 14, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, color: C.muted },
    historyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    historyDate: { fontSize: 12, color: C.muted, marginBottom: 8 },
    historyEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    historyEntryLast: { borderBottomWidth: 0 },
    historyEntryIcon: { fontSize: 16, marginRight: 10 },
    historyEntryInfo: { flex: 1 },
    historyEntryCause: { fontSize: 14, fontWeight: '600', color: C.text },
    historyEntryMeta: { fontSize: 11, color: C.muted },
    historyEntryRight: { alignItems: 'flex-end' },
    historyEntryTime: { fontSize: 12, color: C.muted },
    historyEntryDuration: { fontSize: 12, fontWeight: '600', color: C.text },
    intensityDot: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
    dotFilled: { backgroundColor: '#3B82F6' },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('cryAnalyzer.title')}</Text>
          <Text style={styles.subtitle}>{t('cryAnalyzer.subtitle')}</Text>
        </View>

        {newBadge && (
          <View style={styles.badgeBanner}>
            <Text style={{ fontSize: 20 }}>💧</Text>
            <Text style={styles.badgeBannerText}>{t('cryAnalyzer.badgeEarned', { name: newBadge })}</Text>
          </View>
        )}

        {colicAlert && (
          <View style={styles.colicBanner}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <Text style={styles.colicBannerText}>{t('cryAnalyzer.colicAlert')}</Text>
          </View>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('cryAnalyzer.todaySummary')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{todayEpisodes}</Text>
              <Text style={styles.summaryLabel}>{t('cryAnalyzer.episodesToday')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{todayMinutes}</Text>
              <Text style={styles.summaryLabel}>{t('cryAnalyzer.minutesToday')}</Text>
            </View>
          </View>
          <View style={styles.severityBar}>
            <View
              style={[
                styles.severityFill,
                {
                  backgroundColor: SEVERITY_COLORS[getSeverity()],
                  width: `${Math.min(100, (todayMinutes / 120) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('cryAnalyzer.weeklyScore')}</Text>
        <View style={styles.chartCard}>
          <View style={styles.thresholdLine} />
          {babyProfile?.birthDate && (
            <Text style={styles.thresholdLabel}>
              {t('cryAnalyzer.colicThreshold')}: {getColicThreshold(getAgeInWeeks(babyProfile.birthDate))} min
            </Text>
          )}
          <View style={styles.chartRow}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.chartBar}>
                {d.minutes > 0 && <Text style={styles.chartValue}>{d.minutes}</Text>}
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      height: Math.max(4, (d.minutes / maxMinutes) * 100),
                      backgroundColor: d.minutes > 0 ? '#3B82F6' : C.border,
                    },
                  ]}
                />
                <Text style={styles.chartLabel}>{getDayLabel(d.date, t)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('cryAnalyzer.history')}</Text>
        {groupedEntries.length === 0 ? (
          <Text style={styles.emptyText}>{t('cryAnalyzer.noEntries')}</Text>
        ) : (
          groupedEntries.map((group) => (
            <View key={group.date} style={styles.historyCard}>
              <Text style={styles.historyDate}>{group.date}</Text>
              {group.entries.map((entry, idx) => (
                <View
                  key={entry.id}
                  style={[styles.historyEntry, idx === group.entries.length - 1 && styles.historyEntryLast]}
                >
                  <Text style={styles.historyEntryIcon}>💧</Text>
                  <View style={styles.historyEntryInfo}>
                    <Text style={styles.historyEntryCause}>{causeLabel(entry.cause_tag)}</Text>
                    <Text style={styles.historyEntryMeta}>
                      {t(`cryAnalyzer.intensityLabel`)} {entry.intensity}/5
                    </Text>
                    <View style={styles.intensityDot}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <View key={v} style={[styles.dot, v <= entry.intensity && styles.dotFilled]} />
                      ))}
                    </View>
                  </View>
                  <View style={styles.historyEntryRight}>
                    <Text style={styles.historyEntryTime}>{formatTime(entry.timestamp)}</Text>
                    <Text style={styles.historyEntryDuration}>{entry.duration_minutes} min</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
<Pressable style={styles.fab} onPress={() => setShowModal(true)}
          accessibilityLabel={t('cryAnalyzer.addEntry')}
          accessibilityRole="button"
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>

      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('cryAnalyzer.logCry')}</Text>

            <Text style={styles.modalLabel}>{t('cryAnalyzer.duration')} (1-120 min)</Text>
            <View style={styles.durationRow}>
<TouchableOpacity
                style={styles.durationBtn}
                onPress={() => setDuration((d) => String(Math.max(1, parseInt(d, 10) - 5)))}
                accessibilityLabel={t('cryAnalyzer.decreaseDuration')}
                accessibilityRole="button"
                accessibilityHint={t('cryAnalyzer.decreaseDurationHint')}
              >
                <Text style={styles.durationBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.durationValue}>{duration}</Text>
              <Text style={styles.durationUnit}>min</Text>
<TouchableOpacity
                style={styles.durationBtn}
                onPress={() => setDuration((d) => String(Math.min(120, parseInt(d, 10) + 5)))}
                accessibilityLabel={t('cryAnalyzer.increaseDuration')}
                accessibilityRole="button"
                accessibilityHint={t('cryAnalyzer.increaseDurationHint')}
              >
                <Text style={styles.durationBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>{t('cryAnalyzer.cause')}</Text>
            <View style={styles.causeRow}>
              {CAUSE_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.key}
                  style={[styles.causeChip, selectedCause === tag.key && styles.causeChipSelected]}
                  onPress={() => setSelectedCause(tag.key)}
                  accessibilityLabel={t(tag.labelKey)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCause === tag.key }}
                >
                  <Text style={[styles.causeChipText, selectedCause === tag.key && styles.causeChipTextSelected]}>
                    {t(tag.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.intensityLabelText}>
              {t('cryAnalyzer.intensity')}: {intensity} — {intensityLabel(intensity)}
            </Text>
            <View style={styles.intensityRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.intensityBtn, intensity === v && styles.intensityBtnActive]}
                  onPress={() => setIntensity(v)}
                  accessibilityLabel={`${t('cryAnalyzer.intensity')} ${v}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: intensity === v }}
                >
                  <Text style={{ color: intensity === v ? '#fff' : C.text, fontSize: 16, fontWeight: '600' }}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder={t('cryAnalyzer.notes')}
              placeholderTextColor={C.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}
              accessibilityLabel={t('cryAnalyzer.addEntry')}
              accessibilityRole="button"
            >
              <Text style={styles.saveBtnText}>{t('cryAnalyzer.addEntry')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
