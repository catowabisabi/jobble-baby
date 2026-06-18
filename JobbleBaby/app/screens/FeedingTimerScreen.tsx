import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { Link } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const PROFILE_KEY = '@jobble_baby_profile';
const TRACKING_KEY = '@jobble/tracking_entries';

type FoodType = 'liquid' | 'solid';

type TrackingEntry = {
  type: 'feed' | 'diaper' | 'sleep';
  timestamp: string;
  amount?: string;
  diaperType?: string;
  duration?: string;
  note?: string;
};

type AgeGroup = '0-3' | '3-6' | '6-12' | '12+';

function calculateAgeGroup(birthDateStr: string): AgeGroup {
  const birth = new Date(birthDateStr);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));

  if (totalMonths < 3) return '0-3';
  if (totalMonths < 6) return '3-6';
  if (totalMonths < 12) return '6-12';
  return '12+';
}

function calculateAgeDisplay(birthDateStr: string): string {
  const birth = new Date(birthDateStr);
  const now = new Date();
  const diffMs = now.getTime() - birth.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (totalMonths < 24) {
    return `${totalMonths} months`;
  }
  if (years > 0 && months > 0) {
    return `${years} years ${months} months`;
  }
  if (years > 0) {
    return `${years} years`;
  }
  return `${totalMonths} months`;
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTodayEntries(entries: TrackingEntry[]): TrackingEntry[] {
  const today = new Date().toISOString().split('T')[0];
  return entries.filter((e) => e.timestamp.startsWith(today) && e.type === 'feed');
}

const PORTION_PRESETS = {
  liquid: {
    '0-3': ['30ml', '60ml', '90ml'],
    '3-6': ['60ml', '90ml', '120ml'],
    '6-12': ['90ml', '120ml', '180ml'],
    '12+': ['120ml', '180ml', '240ml'],
  },
  solid: {
    '0-3': ['50g', '100g'],
    '3-6': ['50g', '100g', '150g'],
    '6-12': ['50g', '100g', '150g'],
    '12+': ['100g', '150g', '200g'],
  },
};

export default function FeedingTimerScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [foodType, setFoodType] = useState<FoodType>('liquid');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [todayFeeds, setTodayFeeds] = useState<TrackingEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRaw = await safeGetItem(PROFILE_KEY);
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          if (profile.birthDate) {
            setBirthDate(profile.birthDate);
          }
        }
      } catch { /* silent */ }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadTodayFeeds = async () => {
      try {
        const raw = await safeGetItem(TRACKING_KEY);
        if (raw) {
          const allEntries: TrackingEntry[] = JSON.parse(raw);
          setTodayFeeds(getTodayEntries(allEntries));
        }
      } catch { /* silent */ }
    };
    loadTodayFeeds();
    // Refresh every 30 seconds to keep history current
    const interval = setInterval(loadTodayFeeds, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStartPause = () => {
    setIsRunning((r) => !r);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const handleQuickAdd = async (amount: string) => {
    const newEntry: TrackingEntry = {
      type: 'feed',
      timestamp: new Date().toISOString(),
      amount,
      note: foodType === 'liquid' ? 'liquid' : 'solid',
    };

    try {
      const raw = await safeGetItem(TRACKING_KEY);
      const allEntries: TrackingEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [newEntry, ...allEntries];
      await safeSetItem(TRACKING_KEY, JSON.stringify(updated));
      setTodayFeeds(getTodayEntries(updated));
    } catch { /* silent */ }
  };

  const formatElapsed = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const ageGroup = birthDate ? calculateAgeGroup(birthDate) : '6-12';
  const presets = PORTION_PRESETS[foodType][ageGroup];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1 },
    content: { padding: 20 },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    backText: { fontSize: 16, color: C.accent, marginLeft: 4 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 4 },
    ageDisplay: { fontSize: 16, color: C.muted },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 8,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    toggleButtonActive: { backgroundColor: C.accent },
    toggleText: { fontSize: 14, fontWeight: '600', color: C.muted },
    toggleTextActive: { color: '#fff' },
    presetRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    presetButton: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    presetText: { fontSize: 16, fontWeight: '700', color: C.text },
    presetLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
    timerCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    timerText: { fontSize: 48, fontWeight: '300', color: C.text, fontVariant: ['tabular-nums'] },
    timerButtons: { flexDirection: 'row', gap: 16, marginTop: 16 },
    timerBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    timerBtnPrimary: { backgroundColor: C.accent, borderColor: C.accent },
    historyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    historyItemLast: { borderBottomWidth: 0 },
    historyIcon: { fontSize: 24, marginRight: 12 },
    historyInfo: { flex: 1 },
    historyAmount: { fontSize: 16, fontWeight: '600', color: C.text },
    historyTime: { fontSize: 12, color: C.muted, marginTop: 2 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Link href="/(tabs)/tracking" style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.accent} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Link>

        <View style={styles.header}>
          <Text style={styles.title}>{t('feedingTimer.title')}</Text>
          {birthDate && (
            <Text style={styles.ageDisplay}>
              {t('feedingTimer.babyAge', { age: calculateAgeDisplay(birthDate) })}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('feedingTimer.foodType')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, foodType === 'liquid' && styles.toggleButtonActive]}
            onPress={() => setFoodType('liquid')}
            accessibilityLabel={t('feedingTimer.liquid')}
          >
            <Text style={[styles.toggleText, foodType === 'liquid' && styles.toggleTextActive]}>
              {t('feedingTimer.liquid')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, foodType === 'solid' && styles.toggleButtonActive]}
            onPress={() => setFoodType('solid')}
            accessibilityLabel={t('feedingTimer.solid')}
          >
            <Text style={[styles.toggleText, foodType === 'solid' && styles.toggleTextActive]}>
              {t('feedingTimer.solid')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('feedingTimer.quickAdd')}</Text>
        <View style={styles.presetRow}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={styles.presetButton}
              onPress={() => handleQuickAdd(preset)}
              accessibilityLabel={t('feedingTimer.quickAddPreset', { amount: preset })}
            >
              <Text style={styles.presetText}>{preset}</Text>
              <Text style={styles.presetLabel}>
                {t('feedingTimer.presetLabel', { range: t(`feedingTimer.ageRange.${ageGroup}`) })}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('feedingTimer.timer')}</Text>
        <View style={styles.timerCard}>
          <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
          <View style={styles.timerButtons}>
            <TouchableOpacity
              style={[styles.timerBtn, isRunning && styles.timerBtnPrimary]}
              onPress={handleStartPause}
              accessibilityLabel={isRunning ? t('feedingTimer.pauseTimer') : t('feedingTimer.startTimer')}
            >
              <MaterialCommunityIcons
                name={isRunning ? 'pause' : 'play'}
                size={28}
                color={isRunning ? '#fff' : C.text}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerBtn} onPress={handleReset} accessibilityLabel={t('feedingTimer.reset')}>
              <MaterialCommunityIcons name="refresh" size={28} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('feedingTimer.todayFeeds')}</Text>
        <View style={styles.historyCard}>
          {todayFeeds.length === 0 ? (
            <Text style={styles.emptyText}>{t('feedingTimer.noFeedsToday')}</Text>
          ) : (
            todayFeeds.map((feed, index) => (
              <View
                key={feed.timestamp}
                style={[
                  styles.historyItem,
                  index === todayFeeds.length - 1 && styles.historyItemLast,
                ]}
              >
                <Text style={styles.historyIcon}>🍼</Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyAmount}>{feed.amount}</Text>
                  <Text style={styles.historyTime}>{formatTime(feed.timestamp)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}