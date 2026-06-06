import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { TrackingEntry } from '../utils/weeklySummary';
import EmergencySOSScreen from '../components/EmergencySOSScreen';

type BabyProfile = {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
};

interface QuickEntry {
  id: string;
  label: string;
  icon: string;
  color: string;
  lastTime?: string;
}

const QUICK_ENTRIES: QuickEntry[] = [
  { id: 'diaper', label: 'Diaper', icon: '🧷', color: '#A8D5BA' },
  { id: 'feed', label: 'Feed', icon: '🍼', color: '#F5B7B1' },
  { id: 'sleep', label: 'Sleep', icon: '🌙', color: '#AED6F1' },
];

// i18n key map for quick entry labels
const QUICK_ENTRY_I18N_KEYS: Record<string, string> = {
  diaper: 'home.diaper',
  feed: 'home.feed',
  sleep: 'home.sleep',
};

interface TimelineEvent {
  id: string;
  type: string;
  icon: string;
  time: string;
  note?: string;
}

const ICON_MAP: Record<string, string> = {
  diaper: '🧷',
  feed: '🍼',
  sleep: '🌙',
};

export default function HomeScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [lastEvents, setLastEvents] = useState({ diaper: '--:--', feed: '--:--', sleep: '--:--' });
  const [showSOS, setShowSOS] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fabPressed, setFabPressed] = useState(false);
  const [showStressBanner, setShowStressBanner] = useState(false);
  const [stressLevel, setStressLevel] = useState<'yellow' | 'red'>('yellow');
  const router = useRouter();

  const handleSOSLongPress = () => {
    setShowSOS(true);
  };

  const handleFabPressIn = () => {
    setFabPressed(true);
    longPressTimer.current = setTimeout(() => {
      setShowSOS(true);
      setFabPressed(false);
    }, 800);
  };

  const handleFabPressOut = () => {
    setFabPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('@jobble_baby_profile');
        if (stored) {
          setBabyProfile(JSON.parse(stored));
        }
      } catch {
        // ignore parse errors
      }
    };
    const loadTracking = async () => {
      try {
        const raw = await AsyncStorage.getItem('@jobble/tracking_entries');
        if (!raw) return;
        const entries: TrackingEntry[] = JSON.parse(raw);
        const today = new Date().toISOString().split('T')[0];
        // Today's timeline events
        const todayEvents = entries
          .filter((e) => e.date === today)
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((e) => ({
            id: e.id,
            type: e.type,
            icon: ICON_MAP[e.type] || '📝',
            time: e.time,
            note: e.note,
          }));
        if (todayEvents.length > 0) {
          setTimelineEvents(todayEvents);
        }
        // Latest entry per type
        const latest = { diaper: '--:--', feed: '--:--', sleep: '--:--' };
        for (const e of entries) {
          if (latest[e.type as keyof typeof latest] === '--:--' || e.time > latest[e.type as keyof typeof latest]) {
            latest[e.type as keyof typeof latest] = e.time;
          }
        }
        setLastEvents(latest);
      } catch {
        // ignore parse errors
      }
    };
    loadProfile();
    loadTracking();
  }, []);

  useEffect(() => {
    const loadStressData = async () => {
      try {
        const [logRaw, nightsRaw] = await Promise.all([
          AsyncStorage.getItem('@jobble/stress_log'),
          AsyncStorage.getItem('@jobble/sleep_training_nights'),
        ]);
        const log = logRaw ? JSON.parse(logRaw) : [];
        const nights = nightsRaw ? JSON.parse(nightsRaw) : [];

        const sortedNights = [...nights].sort((a: any, b: any) => b.date.localeCompare(a.date));
        let consecutiveLowSleep = 0;
        for (const night of sortedNights) {
          if (night.hoursSlept < 5) {
            consecutiveLowSleep++;
          } else {
            break;
          }
        }

        const hasRegression = nights.some((n: any) => n.wasRegression);
        const hasOverwhelmed = log.some((e: any) => e.type === 'overwhelmed');

        if (consecutiveLowSleep >= 5 && hasOverwhelmed) {
          setStressLevel('red');
          setShowStressBanner(true);
        } else if (consecutiveLowSleep >= 3 && hasRegression) {
          setStressLevel('yellow');
          setShowStressBanner(true);
        }
      } catch {}
    };
    loadStressData();
  }, []);

  const babyName = babyProfile?.name ? `${babyProfile.name}'s` : "Baby's";

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    babyName: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    date: { fontSize: 14, color: C.muted, marginTop: 4 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    summaryCard: {
      flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
    },
    cardIcon: { fontSize: 28, marginBottom: 8 },
    cardLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
    cardTime: { fontSize: 12, color: '#555' },
    reminderCard: {
      backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: C.border,
    },
    reminderLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    reminderContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    reminderIcon: { fontSize: 32 },
    reminderTitle: { fontSize: 18, fontWeight: '600', color: C.text },
    reminderTime: { fontSize: 14, color: C.muted },
    projectionCard: {
      backgroundColor: C.accent + '18',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.accent + '44',
    },
    projectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    projectionLabel: { fontSize: 12, color: C.muted, flex: 1 },
    projectionValue: { fontSize: 14, fontWeight: '600', color: C.text },
    timelineSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
    timelineScroll: { flexDirection: 'row' },
    timelineItem: { alignItems: 'center', marginRight: 16, width: 64 },
    timelineIconBg: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: C.card,
      alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    timelineIcon: { fontSize: 20 },
    timelineTime: { fontSize: 12, color: C.muted },
    timelineNote: { fontSize: 10, color: C.muted, marginTop: 2, maxWidth: 60, textAlign: 'center' },
    fabArea: { marginTop: 8 },
    fabLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    fabRow: { flexDirection: 'row', gap: 12 },
    fab: {
      flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
    },
    fabIcon: { fontSize: 24, marginBottom: 6 },
    fabText: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
    sosButton: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#e74c3c',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 100,
    },
    sosButtonActive: {
      backgroundColor: '#c0392b',
      transform: [{ scale: 0.95 }],
    },
    sosIcon: { fontSize: 28 },
    sosLabel: { fontSize: 10, color: '#fff', fontWeight: '700', marginTop: 2 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('home.greetingMorning')}</Text>
          <Text style={styles.babyName}>{t('home.title')}</Text>
          <Text style={styles.date}>Friday, May 29, 2026</Text>
        </View>

        
        {showStressBanner && (
          <TouchableOpacity
            accessibilityLabel="Open stress cascade screen"
            style={{
              backgroundColor: stressLevel === 'red' ? '#EF4444' : '#F59E0B',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => router.replace('/stress-cascade')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 20 }}>💜</Text>
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {stressLevel === 'red' ? t('stressCascade.cascadeRed') : t('stressCascade.cascadeYellow')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          {QUICK_ENTRIES.map((entry) => (
            <View key={entry.id} style={[styles.summaryCard, { backgroundColor: entry.color }]}>
              <Text style={styles.cardIcon}>{entry.icon}</Text>
              <Text style={styles.cardLabel}>{t(QUICK_ENTRY_I18N_KEYS[entry.id])}</Text>
              <Text style={styles.cardTime}>{lastEvents[entry.id as keyof typeof lastEvents] || '--:--'}</Text>
            </View>
          ))}
        </View>

        {/* Next Reminder */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderLabel}>{t('home.nextReminder')}</Text>
          <View style={styles.reminderContent}>
            <Text style={styles.reminderIcon}>🍼</Text>
            <View>
              <Text style={styles.reminderTitle}>{t('home.feedingReminder')}</Text>
              <Text style={styles.reminderTime}>{t('home.nextFeedIn')}</Text>
            </View>
          </View>
        </View>

        {/* Next 30 Days Projection Widget */}
        <TouchableOpacity
          accessibilityLabel="View 30-day projection"
          style={styles.projectionCard}
          activeOpacity={0.7}
          onPress={() => router.push('/projection')}
        >
          <View style={styles.projectionRow}>
            <Text style={{ fontSize: 16 }}>🔮</Text>
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8, flex: 1 }]}>
              {t('projection.next30days')}
            </Text>
            <Text style={{ fontSize: 12, color: C.accent }}>{t('projection.tapForDetails')} →</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>🌙 Sleep regression</Text>
            <Text style={styles.projectionValue}>4mo / 8mo / 12mo peaks</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>🦷 Teething forecast</Text>
            <Text style={styles.projectionValue}>Next 3 teeth expected</Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>📈 Growth velocity</Text>
            <Text style={styles.projectionValue}>WHO percentile track</Text>
          </View>
        </TouchableOpacity>

        {/* Daily Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>{t('home.todayTimeline')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
            {timelineEvents.map((event) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineIconBg}>
                  <Text style={styles.timelineIcon}>{event.icon}</Text>
                </View>
                <Text style={styles.timelineTime}>{event.time}</Text>
                {event.note && (
                  <Text style={styles.timelineNote} numberOfLines={1}>{event.note}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Add FAB area */}
        <View style={styles.fabArea}>
          <Text style={styles.fabLabel}>{t('home.quickAdd')}</Text>
          <View style={styles.fabRow}>
            {QUICK_ENTRIES.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                accessibilityLabel={`Add ${entry.id} entry`}
                style={[styles.fab, { backgroundColor: entry.color }]}
                activeOpacity={0.7}
              >
                <Text style={styles.fabIcon}>{entry.icon}</Text>
                <Text style={styles.fabText}>{t(QUICK_ENTRY_I18N_KEYS[entry.id])}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Open SOS emergency screen"
        style={[styles.sosButton, fabPressed && styles.sosButtonActive]}
        onPressIn={handleFabPressIn}
        onPressOut={handleFabPressOut}
        onLongPress={handleSOSLongPress}
        delayLongPress={200}
      >
        <Text style={styles.sosIcon}>🆘</Text>
        <Text style={styles.sosLabel}>SOS</Text>
      </Pressable>

      <Modal
        visible={showSOS}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <EmergencySOSScreen />
      </Modal>
    </SafeAreaView>
  );
}
