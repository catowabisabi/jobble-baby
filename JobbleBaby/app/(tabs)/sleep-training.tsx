import { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

const SESSION_KEY = '@jobble/sleep_training_session';
const NIGHTS_KEY = '@jobble/sleep_training_nights';
const PROFILE_KEY = '@jobble_baby_profile';

const AMBER = '#F59E0B';
const RED_LIGHT = '#7F1D1D';

type SleepMethod = 'ferber' | 'extinction' | 'chair' | 'fading';

interface MethodCard {
  id: SleepMethod;
  name: string;
  description: string;
  ageNote: string;
  timeline: string;
  icon: string;
}

interface CheckIn {
  timestamp: string;
  interval: number;
}

interface NightLog {
  id: string;
  date: string;
  method: SleepMethod;
  startTime: string;
  endTime: string;
  totalCioMinutes: number;
  checkIns: CheckIn[];
  wakings: number;
  hoursSlept: number;
  longestStretch: number;
  interventions: number;
  success: boolean;
}

interface SessionData {
  method: SleepMethod | null;
  isActive: boolean;
  startTime: string | null;
  currentInterval: number;
  checkIns: CheckIn[];
  totalCioSeconds: number;
  intervalIndex: number;
  isPaused: boolean;
  pausedAt: string | null;
  cioStartTime: string | null;
  redLightMode: boolean;
  currentNight: number;
  chairDay: number;
  fadingDay: number;
}

const METHODS: MethodCard[] = [
  {
    id: 'ferber',
    name: 'Graduated Ferber',
    description: 'Check at increasing intervals (3, 5, 10 min). Comfort without picking up.',
    ageNote: '4+ months',
    timeline: '3-7 days',
    icon: 'timer-outline',
  },
  {
    id: 'extinction',
    name: 'Extinction / CIO',
    description: 'No check-ins until morning. Let baby self-soothe.',
    ageNote: '6+ months',
    timeline: '3-5 days',
    icon: 'moon-outline',
  },
  {
    id: 'chair',
    name: 'Chair Method',
    description: 'Sit beside crib, gradually move further each night.',
    ageNote: '4+ months',
    timeline: '7-14 days',
    icon: 'accessibility-outline',
  },
  {
    id: 'fading',
    name: 'Fading',
    description: 'Gradually move feed/sleep association from contact to crib over 2 weeks.',
    ageNote: '4+ months',
    timeline: '14 days',
    icon: 'trending-down-outline',
  },
];

const FERBER_INTERVALS = [3, 5, 10];

const CHAIR_POSITIONS = [
  'Next to crib',
  ' beside crib',
  'Midway to door',
  'Near the door',
  'Outside room',
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function SleepTrainingScreen() {
  const [babyProfile, setBabyProfile] = useState<{ birthDate?: string; name?: string } | null>(null);
  const [session, setSession] = useState<SessionData>({
    method: null,
    isActive: false,
    startTime: null,
    currentInterval: 3,
    checkIns: [],
    totalCioSeconds: 0,
    intervalIndex: 0,
    isPaused: false,
    pausedAt: null,
    cioStartTime: null,
    redLightMode: false,
    currentNight: 1,
    chairDay: 1,
    fadingDay: 1,
  });
  const [nightLogs, setNightLogs] = useState<NightLog[]>([]);
  const [currentScreen, setCurrentScreen] = useState<'method' | 'active' | 'log' | 'report'>('method');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [totalCioSeconds, setTotalCioSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRaw, sessionRaw, nightsRaw] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(NIGHTS_KEY),
        ]);
        if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
        if (sessionRaw) {
          const saved = JSON.parse(sessionRaw);
          setSession(saved);
          if (saved.isActive && saved.method) {
            setCurrentScreen('active');
            if (saved.cioStartTime && !saved.isPaused) {
              const elapsed = Math.floor((Date.now() - new Date(saved.cioStartTime).getTime()) / 1000);
              setTotalCioSeconds(saved.totalCioSeconds + elapsed);
            }
          }
        }
        if (nightsRaw) setNightLogs(JSON.parse(nightsRaw));
      } catch (e) {
        // Silent fail
      }
    };
    loadData();
  }, []);

  // Save session whenever it changes
  useEffect(() => {
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {});
  }, [session]);

  // Timer tick for Ferber/CIO
  useEffect(() => {
    if (session.isActive && session.method && !session.isPaused) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [session.isActive, session.isPaused, session.method]);

  // CIO tracking timer
  useEffect(() => {
    if (session.isActive && session.method === 'extinction' && !session.isPaused) {
      cioTimerRef.current = setInterval(() => {
        setTotalCioSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        if (cioTimerRef.current) clearInterval(cioTimerRef.current);
      };
    }
  }, [session.isActive, session.isPaused, session.method]);

  const babyAge = babyProfile?.birthDate ? calculateAgeInMonths(babyProfile.birthDate) : 0;
  const canStartTraining = babyAge >= 4;

  const selectMethod = (method: SleepMethod) => {
    setSession((prev) => ({ ...prev, method, currentNight: 1, chairDay: 1, fadingDay: 1 }));
    setCurrentScreen('active');
  };

  const startNight = () => {
    const now = new Date();
    setSession((prev) => ({
      ...prev,
      isActive: true,
      startTime: formatTime(now),
      currentInterval: prev.method === 'ferber' ? FERBER_INTERVALS[0] : 0,
      checkIns: [],
      totalCioSeconds: 0,
      intervalIndex: 0,
      isPaused: false,
      pausedAt: null,
      cioStartTime: prev.method === 'extinction' ? now.toISOString() : null,
    }));
    setTimerSeconds(0);
    setTotalCioSeconds(0);
  };

  const logCheckIn = () => {
    const now = new Date();
    const newCheckIn: CheckIn = {
      timestamp: formatTime(now),
      interval: session.currentInterval,
    };
    setSession((prev) => {
      const updated = { ...prev, checkIns: [...prev.checkIns, newCheckIn] };
      if (prev.method === 'ferber') {
        const nextIdx = Math.min(prev.intervalIndex + 1, FERBER_INTERVALS.length - 1);
        updated.currentInterval = FERBER_INTERVALS[nextIdx];
        updated.intervalIndex = nextIdx;
      }
      return updated;
    });
    setTimerSeconds(0);
  };

  const pauseNight = () => {
    setSession((prev) => ({ ...prev, isPaused: true, pausedAt: new Date().toISOString() }));
  };

  const resumeNight = () => {
    const now = new Date();
    setSession((prev) => ({
      ...prev,
      isPaused: false,
      pausedAt: null,
      cioStartTime: prev.method === 'extinction' ? now.toISOString() : null,
    }));
  };

  const endNight = async (success: boolean = false) => {
    const now = new Date();
    const endTime = formatTime(now);
    const totalCio = session.method === 'extinction' ? totalCioSeconds : session.checkIns.length * session.currentInterval * 60;

    const nightLog: NightLog = {
      id: Date.now().toString(),
      date: getDateStr(),
      method: session.method!,
      startTime: session.startTime || endTime,
      endTime,
      totalCioMinutes: Math.round(totalCio / 60),
      checkIns: session.checkIns,
      wakings: session.checkIns.length,
      hoursSlept: Math.max(0, 8 - Math.round(totalCio / 3600)),
      longestStretch: Math.max(30, 480 - totalCio),
      interventions: session.checkIns.length,
      success,
    };

    const updatedLogs = [nightLog, ...nightLogs].slice(0, 30);
    setNightLogs(updatedLogs);
    await AsyncStorage.setItem(NIGHTS_KEY, JSON.stringify(updatedLogs));

    // Award badges
    if (success) {
      await awardBadge('first_night_survived');
      const has7Days = updatedLogs.filter((l) => l.success).length >= 7;
      if (has7Days) await awardBadge('7day_streak');
      if (nightLog.longestStretch >= 360) await awardBadge('through_the_night');
    }

    setSession((prev) => ({
      ...prev,
      isActive: false,
      startTime: null,
      currentInterval: 3,
      checkIns: [],
      totalCioSeconds: 0,
      intervalIndex: 0,
      isPaused: false,
      pausedAt: null,
      cioStartTime: null,
      currentNight: prev.currentNight + 1,
      chairDay: Math.min(prev.chairDay + 1, 5),
      fadingDay: Math.min(prev.fadingDay + 1, 14),
    }));
    setTimerSeconds(0);
    setTotalCioSeconds(0);
    setCurrentScreen('log');
  };

  const toggleRedLight = () => {
    setSession((prev) => ({ ...prev, redLightMode: !prev.redLightMode }));
  };

  const getTonightsGoal = (): string => {
    if (!session.method) return '';
    switch (session.method) {
      case 'ferber':
        return `Put down awake · Wait ${session.currentInterval} min before first check`;
      case 'extinction':
        return 'Put down awake · No check-ins until morning';
      case 'chair':
        return `Sit ${CHAIR_POSITIONS[session.chairDay - 1] || 'next to crib'} · Do not pick up`;
      case 'fading':
        return `Day ${session.fadingDay}/14 · Feed in crib, hold for sleep then place drowsy`;
      default:
        return '';
    }
  };

  const getProgressRingValue = (): number => {
    const logs7 = nightLogs.filter((l) => l.date >= getLast7Days()[0]).length;
    return Math.min(logs7 / 7, 1);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: session.redLightMode ? RED_LIGHT : C.background },
    container: { flex: 1, backgroundColor: session.redLightMode ? RED_LIGHT : C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: session.redLightMode ? '#FCA5A5' : C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: session.redLightMode ? '#FEE2E2' : C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: session.redLightMode ? '#FCA5A5' : C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: session.redLightMode ? '#FCA5A5' : C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    methodGrid: { gap: 12 },
    methodCard: {
      backgroundColor: session.redLightMode ? '#991B1B' : C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: session.redLightMode ? '#B91C1C' : C.border,
      marginBottom: 12,
      minHeight: 44,
      minWidth: 44,
    },
    methodCardSelected: {
      borderColor: AMBER,
      borderWidth: 2,
    },
    methodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    methodIcon: { fontSize: 24, marginRight: 12 },
    methodName: { fontSize: 18, fontWeight: '700', color: session.redLightMode ? '#FEE2E2' : C.text, flex: 1 },
    methodAge: { fontSize: 12, color: AMBER, fontWeight: '600' },
    methodDesc: { fontSize: 14, color: session.redLightMode ? '#FCA5A5' : C.muted, marginBottom: 8, lineHeight: 20 },
    methodFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    methodTimeline: { fontSize: 12, color: session.redLightMode ? '#FCA5A5' : C.muted },
    startButton: {
      backgroundColor: AMBER,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginTop: 16,
      minHeight: 48,
      minWidth: 44,
    },
    startButtonDisabled: { backgroundColor: session.redLightMode ? '#7F1D1D' : C.muted, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16, minHeight: 48, minWidth: 44 },
    startButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    ageWarning: {
      backgroundColor: session.redLightMode ? '#7F1D1D' : '#FEF3C7',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: session.redLightMode ? '#B91C1C' : '#F59E0B',
    },
    ageWarningText: { fontSize: 14, color: session.redLightMode ? '#FEE2E2' : '#92400E', textAlign: 'center' },
    // Active screen
    activeHeader: { alignItems: 'center', marginBottom: 24 },
    goalCard: {
      backgroundColor: session.redLightMode ? '#991B1B' : C.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: session.redLightMode ? '#B91C1C' : C.border,
      width: '100%',
    },
    goalLabel: { fontSize: 12, color: session.redLightMode ? '#FCA5A5' : C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
    goalText: { fontSize: 18, fontWeight: '700', color: session.redLightMode ? '#FEE2E2' : C.text, textAlign: 'center', lineHeight: 26 },
    timerCard: {
      backgroundColor: session.redLightMode ? '#991B1B' : C.card,
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: session.redLightMode ? '#B91C1C' : C.border,
      alignItems: 'center',
      width: '100%',
    },
    timerLabel: { fontSize: 12, color: session.redLightMode ? '#FCA5A5' : C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    timerDisplay: { fontSize: 48, fontWeight: '700', color: AMBER, fontVariant: ['tabular-nums'] },
    timerSubtext: { fontSize: 14, color: session.redLightMode ? '#FCA5A5' : C.muted, marginTop: 4 },
    cioCard: {
      backgroundColor: session.redLightMode ? '#991B1B' : C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: session.redLightMode ? '#B91C1C' : C.border,
      width: '100%',
    },
    cioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cioLabel: { fontSize: 14, color: session.redLightMode ? '#FCA5A5' : C.muted },
    cioValue: { fontSize: 24, fontWeight: '700', color: session.redLightMode ? '#FEE2E2' : C.text },
    cioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    cioRowLabel: { fontSize: 13, color: session.redLightMode ? '#FCA5A5' : C.muted },
    cioRowValue: { fontSize: 13, color: session.redLightMode ? '#FEE2E2' : C.text, fontWeight: '600' },
    checkInButton: {
      backgroundColor: AMBER,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
      minHeight: 48,
      minWidth: 44,
    },
    checkInButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    pauseButton: { flex: 1, backgroundColor: session.redLightMode ? '#7F1D1D' : C.card, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: session.redLightMode ? '#B91C1C' : C.border, minHeight: 48, minWidth: 44 },
    pauseButtonText: { fontSize: 14, fontWeight: '600', color: session.redLightMode ? '#FEE2E2' : C.text },
    endButton: { flex: 1, backgroundColor: '#22C55E', borderRadius: 16, padding: 16, alignItems: 'center', minHeight: 48, minWidth: 44 },
    endButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    redLightToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: session.redLightMode ? '#991B1B' : C.card, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: session.redLightMode ? '#B91C1C' : C.border },
    redLightLabel: { fontSize: 14, color: session.redLightMode ? '#FEE2E2' : C.text, fontWeight: '500' },
    checkInsList: { width: '100%', marginBottom: 16 },
    checkInRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: session.redLightMode ? '#991B1B' : C.card, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: session.redLightMode ? '#B91C1C' : C.border },
    checkInIcon: { fontSize: 16, marginRight: 10 },
    checkInText: { fontSize: 14, color: session.redLightMode ? '#FEE2E2' : C.text, flex: 1 },
    checkInTime: { fontSize: 12, color: session.redLightMode ? '#FCA5A5' : C.muted },
    // Log screen
    logCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    logDate: { fontSize: 16, fontWeight: '700', color: C.text },
    logMethod: { fontSize: 12, color: AMBER, fontWeight: '600' },
    logStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    logStat: { backgroundColor: C.background, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
    logStatText: { fontSize: 12, color: C.muted },
    logStatValue: { fontSize: 14, fontWeight: '700', color: C.text },
    successBadge: { backgroundColor: '#22C55E', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
    successBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 40 },
    // Report screen
    reportCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    reportTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    trendArrow: { fontSize: 20 },
    barChart: { marginBottom: 16 },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    barLabel: { fontSize: 12, color: C.muted, width: 50 },
    barBg: { flex: 1, backgroundColor: C.border, borderRadius: 4, height: 16, overflow: 'hidden' },
    barFill: { backgroundColor: AMBER, borderRadius: 4, height: 16 },
    barValue: { fontSize: 12, color: C.text, width: 40, textAlign: 'right' },
    encouragementCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: AMBER,
      marginBottom: 16,
    },
    encouragementText: { fontSize: 16, color: C.text, textAlign: 'center', lineHeight: 24 },
    progressRingContainer: { alignItems: 'center', marginBottom: 16 },
    progressRingBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center' },
    progressRingFill: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: AMBER, borderTopColor: 'transparent', transform: [{ rotate: '-45deg' }] },
    progressRingText: { fontSize: 18, fontWeight: '700', color: C.text },
    // Tab bar
    tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border, minHeight: 44, minWidth: 44 },
    tabButtonActive: { backgroundColor: AMBER, borderColor: AMBER },
    tabButtonText: { fontSize: 12, fontWeight: '600', color: C.muted },
    tabButtonTextActive: { color: '#fff' },
    navRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    navButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, minHeight: 44, minWidth: 44 },
    navButtonText: { fontSize: 14, fontWeight: '600', color: C.text },
  });

  const renderMethodSelector = () => (
    <View>
      <Text style={styles.greeting}>{t('sleepTraining.greeting') || 'Sleep Training'}</Text>
      <Text style={styles.title}>{t('sleepTraining.title') || 'Sleep Training'}</Text>
      <Text style={styles.subtitle}>{t('sleepTraining.subtitle') || 'Choose a method to begin'}</Text>

      {!canStartTraining && babyProfile?.birthDate && (
        <View style={styles.ageWarning}>
          <Text style={styles.ageWarningText}>
            {t('sleepTraining.tooYoung', { age: Math.round(babyAge * 10) / 10 })}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('sleepTraining.methods') || 'Methods'}</Text>
      <View style={styles.methodGrid}>
        {METHODS.map((method) => (
          <TouchableOpacity
                          accessibilityLabel={`Select ${method.name} sleep training method`}
            key={method.id}
            style={[styles.methodCard, session.method === method.id && styles.methodCardSelected]}
            activeOpacity={0.7}
            onPress={() => selectMethod(method.id)}
          >
            <View style={styles.methodHeader}>
              <Ionicons name={method.icon as any} size={24} color={AMBER} style={styles.methodIcon} />
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodAge}>{method.ageNote}</Text>
            </View>
            <Text style={styles.methodDesc}>{method.description}</Text>
            <View style={styles.methodFooter}>
              <Text style={styles.methodTimeline}>⏱ {method.timeline}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {session.method && (
        <TouchableOpacity
                        accessibilityLabel="Start tonight's sleep training session"
          style={canStartTraining ? styles.startButton : styles.startButtonDisabled}
          activeOpacity={0.7}
          onPress={startNight}
          disabled={!canStartTraining}
        >
          <Text style={styles.startButtonText}>
            {t('sleepTraining.startNight') || '🌙 Start Tonight\'s Session'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActiveScreen = () => {
    const method = session.method!;
    const isExtinction = method === 'extinction';
    const isChair = method === 'chair';
    const isFading = method === 'fading';
    const isFerber = method === 'ferber';

    return (
      <View>
        <View style={styles.activeHeader}>
          <Text style={styles.greeting}>{t('sleepTraining.nightCount', { n: session.currentNight }) || `Night ${session.currentNight}`}</Text>
          <Text style={styles.title}>{METHODS.find((m) => m.id === method)?.name}</Text>
        </View>

        {/* Red light toggle */}
        <View style={styles.redLightToggle}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="moon" size={20} color={session.redLightMode ? '#FEE2E2' : C.text} style={{ marginRight: 8 }} />
            <Text style={styles.redLightLabel}>{t('sleepTraining.redLight') || 'Red Light Mode'}</Text>
          </View>
          <Switch
            value={session.redLightMode}
            onValueChange={toggleRedLight}
            trackColor={{ false: C.border, true: AMBER }}
            thumbColor={session.redLightMode ? '#FEE2E2' : '#fff'}
          />
        </View>

        {/* Tonight's goal */}
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>{t('sleepTraining.tonightsGoal') || 'Tonight\'s Goal'}</Text>
          <Text style={styles.goalText}>{getTonightsGoal()}</Text>
        </View>

        {/* Timer */}
        {(isFerber || isChair) && (
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>{t('sleepTraining.nextCheck') || 'Next Check-In'}</Text>
            <Text style={styles.timerDisplay}>{formatDuration(timerSeconds)}</Text>
            <Text style={styles.timerSubtext}>
              {isFerber ? `${session.currentInterval} min interval` : 'Chair position'}
            </Text>
          </View>
        )}

        {/* CIO Card for Extinction */}
        {isExtinction && (
          <View style={styles.cioCard}>
            <View style={styles.cioHeader}>
              <Text style={styles.cioLabel}>{t('sleepTraining.totalCio') || 'Total Crying'}</Text>
              <Text style={styles.cioValue}>{formatDuration(totalCioSeconds)}</Text>
            </View>
            <View style={styles.cioRow}>
              <Text style={styles.cioRowLabel}>{t('sleepTraining.startedAt') || 'Started'}</Text>
              <Text style={styles.cioRowValue}>{session.startTime || '--:--'}</Text>
            </View>
            <View style={styles.cioRow}>
              <Text style={styles.cioRowLabel}>{t('sleepTraining.checkIns') || 'Check-ins'}</Text>
              <Text style={styles.cioRowValue}>{session.checkIns.length}</Text>
            </View>
          </View>
        )}

        {/* Chair progress */}
        {isChair && (
          <View style={styles.cioCard}>
            <View style={styles.cioHeader}>
              <Text style={styles.cioLabel}>{t('sleepTraining.chairDay') || 'Chair Position'}</Text>
              <Text style={styles.cioValue}>{CHAIR_POSITIONS[session.chairDay - 1] || 'Next to crib'}</Text>
            </View>
            <View style={styles.cioRow}>
              <Text style={styles.cioRowLabel}>{t('sleepTraining.dayProgress') || 'Day'}</Text>
              <Text style={styles.cioRowValue}>{session.chairDay}/5</Text>
            </View>
          </View>
        )}

        {/* Fading progress */}
        {isFading && (
          <View style={styles.cioCard}>
            <View style={styles.cioHeader}>
              <Text style={styles.cioLabel}>{t('sleepTraining.fadingDay') || 'Fading Progress'}</Text>
              <Text style={styles.cioValue}>{t('sleepTraining.dayOf', { current: session.fadingDay })}</Text>
            </View>
            <View style={styles.cioRow}>
              <Text style={styles.cioRowLabel}>{t('sleepTraining.association') || 'Feed/sleep'}</Text>
              <Text style={styles.cioRowValue}>{session.fadingDay <= 7 ? 'Contact → Crib' : 'Fully in crib'}</Text>
            </View>
          </View>
        )}

        {/* Check-ins list */}
        {session.checkIns.length > 0 && (
          <View style={styles.checkInsList}>
            <Text style={styles.sectionTitle}>{t('sleepTraining.checkIns') || 'Check-Ins'}</Text>
            {session.checkIns.map((check, idx) => (
              <View key={idx} style={styles.checkInRow}>
                <Ionicons name="checkmark-circle" size={16} color={AMBER} style={styles.checkInIcon} />
                <Text style={styles.checkInText}>{t('sleepTraining.checkInNumber', { n: idx + 1 })}</Text>
                <Text style={styles.checkInTime}>{check.timestamp}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {(isFerber || isChair) && (
            <TouchableOpacity style={styles.checkInButton} activeOpacity={0.7} onPress={logCheckIn} accessibilityLabel="Log check-in for Ferber or chair method">
              <Text style={styles.checkInButtonText}>✓ {t('sleepTraining.logCheck') || 'Log Check'}</Text>
            </TouchableOpacity>
          )}
          {isExtinction && (
            <TouchableOpacity style={styles.checkInButton} activeOpacity={0.7} onPress={logCheckIn} accessibilityLabel="Log check-in for extinction method">
              <Text style={styles.checkInButtonText}>✓ {t('sleepTraining.logCheck') || 'Log Check'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.pauseButton} activeOpacity={0.7} onPress={session.isPaused ? resumeNight : pauseNight} accessibilityLabel={session.isPaused ? "Resume sleep training session" : "Pause sleep training session"}>
            <Text style={styles.pauseButtonText}>{session.isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endButton} activeOpacity={0.7} onPress={() => endNight(true)} accessibilityLabel="End tonight's sleep training session with success">
            <Text style={styles.endButtonText}>{t('sleepTraining.endNight') || '✓ End Night (Success)'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.navButton, { marginTop: 12 }]} activeOpacity={0.7} onPress={() => setCurrentScreen('method')} accessibilityLabel="Go back to sleep training methods">
          <Text style={styles.navButtonText}>{t('common.back') || 'Back to Methods'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLogScreen = () => {
    const last7 = getLast7Days();
    const recentLogs = nightLogs.filter((l) => last7.includes(l.date));

    return (
      <View>
        <Text style={styles.greeting}>{t('sleepTraining.nightLog') || 'Night Log'}</Text>
        <Text style={styles.title}>{t('sleepTraining.recentNights') || 'Recent Nights'}</Text>

        {nightLogs.length === 0 ? (
          <Text style={styles.emptyText}>{t('sleepTraining.noLogs') || 'No nights logged yet. Start a session to track progress.'}</Text>
        ) : (
          <ScrollView style={{ maxHeight: 500 }}>
            {nightLogs.slice(0, 14).map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={styles.logMethod}>{METHODS.find((m) => m.id === log.method)?.name}</Text>
                    {log.success && <View style={styles.successBadge}><Text style={styles.successBadgeText}>✓ Success</Text></View>}
                  </View>
                </View>
                <View style={styles.logStats}>
                  <View style={styles.logStat}>
                    <Text style={styles.logStatText}>💤 {t('sleepTraining.hoursSlept') || 'Hours'}</Text>
                    <Text style={styles.logStatValue}>{log.hoursSlept}h</Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.logStatText}>🔔 {t('sleepTraining.wakings') || 'Wakings'}</Text>
                    <Text style={styles.logStatValue}>{log.wakings}</Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.logStatText}>⏱ {t('sleepTraining.longest') || 'Longest'}</Text>
                    <Text style={styles.logStatValue}>{Math.round(log.longestStretch / 60)}h</Text>
                  </View>
                  <View style={styles.logStat}>
                    <Text style={styles.logStatText}>✋ {t('sleepTraining.interventions') || 'Interventions'}</Text>
                    <Text style={styles.logStatValue}>{log.interventions}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7} onPress={() => setCurrentScreen('method')} accessibilityLabel="Start a new sleep training session">
            <Text style={styles.navButtonText}>{t('sleepTraining.newSession') || '+ New Session'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7} onPress={() => setCurrentScreen('report')} accessibilityLabel="View weekly sleep training report">
            <Text style={styles.navButtonText}>{t('sleepTraining.weeklyReport') || '📊 Weekly Report'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderReportScreen = () => {
    const last7 = getLast7Days();
    const recentLogs = nightLogs.filter((l) => last7.includes(l.date));
    const avgHours = recentLogs.length > 0 ? recentLogs.reduce((sum, l) => sum + l.hoursSlept, 0) / recentLogs.length : 0;
    const avgWakings = recentLogs.length > 0 ? recentLogs.reduce((sum, l) => sum + l.wakings, 0) / recentLogs.length : 0;
    const successRate = recentLogs.length > 0 ? recentLogs.filter((l) => l.success).length / recentLogs.length : 0;
    const prevWeekLogs = nightLogs.filter((l) => {
      const d = new Date(l.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 14);
      return d >= weekAgo && d < new Date(last7[0]);
    });
    const prevAvgHours = prevWeekLogs.length > 0 ? prevWeekLogs.reduce((sum, l) => sum + l.hoursSlept, 0) / prevWeekLogs.length : 0;
    const hoursTrend = avgHours >= prevAvgHours ? '↑' : '↓';
    const wakingsTrend = avgWakings <= (prevWeekLogs.length > 0 ? prevWeekLogs.reduce((sum, l) => sum + l.wakings, 0) / prevWeekLogs.length : avgWakings) ? '↓' : '↑';

    const maxHours = 12;
    const progressValue = getProgressRingValue();

    const encouragement = () => {
      if (recentLogs.length === 0) return t('sleepTraining.encouragementStart') || 'Every journey starts with a single night. You\'ve got this! 🌟';
      if (successRate >= 0.8) return t('sleepTraining.encouragementGreat') || 'Amazing progress! 80%+ success rate. Baby is learning great sleep habits! 🎉';
      if (avgHours >= 6) return t('sleepTraining.encouragementGood') || 'Good progress! Baby is getting more consolidated sleep. Keep going! 💪';
      return t('sleepTraining.encouragementHang') || 'Hang in there — sleep training is hard but worth it. Consistency is key! 💜';
    };

    return (
      <View>
        <Text style={styles.greeting}>{t('sleepTraining.weeklyReport') || 'Weekly Report'}</Text>
        <Text style={styles.title}>{t('sleepTraining.last7Days') || 'Last 7 Days'}</Text>

        {/* Progress ring */}
        <View style={styles.progressRingContainer}>
          <View style={styles.progressRingBg}>
            <Text style={styles.progressRingText}>{Math.round(progressValue * 100)}%</Text>
          </View>
          <Text style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{t('sleepTraining.successProb') || 'Success probability'}</Text>
        </View>

        {/* ASCII bar chart */}
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{t('sleepTraining.hoursSlept') || 'Hours Slept'}</Text>
            <Text style={styles.trendArrow}>{hoursTrend}</Text>
          </View>
          <View style={styles.barChart}>
            {last7.map((day) => {
              const log = recentLogs.find((l) => l.date === day);
              const hours = log?.hoursSlept || 0;
              const barWidth = (hours / maxHours) * 100;
              const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <View key={day} style={styles.barRow}>
                  <Text style={styles.barLabel}>{dayLabel}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.barValue}>{hours}h</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stats summary */}
        <View style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>{t('sleepTraining.averages') || 'Averages'}</Text>
          </View>
          <View style={styles.logStats}>
            <View style={styles.logStat}>
              <Text style={styles.logStatText}>💤 Avg Hours</Text>
              <Text style={styles.logStatValue}>{avgHours.toFixed(1)}h {hoursTrend}</Text>
            </View>
            <View style={styles.logStat}>
              <Text style={styles.logStatText}>🔔 Avg Wakings</Text>
              <Text style={styles.logStatValue}>{avgWakings.toFixed(1)} {wakingsTrend}</Text>
            </View>
            <View style={styles.logStat}>
              <Text style={styles.logStatText}>✅ Success Rate</Text>
              <Text style={styles.logStatValue}>{Math.round(successRate * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementCard}>
          <Text style={styles.encouragementText}>{encouragement()}</Text>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7} onPress={() => setCurrentScreen('log')} accessibilityLabel="Go back to night log">
            <Text style={styles.navButtonText}>{t('sleepTraining.backToLog') || '← Back to Log'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.7} onPress={() => setCurrentScreen('method')} accessibilityLabel="Start a new sleep training session">
            <Text style={styles.navButtonText}>{t('sleepTraining.newSession') || '+ New Session'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['method', 'active', 'log', 'report'] as const).map((tab) => (
            <TouchableOpacity
                            accessibilityLabel={`Go to ${tab === 'method' ? 'methods' : tab === 'active' ? 'active session' : tab === 'log' ? 'night log' : 'weekly report'} tab`}
              key={tab}
              style={[styles.tabButton, currentScreen === tab && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => setCurrentScreen(tab)}
            >
              <Text style={[styles.tabButtonText, currentScreen === tab && styles.tabButtonTextActive]}>
                {tab === 'method' ? '📋' : tab === 'active' ? '🌙' : tab === 'log' ? '📓' : '📊'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentScreen === 'method' && renderMethodSelector()}
        {currentScreen === 'active' && session.method && renderActiveScreen()}
        {currentScreen === 'log' && renderLogScreen()}
        {currentScreen === 'report' && renderReportScreen()}
      </ScrollView>
    </SafeAreaView>
  );
}
