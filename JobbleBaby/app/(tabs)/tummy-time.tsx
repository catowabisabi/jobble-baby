import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/app/utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const TUMMY_TIME_KEY = STORAGE_KEYS.TUMMY_TIME_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

const POSITIONS = [
  { id: 'front', labelKey: 'tummyTime.positionFront', icon: 'face-down' },
  { id: 'plank', labelKey: 'tummyTime.positionPlank', icon: 'human-handsup' },
  { id: 'side', labelKey: 'tummyTime.positionSide', icon: 'rotate-right' },
] as const;

type PositionId = typeof POSITIONS[number]['id'];

interface TummyTimeEntry {
  id: string;
  durationSeconds: number;
  position: PositionId;
  date: string;
  timestamp: string;
  milestoneId?: string;
  note?: string;
}

// Neurodevelopment window milestones mapped to tummy time skills
const TUMMY_MILESTONES = [
  {
    id: 'head_lift',
    labelKey: 'tummyTime.milestoneHeadLift',
    minMonths: 0,
    maxMonths: 2,
    descriptionKey: 'tummyTime.milestoneHeadLiftDesc',
    icon: 'head',
  },
  {
    id: 'push_up',
    labelKey: 'tummyTime.milestonePushUp',
    minMonths: 2,
    maxMonths: 4,
    descriptionKey: 'tummyTime.milestonePushUpDesc',
    icon: 'human-handsup',
  },
  {
    id: 'chest_raise',
    labelKey: 'tummyTime.milestoneChestRaise',
    minMonths: 3,
    maxMonths: 5,
    descriptionKey: 'tummyTime.milestoneChestRaiseDesc',
    icon: 'human',
  },
  {
    id: 'arm_crawl',
    labelKey: 'tummyTime.milestoneArmCrawl',
    minMonths: 4,
    maxMonths: 6,
    descriptionKey: 'tummyTime.milestoneArmCrawlDesc',
    icon: 'arm-flex',
  },
  {
    id: 'roll_over',
    labelKey: 'tummyTime.milestoneRollOver',
    minMonths: 4,
    maxMonths: 7,
    descriptionKey: 'tummyTime.milestoneRollOverDesc',
    icon: 'rotate-3d-variant',
  },
  {
    id: 'crawl',
    labelKey: 'tummyTime.milestoneCrawl',
    minMonths: 6,
    maxMonths: 10,
    descriptionKey: 'tummyTime.milestoneCrawlDesc',
    icon: 'run',
  },
];

const DAILY_GOALS_minutes: Record<number, number> = {
  0: 5,
  1: 5,
  2: 10,
  3: 15,
  4: 20,
  5: 20,
  6: 30,
  7: 30,
  8: 30,
  9: 30,
  10: 30,
  11: 30,
  12: 30,
};

const TUMMY_BLUE = '#3B82F6';
const TUMMY_GREEN = '#10B981';
const TUMMY_AMBER = '#F59E0B';

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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

function getTodayEntries(entries: TummyTimeEntry[]): TummyTimeEntry[] {
  const today = getDateStr();
  return entries.filter((e) => e.date === today);
}

function getTodayTotalSeconds(entries: TummyTimeEntry[]): number {
  return getTodayEntries(entries).reduce((sum, e) => sum + e.durationSeconds, 0);
}

export default function TummyTimeScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<TummyTimeEntry[]>([]);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<PositionId>('front');
  const [babyAgeMonths, setBabyAgeMonths] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [timerStartRef] = useState(() => Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const [raw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(TUMMY_TIME_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (raw) setEntries(JSON.parse(raw));
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.birthDate) {
          setBabyAgeMonths(calculateAgeInMonths(profile.birthDate));
        }
      }
    } catch { /* ignore */ }
  };

  const currentMilestones = TUMMY_MILESTONES.filter(
    (m) => babyAgeMonths >= m.minMonths && babyAgeMonths <= m.maxMonths
  );

  const todayTotal = getTodayTotalSeconds(entries);
  const dailyGoal = DAILY_GOALS_minutes[Math.round(babyAgeMonths)] ?? 30;
  const dailyGoalSeconds = dailyGoal * 60;
  const progressPct = Math.min((todayTotal / dailyGoalSeconds) * 100, 100);

  const startTimer = () => {
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
  };

  const stopTimer = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsTimerRunning(false);

    if (timerSeconds < 10) {
      setTimerSeconds(0);
      return;
    }

    const entry: TummyTimeEntry = {
      id: Date.now().toString(),
      durationSeconds: timerSeconds,
      position: selectedPosition,
      date: getDateStr(),
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    setTimerSeconds(0);

    try {
      await AsyncStorage.setItem(TUMMY_TIME_KEY, JSON.stringify(updated));
      if (todayTotal + timerSeconds >= dailyGoalSeconds) {
        await awardBadge('tummy_time_goal');
        setNewBadges((prev) => [...prev, 'tummy_time_goal']);
        setTimeout(() => setNewBadges([]), 4000);
      }
    } catch { /* ignore */ }
  };

  const addManualEntry = () => {
    Alert.alert(
      t('tummyTime.manualEntryTitle') || 'Manual Entry',
      t('tummyTime.manualEntryPrompt') || 'Enter duration in minutes',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.save') || 'Save',
          onPress: async (_val?: string) => {
            const mins = parseInt(_val || '0', 10);
            if (!mins || mins <= 0) return;
            const entry: TummyTimeEntry = {
              id: Date.now().toString(),
              durationSeconds: mins * 60,
              position: selectedPosition,
              date: getDateStr(),
              timestamp: new Date().toISOString(),
            };
            const updated = [entry, ...entries];
            setEntries(updated);
            try {
              await AsyncStorage.setItem(TUMMY_TIME_KEY, JSON.stringify(updated));
            } catch {}
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 16 },
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
    progressBar: { backgroundColor: C.border, borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 8 },
    progressFill: { backgroundColor: TUMMY_BLUE, borderRadius: 8, height: 12 },
    progressText: { fontSize: 12, color: C.muted, textAlign: 'right' },
    timerCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    timerDisplay: { fontSize: 56, fontWeight: '700', color: C.text, fontVariant: ['tabular-nums'], marginVertical: 8 },
    timerRunning: { color: TUMMY_GREEN },
    positionSelector: { flexDirection: 'row', gap: 8, marginTop: 16 },
    positionChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    positionChipActive: { backgroundColor: TUMMY_BLUE, borderColor: TUMMY_BLUE },
    positionChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
    positionChipTextActive: { color: '#fff' },
    timerButtonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    startBtn: {
      flex: 1,
      backgroundColor: TUMMY_GREEN,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    startBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    stopBtn: {
      flex: 1,
      backgroundColor: '#EF4444',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
    },
    stopBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    manualBtn: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      marginTop: 8,
    },
    manualBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
    milestoneCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    milestoneCardActive: { borderColor: TUMMY_BLUE, borderWidth: 2, backgroundColor: '#EFF6FF' },
    milestoneHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    milestoneIcon: { fontSize: 24, marginRight: 10 },
    milestoneName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
    milestoneAge: { fontSize: 12, color: TUMMY_AMBER, fontWeight: '600' },
    milestoneDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
    milestoneTag: { backgroundColor: TUMMY_BLUE, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6 },
    milestoneTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
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
    entryDuration: { fontSize: 14, fontWeight: '700', color: TUMMY_BLUE },
    entryTime: { fontSize: 12, color: C.muted },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    badgeBanner: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: TUMMY_AMBER,
      gap: 8,
    },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: '#92400E', flex: 1 },
    promptCard: {
      backgroundColor: '#6D28D9',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    promptHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    promptIcon: { fontSize: 20 },
    promptTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
    promptText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  });

  const todayEntries = getTodayEntries(entries);
  const positionLabel = POSITIONS.find((p) => p.id === selectedPosition)?.labelKey ?? 'tummyTime.positionFront';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('tummyTime.greeting') || 'Daily Activity'}</Text>
          <Text style={styles.title}>🧘 {t('tummyTime.title') || 'Tummy Time'}</Text>
          <Text style={styles.subtitle}>
            {babyAgeMonths > 0
              ? `${Math.round(babyAgeMonths)} months old · ${t('tummyTime.dailyGoal', { minutes: dailyGoal })}`
              : t('tummyTime.subtitle')}
          </Text>
        </View>

        {newBadges.length > 0 && (
          <View style={styles.badgeBanner}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={styles.badgeBannerText}>
              {t('tummyTime.badgeEarned') || 'Badge earned!'}
            </Text>
          </View>
        )}

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressIcon}>🎯</Text>
            <View>
              <Text style={styles.progressTitle}>{t('tummyTime.dailyProgress') || "Today's Progress"}</Text>
              <Text style={styles.progressSubtitle}>
                {t('tummyTime.dailyGoal', { minutes: dailyGoal })} ·{' '}
                {Math.round(todayTotal / 60)}m / {dailyGoal}m
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPct)}%</Text>
        </View>

        {/* Active milestone prompt */}
        {currentMilestones.length > 0 && (
          <View style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <MaterialCommunityIcons name="lightbulb" size={20} color="#F59E0B" />
              <Text style={styles.promptTitle}>
                {t('tummyTime.currentWindow') || 'Neurodevelopment Window'}
              </Text>
            </View>
            {currentMilestones.map((m) => t(`tummyTime.milestonePrompt.${m.id}`)).join(' · ')}
          </View>
        )}

        {/* Timer Card */}
        <View style={styles.timerCard}>
          <Text style={[
            styles.timerDisplay,
            isTimerRunning && styles.timerRunning,
          ]}>
            {formatDuration(timerSeconds)}
          </Text>

          {/* Position selector */}
          <View style={styles.positionSelector}>
            {POSITIONS.map((pos) => (
              <TouchableOpacity
                              accessibilityLabel="TouchableOpacity in tummy-time"
                key={pos.id}
                style={[
                  styles.positionChip,
                  selectedPosition === pos.id && styles.positionChipActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedPosition(pos.id)}
              >
                <MaterialCommunityIcons
                  name={pos.icon as any}
                  size={16}
                  color={selectedPosition === pos.id ? '#fff' : C.muted}
                />
                <Text
                  style={[
                    styles.positionChipText,
                    selectedPosition === pos.id && styles.positionChipTextActive,
                  ]}
                >
                  {t(pos.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer buttons */}
          <View style={styles.timerButtonRow}>
            {!isTimerRunning ? (
              <TouchableOpacity style={styles.startBtn} activeOpacity={0.7} onPress={startTimer}>
                              accessibilityLabel="Start tummy-time timer"
                <Text style={styles.startBtnText}>▶ {t('tummyTime.start') || 'Start'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopBtn} activeOpacity={0.7} onPress={stopTimer}>
                              accessibilityLabel="Stop tummy-time timer"
                <Text style={styles.stopBtnText}>⏹ {t('tummyTime.stop') || 'Stop'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.manualBtn} activeOpacity={0.7} onPress={addManualEntry}>
                          accessibilityLabel="Add tummy-time entry"
            <Text style={styles.manualBtnText}>✏️ {t('tummyTime.manualEntry') || 'Manual Entry'}</Text>
          </TouchableOpacity>
        </View>

        {/* Age-appropriate milestones */}
        {currentMilestones.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('tummyTime.milestones') || 'Age Milestones'}</Text>
            {currentMilestones.map((milestone) => (
              <View key={milestone.id} style={[styles.milestoneCard, styles.milestoneCardActive]}>
                <View style={styles.milestoneHeader}>
                  <MaterialCommunityIcons name={milestone.icon as any} size={24} color={TUMMY_BLUE} style={styles.milestoneIcon} />
                  <Text style={styles.milestoneName}>{t(milestone.labelKey)}</Text>
                  <Text style={styles.milestoneAge}>
                    {milestone.minMonths}-{milestone.maxMonths} mo
                  </Text>
                </View>
                <Text style={styles.milestoneDesc}>{t(milestone.descriptionKey)}</Text>
              </View>
            ))}
          </>
        )}

        {/* History */}
        {todayEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('tummyTime.todayHistory') || "Today's Log"}</Text>
            <View style={styles.historyCard}>
              {todayEntries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <MaterialCommunityIcons name={POSITIONS.find(p => p.id === entry.position)?.icon as any ?? 'help'} size={22} color={TUMMY_BLUE} style={styles.entryIcon} />
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryType}>{t(POSITIONS.find(p => p.id === entry.position)?.labelKey ?? '')}</Text>
                    {entry.note && <Text style={styles.entryNote}>{entry.note}</Text>}
                  </View>
                  <Text style={styles.entryDuration}>{formatDuration(entry.durationSeconds)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
